/**
 * Route Optimization Engine
 * Generates 4 deterministic route variants: fastest, cheapest, lowest_risk, balanced
 */

const { HUBS, CITY_TO_HUB, SEA_LANES } = require('./hubs');
const { calculateRouteCost, calculatePathRisk, distanceKm } = require('./riskCostEngine');

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

  const points = [{ lat: o.lat, lng: o.lng }];
  
  const oRegion = o.region;
  const dRegion = d.region;

  // Check if Suez is blocked
  const suezLat = 30.5, suezLng = 32.3;
  let avoidSuez = false;
  if (disruptions && disruptions.length > 0) {
    avoidSuez = disruptions.some(dis => distanceKm(dis.lat, dis.lng, suezLat, suezLng) < dis.radius || 
                                        distanceKm(dis.lat, dis.lng, 12.6, 43.3) < dis.radius); // Also check Bab al-Mandeb
  }

  // Europe/Americas <-> East Asia / SE Asia
  const isWest = oRegion === 'europe' || oRegion === 'north_america' || o.lng < -20;
  const isAsia = dRegion === 'east_asia' || dRegion === 'southeast_asia' || dRegion === 'south_asia';
  const isMidEast = dRegion === 'middle_east';

  // WEST <-> ASIA OR MIDDLE EAST
  if (isWest && (isAsia || isMidEast)) {
    if (avoidSuez) {
      if (o.lng < -30) points.push({ lat: 35.0, lng: -40.0 }); // Atlantic Mid
      points.push({ lat: 10.0, lng: -25.0 }); // Mid Atlantic
      points.push({ lat: -35.0, lng: 20.0 }); // Cape of Good Hope (Detour)
      points.push({ lat: -20.0, lng: 55.0 }); // Indian Ocean
      if (isMidEast) {
        points.push({ lat: 26.5, lng: 56.4 }); // Strait of Hormuz
      } else {
        points.push({ lat: 6.0,  lng: 78.0 });   // South India
        points.push({ lat: 1.3,  lng: 103.8 });  // Malacca / Singapore
      }
    } else {
      if (o.lng < -30) points.push({ lat: 35.0, lng: -40.0 }); // Atlantic Mid
      points.push({ lat: 36.0, lng: -5.3 });   // Gibraltar
      points.push({ lat: 37.0, lng: 12.0 });   // Mediterranean Mid
      points.push({ lat: 30.5, lng: 32.3 });   // Suez Canal
      points.push({ lat: 12.6, lng: 43.3 });   // Bab al-Mandeb (Red Sea exit)

      if (isMidEast) {
        points.push({ lat: 26.5, lng: 56.4 }); // Strait of Hormuz
      } else {
        points.push({ lat: 6.0,  lng: 78.0 });   // South India
        points.push({ lat: 1.3,  lng: 103.8 });  // Malacca / Singapore
      }
    }
  } 
  // ASIA/MIDEAST <-> WEST
  else if ((oRegion === 'east_asia' || oRegion === 'southeast_asia' || oRegion === 'middle_east') && isWest) {
    if (avoidSuez) {
      if (oRegion === 'middle_east') {
         points.push({ lat: 26.5, lng: 56.4 }); // Exit Persian Gulf
      } else {
         points.push({ lat: 1.3,  lng: 103.8 });
         points.push({ lat: 6.0,  lng: 78.0 });
      }
      points.push({ lat: -20.0, lng: 55.0 }); // Indian Ocean
      points.push({ lat: -35.0, lng: 20.0 }); // Cape of Good Hope (Detour)
      points.push({ lat: 10.0, lng: -25.0 }); // Mid Atlantic
      if (d.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
    } else {
      if (oRegion === 'middle_east') {
         points.push({ lat: 26.5, lng: 56.4 }); // Exit Persian Gulf
      } else {
         points.push({ lat: 1.3,  lng: 103.8 });
         points.push({ lat: 6.0,  lng: 78.0 });
      }
      points.push({ lat: 12.6, lng: 43.3 }); // Enter Red Sea
      points.push({ lat: 30.5, lng: 32.3 }); // Suez
      points.push({ lat: 37.0, lng: 12.0 }); // Med
      points.push({ lat: 36.0, lng: -5.3 }); // Gibraltar
      if (d.lng < -30) points.push({ lat: 35.0, lng: -40.0 });
    }
  }
  // Trans-Pacific
  else if (o.lng < -100 && (dRegion === 'east_asia' || dRegion === 'southeast_asia')) {
    points.push({ lat: 35.0, lng: -160.0 });
    points.push({ lat: 30.0, lng: 170.0 });
  }
  else if ((oRegion === 'east_asia' || oRegion === 'southeast_asia') && d.lng < -100) {
    points.push({ lat: 30.0, lng: 170.0 });
    points.push({ lat: 35.0, lng: -160.0 });
  }
  // Panama
  else if (o.lat > 15 && d.lat < -10 && o.lng < -60) {
    points.push({ lat: 9.3, lng: -79.9 });
  }

  points.push({ lat: d.lat, lng: d.lng });
  return points;
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
    return segments.map(seg => {
      let points = [];
      if (seg.mode === 'air') points = getFlightWaypoints(seg.origin, seg.dest);
      else if (seg.mode === 'sea') points = getSeaWaypoints(seg.origin, seg.dest, disruptions);
      else points = [ { lat: seg.originLat, lng: seg.originLng }, { lat: seg.destLat, lng: seg.destLng } ];
      return { ...seg, points };
    });
  };

  // 1: FASTEST (Air)
  const airSeg = buildSegment(originAir.hubId, destAir.hubId, 'air');
  const r1Segments = [airSeg];
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
    risk: calculatePathRisk(r1Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: ['air'],
    recommended: priorityMode === 'time',
  };

  // 2: CHEAPEST (Multi-mode Sea + Road)
  const roadIn  = buildSegment(originAir.hubId, originSea.hubId, 'road');
  const seaSeg  = buildSegment(originSea.hubId, destSea.hubId, 'sea');
  const roadOut = buildSegment(destSea.hubId, destAir.hubId, 'road');
  const r2Segments = [roadIn, seaSeg, roadOut].filter(Boolean);
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
    risk: calculatePathRisk(r2Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: [...new Set(r2Segments.map(s => s.mode))],
    recommended: priorityMode === 'cost',
  };

  // 3: LOWEST RISK (Air via Safe Hub)
  const safeHub = chooseSafeHub(originAir.hubId, destAir.hubId, disruptions);
  const r3Segments = [buildSegment(originAir.hubId, safeHub, 'air'), buildSegment(safeHub, destAir.hubId, 'air')].filter(Boolean);
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
    risk: calculatePathRisk(r3Display.flatMap(d => d.points), itemType, fragility, disruptions),
    modes: ['air'],
    recommended: priorityMode === 'risk',
  };

  // 4: BALANCED (Hybrid Sea-Air)
  const transHub = chooseTransHub(originAir.hubId, destSea.hubId);
  const r4Segments = [buildSegment(originAir.hubId, transHub, 'air'), buildSegment(transHub, destSea.hubId, 'sea'), buildSegment(destSea.hubId, destAir.hubId, 'road')].filter(Boolean);
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
