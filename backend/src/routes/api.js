/**
 * API Routes
 */
const express = require('express');
const router = express.Router();
const { generateRoutes } = require('../engines/routeOptimizationEngine');
const { determineMode, selectCarrier } = require('../engines/modeEngine');
const { RISK_ZONES } = require('../engines/riskCostEngine');
const { HUBS, CITY_TO_HUB } = require('../engines/hubs');
const tracker = require('../simulation/simulationTracker');
const intelligenceEngine = require('../engines/intelligenceEngine');

// GET /api/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// GET /api/hubs — list all hubs
router.get('/hubs', (req, res) => {
  res.json({ hubs: HUBS, cities: Object.keys(CITY_TO_HUB) });
});

// GET /api/risk-zones — global risk zones
router.get('/risk-zones', (req, res) => {
  const disruptions = tracker.getDisruptions();
  res.json({ riskZones: RISK_ZONES, activeDisruptions: disruptions });
});

// POST /api/analyze — determine mode + carrier
router.post('/analyze', (req, res) => {
  try {
    const shipment = req.body;
    const modeResult = determineMode(shipment);
    const primaryMode = modeResult.mode === 'FCL' ? 'sea' : 'road';
    const carriers = selectCarrier(primaryMode, shipment.priorityMode || 'balanced');
    res.json({ mode: modeResult, carriers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/routes — generate 4 route options
router.post('/routes', (req, res) => {
  try {
    const disruptions = tracker.getDisruptions();
    const result = generateRoutes(req.body, disruptions);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/simulate/start — add shipment to simulation
router.post('/simulate/start', (req, res) => {
  try {
    const { input, selectedRouteId } = req.body;
    const shipment = tracker.addShipment(input, selectedRouteId);
    res.json({ shipment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/simulate/tick — advance simulation and get stats
router.get('/simulate/tick', (req, res) => {
  const updated = tracker.tick();
  res.json({ 
    shipments: tracker.getAllShipments(), 
    tickCount: tracker.tickCount,
    systemImpact: tracker.getSystemImpact()
  });
});

// GET /api/simulate/shipments — get all active shipments
router.get('/simulate/shipments', (req, res) => {
  res.json({ 
    shipments: tracker.getAllShipments(),
    systemImpact: tracker.getSystemImpact()
  });
});

// GET /api/simulate/radar — get intelligence feed and radar threats
router.get('/simulate/radar', (req, res) => {
  res.json({
    newsFeed: intelligenceEngine.getNewsFeed(),
    activeDisruptions: tracker.getDisruptions(),
  });
});

// POST /api/simulate/disruption — add a disruption event
router.post('/simulate/disruption', (req, res) => {
  try {
    const result = tracker.addDisruption(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/simulate/disruption/:id — remove a disruption event
router.delete('/simulate/disruption/:id', (req, res) => {
  const success = tracker.removeDisruption(req.params.id);
  if (success) {
    res.json({ status: 'removed' });
  } else {
    res.status(404).json({ error: 'Disruption not found' });
  }
});

// POST /api/simulate/clear — clear all simulation data
router.post('/simulate/clear', (req, res) => {
  tracker.clearAll();
  res.json({ status: 'cleared' });
});

// POST /api/whatif — what-if scenario (different priority/budget/deadline)
router.post('/whatif', (req, res) => {
  try {
    const scenarios = [];
    const base = req.body;
    const modes = ['cost', 'time', 'risk', 'balanced'];
    const disruptions = tracker.getDisruptions();

    for (const mode of modes) {
      const input = { ...base, priorityMode: mode };
      const result = generateRoutes(input, disruptions);
      const recommended = result.routes.find(r => r.recommended) || result.routes[3];
      scenarios.push({
        priorityMode: mode,
        recommendedRoute: recommended,
        allRoutes: result.routes,
      });
    }

    res.json({ scenarios });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
