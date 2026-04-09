/**
 * Route Optimization Engine
 * Generates 4 deterministic route variants: fastest, cheapest, lowest_risk, balanced
 */

const { HUBS, CITY_TO_HUB, SEA_LANES, LAND_REGIONS, CANAL_ZONES } = require('./hubs');
const { calculateRouteCost, calculatePathRisk, calculateRouteCarbon, distanceKm } = require('./riskCostEngine');

// Speed (km/h) and cost biases per mode
const MODE_SPECS = {
  air:  { speedKmh: 850,  co2PerKm: 0.602, label: '✈ Air Freight' },
  sea:  { speedKmh: 35,   co2PerKm: 0.015, label: '🚢 Sea Freight' },
  road: { speedKmh: 65,   co2PerKm: 0.080, label: '🚛 Road Freight' },
  rail: { speedKmh: 80,   co2PerKm: 0.041, label: '🚆 Rail Freight' },
};

function resolveHub(cityName, type = 'airport') {
  const key = cityName?.toLowerCase()?.trim();
  const mapping = CITY_TO_HUB[key];
  if (mapping) {
    const hubId = mapping[type] || mapping.airport || mapping.seaport;
    if (hubId && HUBS[hubId]) return { hubId, hub: HUBS[hubId] };
  }
  // Fallback: scan for partial match
  for (const [city, m] of Object.entries(CITY_TO_HUB)) {
    if (key && city.includes(key)) {
      const hubId = m[type] || m.airport || m.seaport;
      if (hubId && HUBS[hubId]) return { hubId, hub: HUBS[hubId] };
    }
  }
  // Ultimate fallback by nearest hub
  return { hubId: 'JFK', hub: HUBS['JFK'] };
}

function buildSegment(originHubId, destHubId, mode) {
  const o = HUBS[originHubId];
  const d = HUBS[destHubId];
  if (!o || !d) return null;
  const dist = Math.round(distanceKm(o.lat, o.lng, d.lat, d.lng));
  const speedKmh = MODE_SPECS[mode].speedKmh;
  const hours = dist / speedKmh;
  return {
    origin: originHubId,
    originName: o.name,
    originLat: o.lat,
    originLng: o.lng,
    dest: destHubId,
    destName: d.name,
    destLat: d.lat,
    destLng: d.lng,
    mode,
    modeLabel: MODE_SPECS[mode].label,
    distanceKm: dist,
    durationHours: Math.round(hours * 10) / 10,
    co2Kg: Math.round(dist * MODE_SPECS[mode].co2PerKm),
  };
}

function getSeaWaypoints(originHubId, destHubId, disruptions = []) {
  const o = HUBS[originHubId];
  const d = HUBS[destHubId];
  if (!o || !d) return [];

  let points = [{ lat: o.lat, lng: o.lng }];
  
  const oRegion = o.region;
  const dRegion = d.region;

  // Check if Suez is blocked
  const suezLat = 30.5, suezLng = 32.3;
  let avoidSuez = false;
  if (disruptions && disruptions.length > 0) {
    avoidSuez = disruptions.some(dis => distanceKm(dis.lat, dis.lng, suezLat, suezLng) < dis.radius || 
                                        distanceKm(dis.lat, dis.lng, 12.6, 43.3) < dis.radius); // Also check Bab al-Mandeb
  }

  const isAmericasEast = (oRegion === 'north_america' || oRegion === 'south_america') && o.lng > -100;
  const isAmericasWest = (oRegion === 'north_america' || oRegion === 'south_america') && o.lng <= -100;
  const destAmericasWest = (dRegion === 'north_america' || dRegion === 'south_america') && d.lng <= -100;

  // Europe/Americas-East <-> East Asia / SE Asia
  const isWest = oRegion === 'europe' || isAmericasEast || (o.lng < -20 && o.lng > -100);
  const isAsia = dRegion === 'east_asia' || dRegion === 'southeast_asia' || dRegion === 'south_asia' || dRegion === 'oceania';
  const isMidEast = dRegion === 'middle_east';
  
  // Define key corridors in West -> East order (Americas -> Asia)
  const suezWaypoints = [
    { lat: 36.0, lng: -5.3 },   // Gibraltar
    { lat: 37.8, lng: 11.0 },   // Tunis
    { lat: 34.5, lng: 24.0 },   // Crete
    { lat: 31.5, lng: 32.2 },   // Port Said
    { lat: 30.5, lng: 32.3 },   // Suez
    { lat: 22.0, lng: 38.0 },   // Red Sea Mid
    { lat: 12.6, lng: 43.3 },   // Bab al-Mandeb
    { lat: 12.0, lng: 54.0 },   // Socotra
  ];

  const capeWaypoints = [
    { lat: 15.0, lng: -35.0 },  // Mid Atlantic
    { lat: -5.0,  lng: -20.0 }, // Equatorial Atlantic
    { lat: -25.0, lng: 0.0 },   // Deep South Atlantic
    { lat: -42.0, lng: 20.0 },  // Wide Cape Arc
    { lat: -30.0, lng: 45.0 },  // South Madagascar Sweep
    { lat: -15.0, lng: 60.0 },  // Indian Ocean
  ];

  const northEuropeWaypoints = [
    { lat: 49.5, lng: -3.0 },  // English Channel
    { lat: 42.0, lng: -10.5 }, // Bay of Biscay / Portugal Coast
  ];

  if (isWest && (isAsia || isMidEast)) {
    if (avoidSuez) {
      if (o.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
      else if (o.lat > 45) points.push(...northEuropeWaypoints);
      points.push(...capeWaypoints);
    } else {
      if (o.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
      else if (o.lat > 45) points.push(...northEuropeWaypoints);
      points.push(...suezWaypoints);
    }

    if (isMidEast) {
      points.push({ lat: 26.5, lng: 56.4 }); // Hormuz
    } else {
      if (dRegion === 'south_asia') points.push({ lat: 18.9, lng: 72.8 });
      else {
        points.push({ lat: 6.0, lng: 78.0 });
        if (dRegion !== 'south_asia') {
          points.push({ lat: 1.3, lng: 103.8 }); // Singapore
          if (dRegion === 'east_asia') points.push({ lat: 21.0, lng: 115.0 });
        }
      }
    }
  } 
  else if ((oRegion === 'east_asia' || oRegion === 'southeast_asia' || oRegion === 'middle_east') && isWest) {
    if (avoidSuez) {
      const reversedCape = [...capeWaypoints].reverse();
      points.push(...reversedCape);
      if (d.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
      else if (d.lat > 45) points.push(...[...northEuropeWaypoints].reverse());
    } else {
      const reversedSuez = [...suezWaypoints].reverse();
      points.push(...reversedSuez);
      if (d.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
      else if (d.lat > 45) points.push(...[...northEuropeWaypoints].reverse());
    }
  }
  // Trans-Pacific
  else if (isAmericasWest && isAsia) {
    points.push({ lat: 35.0, lng: -160.0 });
    points.push({ lat: 30.0, lng: 170.0 });
  }
  else if (isAsia && destAmericasWest) {
    points.push({ lat: 30.0, lng: 170.0 });
    points.push({ lat: 35.0, lng: -160.0 });
  }
  // Panama
  else if (o.lat > 15 && d.lat < -10 && o.lng < -60) {
    points.push({ lat: 9.3, lng: -79.9 });
  }

  points.push({ lat: d.lat, lng: d.lng });

  // Apply Smart Detours around arbitrary disruptions
  return applyDetours(points, disruptions);
}

/**
 * Geometric bypass for sea waypoints
 * If a segment between A and B intersects a disruption radius, 
 * inject a detour point.
 */
function applyDetours(points, disruptions) {
  if (!disruptions || disruptions.length === 0) return points;

  // 1. Densify path to provide resolution for curves
  let densified = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i];
    const B = points[i+1];
    const dist = distanceKm(A.lat, A.lng, B.lat, B.lng);
    const steps = Math.ceil(dist / 400);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      densified.push({
        lat: A.lat + (B.lat - A.lat) * t,
        lng: A.lng + (B.lng - A.lng) * t
      });
    }
  }

  let result = densified;
  for (const D of disruptions) {
    result = detourAroundZone(result, D);
  }

  return result;
}

/**
 * For a single disruption zone D, scan all segments of the path.
 * If ANY segment passes through the zone, replace the midpoint with
 * two bypass waypoints that arc cleanly around the outside of the radius.
 */
function detourAroundZone(points, D) {
  const radiusKm = D.radius || 300;
  const clearanceKm = radiusKm * 1.6;
  
  let firstAffected = -1;
  let lastAffected = -1;

  for (let i = 0; i < points.length; i++) {
    const d = distanceKm(points[i].lat, points[i].lng, D.lat, D.lng);
    if (d < clearanceKm) {
        if (firstAffected === -1) firstAffected = i;
        lastAffected = i;
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i], B = points[i+1];
    const dLat = B.lat - A.lat, dLng = B.lng - A.lng;
    const len2 = dLat * dLat + dLng * dLng;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((D.lat - A.lat) * dLat + (D.lng - A.lng) * dLng) / len2));
    const dist = distanceKm(A.lat + t * dLat, A.lng + t * dLng, D.lat, D.lng);
    if (dist < clearanceKm) {
        if (firstAffected === -1 || i < firstAffected) firstAffected = i;
        if (lastAffected === -1 || i + 1 > lastAffected) lastAffected = i + 1;
    }
  }

  if (firstAffected === -1) return points;

  const startIdx = Math.max(0, firstAffected - 1);
  const endIdx = Math.min(points.length - 1, lastAffected + 1);
  const startPt = points[startIdx];
  const endPt = points[endIdx];

  const dLat = endPt.lat - startPt.lat;
  const dLng = endPt.lng - startPt.lng;
  const midLat = (startPt.lat + endPt.lat) / 2;
  const midLng = (startPt.lng + endPt.lng) / 2;
  
  const perpLat = -dLng;
  const perpLng = dLat;
  const mag = Math.sqrt(perpLat * perpLat + perpLng * perpLng) || 1;
  const normPerpLat = perpLat / mag;
  const normPerpLng = perpLng / mag;

  const degLat = 1 / 111.12;
  const degLng = 1 / (111.12 * Math.cos(D.lat * Math.PI / 180));

  const peakFactor = clearanceKm * 1.5;
  const peak1 = { lat: D.lat + normPerpLat * peakFactor * degLat, lng: D.lng + normPerpLng * peakFactor * degLng };
  const peak2 = { lat: D.lat - normPerpLat * peakFactor * degLat, lng: D.lng - normPerpLng * peakFactor * degLng };
  
  const dist1 = distanceKm(peak1.lat, peak1.lng, midLat, midLng);
  const dist2 = distanceKm(peak2.lat, peak2.lng, midLat, midLng);
  const chosenPeak = dist1 < dist2 ? peak1 : peak2;

  const arc = [];
  const numArcPoints = 5;
  for (let i = 1; i <= numArcPoints; i++) {
    const t = i / (numArcPoints + 1);
    const lat = (1-t)**2 * startPt.lat + 2*(1-t)*t * chosenPeak.lat + t**2 * endPt.lat;
    const lng = (1-t)**2 * startPt.lng + 2*(1-t)*t * chosenPeak.lng + t**2 * endPt.lng;
    arc.push({ lat, lng });
  }

  return [
    ...points.slice(0, startIdx + 1),
    ...arc,
    ...points.slice(endIdx)
  ];
}

function buildDisplayPath(segments) {
  const display = [];
  for (const seg of segments) {
    if (seg.mode === 'air') {
      display.push({ mode: 'air', points: getFlightWaypoints(seg.origin, seg.dest) });
    } else if (seg.mode === 'sea') {
      display.push({ mode: 'sea', points: getSeaWaypoints(seg.origin, seg.dest) });
    } else {
      display.push({ mode: seg.mode, points: [{ lat: seg.originLat, lng: seg.originLng }, { lat: seg.destLat, lng: seg.destLng }] });
    }
  }
  return display;
}

function buildItinerary(segments, totalDays) {
  const itinerary = [];
  let dayOffset = 1;
  
  if (segments.length > 0) {
    itinerary.push({ day: dayOffset, event: `Departure from ${segments[0].originName}`, location: segments[0].originName });
  }

  for (const seg of segments) {
    dayOffset += Math.max(1, Math.floor(seg.durationHours / 24));
    const modeVerb = seg.mode === 'air' ? 'Flight' : seg.mode === 'sea' ? 'Vessel transit' : 'Road transit';
    itinerary.push({ day: dayOffset, event: `${modeVerb} to ${seg.destName}`, location: seg.destName });
    if (seg.mode !== 'road') {
      dayOffset += 1;
      itinerary.push({ day: dayOffset, event: "Customs clearance & hub handling", location: seg.destName });
    }
  }
  
  itinerary.push({ day: totalDays, event: "Final deployment & delivery", location: segments[segments.length-1].destName });
  return itinerary;
}

// Build flight arc waypoints (great circle curve)
function getFlightWaypoints(originHub, destHub, numPoints = 5) {
  const o = HUBS[originHub];
  const d = HUBS[destHub];
  if (!o || !d) return [];

  const points = [{ lat: o.lat, lng: o.lng }];
  
  // If points are essentially the same, don't build an arc
  if (Math.abs(o.lat - d.lat) < 0.01 && Math.abs(o.lng - d.lng) < 0.01) {
    return points;
  }

  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    // Great circle interpolation (simplified spherical arc)
    const lat = o.lat + (d.lat - o.lat) * t + Math.sin(Math.PI * t) * 8; // arc
    const lng = o.lng + (d.lng - o.lng) * t;
    points.push({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 });
  }
  points.push({ lat: d.lat, lng: d.lng });
  return points;
}

/**
 * Main function: generate 4 route variants
 */
function generateRoutes(input, disruptions = []) {
  const {
    origin, destination, itemType = 'general',
    weight = 1000, volume = 5, fragility = 'medium',
    priorityMode = 'balanced',
  } = input;

  const originAir  = resolveHub(origin, 'airport');
  const originSea  = resolveHub(origin, 'seaport');
  const destAir    = resolveHub(destination, 'airport');
  const destSea    = resolveHub(destination, 'seaport');

  const originCoord = { lat: HUBS[originAir.hubId].lat, lng: HUBS[originAir.hubId].lng };
  const destCoord   = { lat: HUBS[destAir.hubId].lat,   lng: HUBS[destAir.hubId].lng };
  const destRegion  = HUBS[destAir.hubId].region;

  // Helper to build display path with disruptions
  const buildDisplayPathWithDisruptions = (segments) => {
    return segments.flatMap(seg => {
      let points = [];
      if (seg.mode === 'air') points = getFlightWaypoints(seg.origin, seg.dest);
      else if (seg.mode === 'sea') points = getSeaWaypoints(seg.origin, seg.dest, disruptions);
      else points = [ { lat: seg.originLat, lng: seg.originLng }, { lat: seg.destLat, lng: seg.destLng } ];
      
      if (seg.mode !== 'sea' || points.length < 2) {
        return [{ ...seg, points }];
      }

      // High-Fidelity Splitting for Sea Routes
      const subSegments = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Calculate midpoint of THIS specific jump
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        
        const isOverLand = LAND_REGIONS.some(reg => 
          midLat > reg.minLat && midLat < reg.maxLat && 
          midLng > reg.minLng && midLng < reg.maxLng
        );

        let finalMode = 'sea';
        if (isOverLand) {
          // CHECK FOR CANAL EXCLUSION
          const inCanal = CANAL_ZONES.some(canal => 
            distanceKm(midLat, midLng, canal.lat, canal.lng) < canal.radius
          );

          if (!inCanal) {
            // Extra safety: ignore if near the very start/end of the WHOLE journey (ports)
            const nearStart = distanceKm(midLat, midLng, points[0].lat, points[0].lng) < 150;
            const nearEnd = distanceKm(midLat, midLng, points[points.length-1].lat, points[points.length-1].lng) < 150;
            if (!nearStart && !nearEnd) finalMode = 'road';
          }
        }

        subSegments.push({
          ...seg,
          mode: finalMode,
          points: [p1, p2]
        });
      }
      return subSegments;
    });
  };

  // 1: FASTEST (Air)
  const airSeg = buildSegment(originAir.hubId, destAir.hubId, 'air');
  const r1Segments = [airSeg].filter(s => s && s.origin !== s.dest);
  const r1Display = buildDisplayPathWithDisruptions(r1Segments);
  const r1TotalDays = Math.ceil((airSeg.durationHours + 12) / 24);
  const route1 = {
    id: 'fastest',
    name: 'Fastest Route (Direct Air)',
    icon: '⚡',
    description: 'Direct air corridor — prioritizing velocity',
    displaySegments: r1Display,
    itinerary: buildItinerary(r1Segments, r1TotalDays),
    totalDistanceKm: airSeg.distanceKm,
    totalTimeDays: r1TotalDays,
    cost: calculateRouteCost(r1Segments, weight, itemType, destRegion),
    totalCarbonKg: calculateRouteCarbon(r1Segments, weight),
    risk: calculatePathRisk(r1Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: ['air'],
    recommended: priorityMode === 'time',
  };

  // 2: CHEAPEST (Multi-mode Sea + Road)
  const roadIn  = buildSegment(originAir.hubId, originSea.hubId, 'road');
  const seaSeg  = buildSegment(originSea.hubId, destSea.hubId, 'sea');
  const roadOut = buildSegment(destSea.hubId, destAir.hubId, 'road');
  const r2Segments = [roadIn, seaSeg, roadOut].filter(s => s && s.origin !== s.dest);
  const r2Display = buildDisplayPathWithDisruptions(r2Segments);
  const r2TotalHours = r2Segments.reduce((s, seg) => s + seg.durationHours, 0) + 48;
  const r2TotalDays = Math.ceil(r2TotalHours / 24);
  const route2 = {
    id: 'cheapest',
    name: 'Cheapest Multi-mode',
    icon: '💰',
    description: 'Integrated sea freight — lowest logistical footprint',
    displaySegments: r2Display,
    itinerary: buildItinerary(r2Segments, r2TotalDays),
    totalDistanceKm: r2Segments.reduce((s, seg) => s + seg.distanceKm, 0),
    totalTimeDays: r2TotalDays,
    cost: calculateRouteCost(r2Segments, weight, itemType, destRegion),
    totalCarbonKg: calculateRouteCarbon(r2Segments, weight),
    risk: calculatePathRisk(r2Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: [...new Set(r2Segments.map(s => s.mode))],
    recommended: priorityMode === 'cost',
  };

  // 3: LOWEST RISK (Air via Safe Hub)
  const safeHub = chooseSafeHub(originAir.hubId, destAir.hubId, disruptions);
  const r3Segments = [
    buildSegment(originAir.hubId, safeHub, 'air'), 
    buildSegment(safeHub, destAir.hubId, 'air')
  ].filter(s => s && s.origin !== s.dest);
  const r3Display = buildDisplayPathWithDisruptions(r3Segments);
  const r3TotalHours = r3Segments.reduce((s, seg) => s + seg.durationHours, 0) + 24;
  const r3TotalDays = Math.ceil(r3TotalHours / 24);
  const route3 = {
    id: 'lowest_risk',
    name: 'Lowest Risk Corridor',
    icon: '🛡️',
    description: `Secure air relay via ${HUBS[safeHub]?.name || safeHub}`,
    displaySegments: r3Display,
    itinerary: buildItinerary(r3Segments, r3TotalDays),
    totalDistanceKm: r3Segments.reduce((s, seg) => s + seg.distanceKm, 0),
    totalTimeDays: r3TotalDays,
    cost: calculateRouteCost(r3Segments, weight, itemType, destRegion),
    totalCarbonKg: calculateRouteCarbon(r3Segments, weight),
    risk: calculatePathRisk(r3Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: ['air'],
    recommended: priorityMode === 'risk',
  };

  // 4: BALANCED (Hybrid Sea-Air)
  const transHub = chooseTransHub(originAir.hubId, destSea.hubId);
  const r4Segments = [
    buildSegment(originAir.hubId, transHub, 'air'), 
    buildSegment(transHub, destSea.hubId, 'sea'), 
    buildSegment(destSea.hubId, destAir.hubId, 'road')
  ].filter(s => s && s.origin !== s.dest);
  const r4Display = buildDisplayPathWithDisruptions(r4Segments);
  const r4TotalHours = r4Segments.reduce((s, seg) => s + seg.durationHours, 0) + 36;
  const r4TotalDays = Math.ceil(r4TotalHours / 24);
  const route4 = {
    id: 'balanced',
    name: 'Balanced Hybrid ⭐',
    icon: '⚖️',
    description: 'Optimal sea-air-road logistics mix',
    displaySegments: r4Display,
    itinerary: buildItinerary(r4Segments, r4TotalDays),
    totalDistanceKm: r4Segments.reduce((s, seg) => s + seg.distanceKm, 0),
    totalTimeDays: r4TotalDays,
    cost: calculateRouteCost(r4Segments, weight, itemType, destRegion),
    totalCarbonKg: calculateRouteCarbon(r4Segments, weight),
    risk: calculatePathRisk(r4Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: [...new Set(r4Segments.map(s => s.mode))],
    recommended: priorityMode === 'balanced',
  };

  return { routes: [route1, route2, route3, route4], originHub: originAir, destHub: destAir };
}

function chooseSafeHub(originHubId, destHubId, disruptions) {
  const o = HUBS[originHubId];
  const d = HUBS[destHubId];
  if (!o || !d) return 'SIN';
  const midLat = (o.lat + d.lat) / 2, midLng = (o.lng + d.lng) / 2;
  const safeHubs = ['SIN', 'FRA', 'AMS', 'ICN', 'SYD', 'NRT', 'LHR', 'CDG'];
  let best = 'SIN', bestScore = Infinity;
  for (const hubId of safeHubs) {
    const h = HUBS[hubId];
    if (!h) continue;
    const dist = distanceKm(midLat, midLng, h.lat, h.lng);
    if (dist < bestScore) { bestScore = dist; best = hubId; }
  }
  return best;
}

function chooseTransHub(originHubId, destHubId) {
  const o = HUBS[originHubId], d = HUBS[destHubId];
  if (!o || !d) return 'DXB';
  const hubs = ['DXB', 'SIN', 'HKG', 'AMS', 'FRA'];
  let best = 'DXB', bestDist = Infinity;
  for (const h of hubs) {
    const hub = HUBS[h];
    if (!hub) continue;
    const dist = distanceKm(o.lat, o.lng, hub.lat, hub.lng) + distanceKm(hub.lat, hub.lng, d.lat, d.lng);
    if (dist < bestDist) { bestDist = dist; best = h; }
  }
  return best;
}

module.exports = { generateRoutes, resolveHub, getFlightWaypoints, getSeaWaypoints, MODE_SPECS };
