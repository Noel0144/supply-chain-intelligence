/**
 * Risk & Cost Engine
 * All values deterministic — no randomness
 */
const { HUBS } = require('./hubs');

// ── GEOPOLITICAL RISK ZONES (fixed) ──────────────────────────────────────────
const RISK_ZONES = [
  { id: 'hormuz',   name: 'Strait of Hormuz',    lat: 26.59, lng: 56.25,  radius: 300, riskType: 'geopolitical', riskScore: 85, label: 'High Geopolitical Tension' },
  { id: 'red_sea',  name: 'Red Sea / Houthi',    lat: 14.00, lng: 43.00,  radius: 500, riskType: 'conflict',     riskScore: 90, label: 'Active Conflict Zone' },
  { id: 'ukraine',  name: 'Ukraine Conflict',    lat: 49.00, lng: 32.00,  radius: 400, riskType: 'conflict',     riskScore: 95, label: 'War Zone' },
  { id: 'taiwan',   name: 'Taiwan Strait',       lat: 24.50, lng: 120.00, radius: 200, riskType: 'geopolitical', riskScore: 70, label: 'Geopolitical Hotspot' },
  { id: 'somalia',  name: 'Somali Coast',        lat: 5.00,  lng: 48.00,  radius: 350, riskType: 'piracy',       riskScore: 75, label: 'Piracy Risk' },
  { id: 'sahel',    name: 'Sahel Region',        lat: 15.00, lng: 0.00,   radius: 600, riskType: 'instability',  riskScore: 65, label: 'Political Instability' },
  { id: 'earthquake_japan', name: 'Japan Seismic Zone', lat: 36.0, lng: 138.0, radius: 250, riskType: 'natural', riskScore: 55, label: 'Seismic Activity' },
  { id: 'typhoon',  name: 'Western Pacific Typhoon Belt', lat: 22.0, lng: 130.0, radius: 400, riskType: 'weather', riskScore: 60, label: 'Typhoon Risk' },
  { id: 'wenchaun', name: 'Bay of Bengal Cyclone Zone', lat: 15.0, lng: 90.0, radius: 300, riskType: 'weather', riskScore: 55, label: 'Cyclone Zone' },
  { id: 'panabeer', name: 'Panama Canal Congestion', lat: 9.08, lng: -79.68, radius: 100, riskType: 'operational', riskScore: 50, label: 'Port Congestion' },
];

// Distance between two lat/lng points (km) using Haversine
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate risk for a path (array of {lat,lng} waypoints)
 * Returns 0-100 composite risk score + breakdown
 */
function calculatePathRisk(waypoints, itemType, fragility, disruptions = []) {
  const fragilityMod = { low: 0.8, medium: 1.0, high: 1.3 }[fragility?.toLowerCase()] || 1.0;

  // Cargo risk
  const cargoRisk = {
    electronics: 25, perishable: 35, hazardous: 45, pharmaceuticals: 30,
    machinery: 20, textiles: 10, automotive: 20, chemicals: 40,
    food: 25, furniture: 15, general: 15,
  }[itemType?.toLowerCase()] || 15;

  // Zone exposure: how many zone-intersections across the path
  let zoneExposure = 0;
  const allRiskZones = [...RISK_ZONES, ...disruptions];
  const hitZones = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const midLat = (waypoints[i].lat + waypoints[i + 1].lat) / 2;
    const midLng = (waypoints[i].lng + waypoints[i + 1].lng) / 2;

    for (const zone of allRiskZones) {
      const d = distanceKm(midLat, midLng, zone.lat, zone.lng);
      if (d < zone.radius) {
        const exposure = (1 - d / zone.radius) * zone.riskScore;
        zoneExposure = Math.max(zoneExposure, exposure);
        if (!hitZones.find(z => z.id === zone.id)) hitZones.push(zone);
      }
    }
  }

  // Total path length for operational risk
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalKm += distanceKm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
  }
  const operationalRisk = Math.min(30, totalKm / 500); // 1 pt per 500km, max 30

  // Composite
  const composite = Math.min(100, Math.round(
    (cargoRisk * fragilityMod * 0.3) + (zoneExposure * 0.5) + (operationalRisk * 0.2)
  ));

  return {
    composite,
    breakdown: {
      cargoRisk: Math.round(cargoRisk * fragilityMod),
      zoneExposure: Math.round(zoneExposure),
      operationalRisk: Math.round(operationalRisk),
    },
    hitZones,
    failureProbability: (composite / 100 * 0.15).toFixed(3), // max ~15%
  };
}

// ── COST ENGINE ───────────────────────────────────────────────────────────────
const TRANSPORT_COST_PER_KM = {
  air:  4.20,  // $/km/tonne
  sea:  0.05,  // $/km/tonne
  road: 0.25,  // $/km/tonne
  rail: 0.12,  // $/km/tonne
};

const HANDLING_BY_ITEM = {
  electronics: 180, perishable: 220, hazardous: 350, pharmaceuticals: 300,
  machinery: 200, textiles: 80, automotive: 180, chemicals: 300,
  food: 150, furniture: 100, general: 90,
};

const CUSTOMS_BY_REGION = {
  north_america: 0.03, europe: 0.025, east_asia: 0.04, south_asia: 0.06,
  southeast_asia: 0.035, middle_east: 0.04, africa: 0.07, south_america: 0.08,
  oceania: 0.03, eurasia: 0.05, central_asia: 0.06,
};

const INFLATION_FACTOR = 1.12; // 12% logistics inflation

function calculateSegmentCost(segment, weight, itemType) {
  // segment: { mode, distanceKm, originHub, destHub }
  const weightTonnes = Math.max(weight / 1000, 0.01);
  const ratePerKm = TRANSPORT_COST_PER_KM[segment.mode] || 0.25;

  const freightCost = ratePerKm * segment.distanceKm * weightTonnes;
  const fuelCost    = ratePerKm * 0.3 * segment.distanceKm; // 30% of freight for fuel
  const handlingCost = (HANDLING_BY_ITEM[itemType?.toLowerCase()] || 90);

  return {
    freight: Math.round(freightCost),
    fuel:    Math.round(fuelCost),
    handling: handlingCost,
    total:   Math.round((freightCost + fuelCost + handlingCost)),
  };
}

function calculateRouteCost(segments, weight, itemType, destRegion = 'europe') {
  let freight = 0, fuel = 0, handling = 0;
  for (const seg of segments) {
    const sc = calculateSegmentCost(seg, weight, itemType);
    freight  += sc.freight;
    fuel     += sc.fuel;
    handling += sc.handling;
  }

  const subtotal = freight + fuel + handling;
  const customs     = Math.round(subtotal * (CUSTOMS_BY_REGION[destRegion] || 0.04));
  const warehousing = Math.round(subtotal * 0.05);
  const insurance   = Math.round(subtotal * 0.015);
  const total       = Math.round((subtotal + customs + warehousing + insurance) * INFLATION_FACTOR);

  return {
    freight,
    fuel,
    handling,
    customs,
    warehousing,
    insurance,
    inflationFactor: INFLATION_FACTOR,
    subtotal,
    total,
  };
}

module.exports = {
  calculatePathRisk,
  calculateRouteCost,
  calculateSegmentCost,
  distanceKm,
  RISK_ZONES,
  TRANSPORT_COST_PER_KM,
};
