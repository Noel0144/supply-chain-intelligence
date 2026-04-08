/**
 * Simulation Tracker
 * Manages active shipments in-memory, advances positions on tick, handles disruptions
 */
const { v4: uuidv4 } = require('uuid');
const { generateRoutes } = require('../engines/routeOptimizationEngine');
const { calculatePathRisk } = require('../engines/riskCostEngine');
const { HUBS } = require('../engines/hubs');
const intelligenceEngine = require('../engines/intelligenceEngine');

class SimulationTracker {
  constructor() {
    this.shipments = new Map();
    this.disruptions = [];
    this.tickInterval = null;
    this.tickCount = 0;
  }

  addShipment(input, selectedRouteId = 'balanced') {
    const result = generateRoutes(input, this.disruptions);
    const route = result.routes.find(r => r.id === selectedRouteId) || result.routes[3];

    // Synthesize a flat tracking path from segmented data
    const trackingPoints = [];
    if (route.displaySegments) {
      route.displaySegments.forEach(seg => {
        seg.points.forEach(p => trackingPoints.push({ ...p, mode: seg.mode }));
      });
    }

    const shipmentId = uuidv4();
    const shipment = {
      id: shipmentId,
      input,
      route,
      selectedRouteId,
      trackingPoints,
      currentSegmentIndex: 0,
      totalSegments: trackingPoints.length - 1,
      progress: 0, 
      currentLat: trackingPoints[0]?.lat || 0,
      currentLng: trackingPoints[0]?.lng || 0,
      currentSegmentMode: trackingPoints[0]?.mode || 'road',
      status: 'in_transit',
      startTime: Date.now(),
      eta: Date.now() + (route.totalTimeDays * 24 * 3600000),
      lastUpdate: Date.now(),
      cost: route.cost,
      risk: route.risk,
      rerouted: false,
      rerouteHistory: [],
    };

    this.shipments.set(shipmentId, shipment);
    return shipment;
  }

  getShipment(id) {
    return this.shipments.get(id) || null;
  }

  getAllShipments() {
    return Array.from(this.shipments.values());
  }

  tick() {
    this.tickCount++;
    const updated = [];

    for (const [id, shipment] of this.shipments) {
      if (shipment.status !== 'in_transit') continue;

      const tp = shipment.trackingPoints;
      if (!tp || tp.length < 2) continue;

      // Each tick advances position. Scale based on total path length.
      shipment.progress += 0.05;

      if (shipment.progress >= 1.0) {
        shipment.progress = 0;
        shipment.currentSegmentIndex++;

        if (shipment.currentSegmentIndex >= tp.length - 1) {
          shipment.status = 'delivered';
          const lastPoint = tp[tp.length - 1];
          shipment.currentLat = lastPoint.lat;
          shipment.currentLng = lastPoint.lng;
          shipment.lastUpdate = Date.now();
          updated.push(shipment);
          continue;
        }
      }

      // Interpolate position along current point-to-point segment
      const idx = shipment.currentSegmentIndex;
      const from = tp[idx];
      const to = tp[idx + 1];
      shipment.currentLat = from.lat + (to.lat - from.lat) * shipment.progress;
      shipment.currentLng = from.lng + (to.lng - from.lng) * shipment.progress;
      shipment.currentSegmentMode = from.mode;

      shipment.lastUpdate = Date.now();

      // Recalculate ETA dynamically on every tick
      const remainingPoints = tp.slice(shipment.currentSegmentIndex + 1);
      let remainingKm = distanceKm(shipment.currentLat, shipment.currentLng, tp[shipment.currentSegmentIndex + 1].lat, tp[shipment.currentSegmentIndex + 1].lng);
      
      for(let i=0; i < remainingPoints.length - 1; i++) {
        remainingKm += distanceKm(remainingPoints[i].lat, remainingPoints[i].lng, remainingPoints[i+1].lat, remainingPoints[i+1].lng);
      }

      // Use the speed ratio from the current route to estimate time remaining
      const speedRatio = (shipment.route.totalDistanceKm || 1) / (shipment.route.totalTimeDays || 1);
      const remainingTimeMs = (remainingKm / speedRatio) * 24 * 60 * 60 * 1000;
      
      shipment.eta = Date.now() + remainingTimeMs;

      // Update Impact Delta based on live ETA vs Base ETA
      if (shipment.baseEta) {
        shipment.impactDelta = {
          ...shipment.impactDelta,
          delayHours: Math.max(0, Math.round((shipment.eta - shipment.baseEta) / (1000 * 60 * 60)))
        };
      }

      updated.push(shipment);
    }

    // Process intelligence (Live Radar)
    const intel = intelligenceEngine.tick();
    if (intel.expiredIds.length > 0) {
      intel.expiredIds.forEach(id => this.removeDisruption(id));
    }
    if (intel.newDisruption) {
      this.addDisruption(intel.newDisruption);
    }

    return updated;
  }

  addDisruption(disruption) {
    const d = {
      id: disruption.id || uuidv4(),
      type: disruption.type,
      lat: disruption.lat,
      lng: disruption.lng,
      radius: disruption.radius || 500,
      riskScore: disruption.riskScore || 80,
      name: disruption.name || `${disruption.type} event`,
      timestamp: Date.now(),
    };

    this.disruptions.push(d);

    const affected = [];
    for (const [id, shipment] of this.shipments) {
      if (shipment.status !== 'in_transit') continue;
      if (this.isAffected(shipment, d)) {
        this.rerouteShipment(shipment, d);
        affected.push(shipment);
      }
    }

    return { disruption: d, affectedShipments: affected };
  }

  removeDisruption(id) {
    const index = this.disruptions.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    const removed = this.disruptions.splice(index, 1)[0];
    
    // Potentially "restore" shipments
    for (const [sId, shipment] of this.shipments) {
      if (shipment.status === 'in_transit' && shipment.rerouted) {
        // If they are no longer affected by ANY disruptions, attempt restore
        let stillAffected = false;
        for (const d of this.disruptions) {
          if (this.isAffected(shipment, d)) stillAffected = true;
        }

        if (!stillAffected) {
          this.restoreShipment(shipment);
        }
      }
    }

    return true;
  }

  restoreShipment(shipment) {
    // Attempt to navigate back to originally selected route configuration
    const originalRouteId = shipment.rerouteHistory.length > 0 ? shipment.rerouteHistory[0].oldRouteId : 'cheapest';
    
    // Call generateRoutes without the current disruptions to see the optimal paths
    const result = generateRoutes({ ...shipment.input, priorityMode: originalRouteId === 'cheapest' ? 'cost' : 'time' }, this.disruptions);
    let targetRoute = result.routes.find(r => r.id === originalRouteId);
    if (!targetRoute) targetRoute = result.routes[0];

    // Splice from current location to target route, identical to reroute detours
    const newTrackingPoints = [{ lat: shipment.currentLat, lng: shipment.currentLng, mode: shipment.currentSegmentMode }];
    if (targetRoute.displaySegments) {
      let minDistance = Infinity;
      let closestSegmentIdx = 0;
      let closestPointIdx = 0;

      targetRoute.displaySegments.forEach((seg, sIdx) => {
        if (seg.mode === shipment.currentSegmentMode) {
          seg.points.forEach((p, pIdx) => {
            const d = distanceKm(shipment.currentLat, shipment.currentLng, p.lat, p.lng);
            if (d < minDistance) {
              minDistance = d;
              closestSegmentIdx = sIdx;
              closestPointIdx = pIdx;
            }
          });
        }
      });

      for (let i = closestSegmentIdx; i < targetRoute.displaySegments.length; i++) {
        const seg = targetRoute.displaySegments[i];
        const startPointIdx = (i === closestSegmentIdx) ? closestPointIdx : 0;
        for (let j = startPointIdx; j < seg.points.length; j++) {
          newTrackingPoints.push({ ...seg.points[j], mode: seg.mode });
        }
      }
      
      if (newTrackingPoints.length === 1) {
        targetRoute.displaySegments.forEach(seg => {
          seg.points.forEach(p => newTrackingPoints.push({ ...p, mode: seg.mode }));
        });
      }
    }

    shipment.route = targetRoute;
    shipment.trackingPoints = newTrackingPoints;
    shipment.totalSegments = newTrackingPoints.length - 1;
    shipment.currentSegmentIndex = 0;
    shipment.progress = 0;
    shipment.rerouted = false; // Flag removed!
    
    // Recalculate ETA recovery
    const remainingKm = newTrackingPoints.reduce((acc, p, idx) => {
        if (idx === 0) return 0;
        return acc + distanceKm(newTrackingPoints[idx-1].lat, newTrackingPoints[idx-1].lng, p.lat, p.lng);
    }, 0);
    const speedRatio = targetRoute.totalDistanceKm / targetRoute.totalTimeDays; 
    const addedTimeMs = (remainingKm / speedRatio) * 24 * 60 * 60 * 1000;
    
    shipment.eta = Date.now() + addedTimeMs;
    // Costs are tricky. We maintain the sunk base cost delta but reduce future delta theoretically
    shipment.impactDelta = {
      cost: shipment.impactDelta ? shipment.impactDelta.cost * 0.5 : 0, // 50% recovery on resolution!
      delayHours: Math.max(0, Math.round((shipment.eta - shipment.baseEta) / (1000 * 60 * 60))) 
    };
  }

  isAffected(shipment, disruption) {
    const tp = shipment.trackingPoints;
    if (!tp) return false;

    for (let i = shipment.currentSegmentIndex; i < tp.length; i++) {
      const dist = distanceKm(tp[i].lat, tp[i].lng, disruption.lat, disruption.lng);
      if (dist < disruption.radius) return true;
    }
    return false;
  }

  rerouteShipment(shipment, disruption) {
    const oldCost = shipment.cost.total;
    const oldEta = shipment.eta;

    shipment.rerouteHistory.push({
      timestamp: Date.now(),
      reason: disruption.name,
      oldRouteId: shipment.selectedRouteId,
      oldCost: oldCost,
    });

    const result = generateRoutes(shipment.input, this.disruptions);
    const newRoute = result.routes.find(r => r.id === 'lowest_risk') || result.routes[0];

    // Build new tracking path
    const newTrackingPoints = [];
    
    // Instead of teleporting to the start of the new route, we detour from EXACT current location
    // We append the current location as the start of the new detour segment
    newTrackingPoints.push({ 
      lat: shipment.currentLat, 
      lng: shipment.currentLng, 
      mode: shipment.currentSegmentMode 
    });

    if (newRoute.displaySegments) {
      let foundInsertionPoint = false;
      let minDistance = Infinity;
      let closestSegmentIdx = 0;
      let closestPointIdx = 0;

      // Find the geographical point on the new route closest to where the ship actually is
      newRoute.displaySegments.forEach((seg, sIdx) => {
        if (seg.mode === shipment.currentSegmentMode) {
          seg.points.forEach((p, pIdx) => {
            const d = distanceKm(shipment.currentLat, shipment.currentLng, p.lat, p.lng);
            if (d < minDistance) {
              minDistance = d;
              closestSegmentIdx = sIdx;
              closestPointIdx = pIdx;
            }
          });
        }
      });

      // Splice the rest of the new route starting from the closest entry point
      for (let i = closestSegmentIdx; i < newRoute.displaySegments.length; i++) {
        const seg = newRoute.displaySegments[i];
        const startPointIdx = (i === closestSegmentIdx) ? closestPointIdx : 0;
        for (let j = startPointIdx; j < seg.points.length; j++) {
          newTrackingPoints.push({ ...seg.points[j], mode: seg.mode });
        }
      }
      
      // Failsafe: if modes mismatched entirely or couldn't find splice, just append the full new route
      if (newTrackingPoints.length === 1) {
        newRoute.displaySegments.forEach(seg => {
          seg.points.forEach(p => newTrackingPoints.push({ ...p, mode: seg.mode }));
        });
      }
    }

    shipment.route = newRoute;
    shipment.trackingPoints = newTrackingPoints;
    shipment.totalSegments = newTrackingPoints.length - 1;
    shipment.currentSegmentIndex = 0;
    shipment.progress = 0;
    shipment.cost = newRoute.cost;
    shipment.risk = newRoute.risk;
    shipment.rerouted = true;
    
    // Impact Tracking & Dynamic ETA adjustment
    if (!shipment.baseCost) shipment.baseCost = oldCost;
    if (!shipment.baseEta) shipment.baseEta = oldEta;
    
    // Recompute ETA directly:
    const remainingKm = newTrackingPoints.reduce((acc, p, idx) => {
        if (idx === 0) return 0;
        return acc + distanceKm(newTrackingPoints[idx-1].lat, newTrackingPoints[idx-1].lng, p.lat, p.lng);
    }, 0);
    // Rough simulation heuristic: 1000km ≈ 1 day average depending on mode, but let's use route totalTime ratio
    const speedRatio = newRoute.totalDistanceKm / newRoute.totalTimeDays; 
    const addedTimeMs = (remainingKm / speedRatio) * 24 * 60 * 60 * 1000;
    
    shipment.eta = Date.now() + addedTimeMs;

    shipment.impactDelta = {
      cost: shipment.cost.total - shipment.baseCost,
      delayHours: Math.max(0, Math.round((shipment.eta - shipment.baseEta) / (1000 * 60 * 60))) 
    };
  }

  getDisruptions() {
    return this.disruptions;
  }

  getSystemImpact() {
    const shipmentsArr = Array.from(this.shipments.values());
    const totalCostIncrease = shipmentsArr.reduce((sum, s) => sum + (s.impactDelta?.cost || 0), 0);
    const avgDelay = shipmentsArr.reduce((sum, s) => sum + (s.impactDelta?.delayHours || 0), 0) / (shipmentsArr.length || 1);
    
    return {
      totalCostIncrease,
      avgDelay: Math.round(avgDelay * 10) / 10
    };
  }

  clearAll() {
    this.shipments.clear();
    this.disruptions = [];
    this.tickCount = 0;
  }
}

// Distance helper
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const tracker = new SimulationTracker();
module.exports = tracker;
