/**
 * Mode Engine: Determines FCL vs LCL vs Hybrid based on shipment properties
 */

const ITEM_TYPE_PROFILES = {
  electronics:   { hazard: false, tempSensitive: false, fragileBase: 0.7, valueFactor: 2.0, stackable: false },
  perishable:    { hazard: false, tempSensitive: true,  fragileBase: 0.5, valueFactor: 1.5, stackable: true },
  hazardous:     { hazard: true,  tempSensitive: false, fragileBase: 0.3, valueFactor: 1.8, stackable: false },
  pharmaceuticals: { hazard: false, tempSensitive: true, fragileBase: 0.8, valueFactor: 3.0, stackable: true },
  machinery:     { hazard: false, tempSensitive: false, fragileBase: 0.4, valueFactor: 1.6, stackable: false },
  textiles:      { hazard: false, tempSensitive: false, fragileBase: 0.1, valueFactor: 0.8, stackable: true },
  automotive:    { hazard: false, tempSensitive: false, fragileBase: 0.5, valueFactor: 1.7, stackable: false },
  chemicals:     { hazard: true,  tempSensitive: false, fragileBase: 0.3, valueFactor: 1.4, stackable: false },
  food:          { hazard: false, tempSensitive: true,  fragileBase: 0.2, valueFactor: 1.0, stackable: true },
  furniture:     { hazard: false, tempSensitive: false, fragileBase: 0.6, valueFactor: 1.1, stackable: false },
  general:       { hazard: false, tempSensitive: false, fragileBase: 0.2, valueFactor: 1.0, stackable: true },
};

const FRAGILITY_MAP = { low: 0.2, medium: 0.5, high: 0.9 };

function getItemProfile(itemType = 'general') {
  return ITEM_TYPE_PROFILES[itemType.toLowerCase()] || ITEM_TYPE_PROFILES.general;
}

/**
 * Determine shipping mode: FCL, LCL, or Hybrid
 */
function determineMode(shipment) {
  const { itemType, weight, volume, fragility, specialHandling } = shipment;
  const profile = getItemProfile(itemType);
  const fragilityScore = FRAGILITY_MAP[fragility?.toLowerCase()] || 0.2;

  // FCL conditions
  const isHighVolume  = volume > 20;   // > 20 CBM
  const isHighWeight  = weight > 10000; // > 10 tonnes
  const isHighValue   = profile.valueFactor >= 2.0;
  const isFragile     = fragilityScore >= 0.7;
  const isHazardous   = profile.hazard || specialHandling?.includes('hazardous');
  const isTempSensitive = profile.tempSensitive || specialHandling?.includes('temperature');

  if (isHighVolume || isHighWeight || isHighValue || isFragile || isHazardous) {
    return { mode: 'FCL', reason: buildReason({ isHighVolume, isHighWeight, isHighValue, isFragile, isHazardous }) };
  }

  // LCL feasibility check
  const lclCompatibility = checkLCLCompatibility(profile, fragilityScore, isTempSensitive, isHazardous);
  if (lclCompatibility.compatible) {
    return { mode: 'LCL', reason: 'Low volume, non-sensitive cargo suitable for LCL consolidation', lclCompatibility };
  }

  // Hybrid
  return {
    mode: 'HYBRID',
    reason: 'Mixed requirements suggest hybrid mode with potential shipment splitting',
    lclCompatibility
  };
}

function checkLCLCompatibility(profile, fragilityScore, isTempSensitive, isHazardous) {
  const risks = [];
  let riskScore = 0;

  if (isHazardous) {
    risks.push('Hazardous goods incompatible with standard LCL');
    riskScore += 50;
  }
  if (fragilityScore >= 0.7) {
    risks.push('High fragility — LCL co-loading increases damage risk');
    riskScore += 30;
  }
  if (isTempSensitive) {
    risks.push('Temperature-sensitive cargo may not share LCL container safely');
    riskScore += 25;
  }
  if (!profile.stackable) {
    risks.push('Non-stackable goods limit LCL efficiency');
    riskScore += 15;
  }

  return {
    compatible: riskScore < 40,
    riskScore,
    risks,
    recommendation: riskScore >= 40 ? 'Switch to FCL or split shipment' : 'LCL viable with standard precautions'
  };
}

function buildReason(flags) {
  const reasons = [];
  if (flags.isHighVolume)  reasons.push('high volume (>20 CBM)');
  if (flags.isHighWeight)  reasons.push('heavy cargo (>10t)');
  if (flags.isHighValue)   reasons.push('high-value goods');
  if (flags.isFragile)     reasons.push('fragile cargo requires dedicated container');
  if (flags.isHazardous)   reasons.push('hazardous materials require FCL isolation');
  return `FCL required: ${reasons.join(', ')}`;
}

/**
 * Carrier selection: returns premium, balanced, economy tiers
 */
const CARRIERS = {
  air: [
    { id: 'C_AIR_PREMIUM', name: 'Emirates SkyCargo', tier: 'premium', costFactor: 1.8, delayHistory: 0.05, damageRate: 0.01, capabilities: ['electronics','pharma','cold-chain','hazmat'] },
    { id: 'C_AIR_BAL',     name: 'Lufthansa Cargo',   tier: 'balanced', costFactor: 1.3, delayHistory: 0.10, damageRate: 0.02, capabilities: ['electronics','general','automotive'] },
    { id: 'C_AIR_ECON',    name: 'FedEx International', tier: 'economy', costFactor: 1.0, delayHistory: 0.15, damageRate: 0.03, capabilities: ['general','textiles','food'] },
  ],
  sea: [
    { id: 'C_SEA_PREMIUM', name: 'Maersk Line',       tier: 'premium', costFactor: 1.5, delayHistory: 0.08, damageRate: 0.01, capabilities: ['general','chemicals','cold-chain','heavy'] },
    { id: 'C_SEA_BAL',     name: 'MSC',               tier: 'balanced', costFactor: 1.1, delayHistory: 0.12, damageRate: 0.02, capabilities: ['general','textiles','machinery'] },
    { id: 'C_SEA_ECON',    name: 'COSCO Shipping',    tier: 'economy', costFactor: 0.8, delayHistory: 0.18, damageRate: 0.03, capabilities: ['general','bulk','automotive'] },
  ],
  road: [
    { id: 'C_ROAD_PREMIUM', name: 'DHL Express Road', tier: 'premium', costFactor: 1.4, delayHistory: 0.06, damageRate: 0.01, capabilities: ['electronics','pharma','fragile'] },
    { id: 'C_ROAD_BAL',     name: 'DB Schenker',      tier: 'balanced', costFactor: 1.0, delayHistory: 0.10, damageRate: 0.02, capabilities: ['general','machinery','automotive'] },
    { id: 'C_ROAD_ECON',    name: 'XPO Logistics',    tier: 'economy', costFactor: 0.7, delayHistory: 0.14, damageRate: 0.03, capabilities: ['general','textiles','furniture'] },
  ],
  rail: [
    { id: 'C_RAIL_BAL',  name: 'Eurasian Rail',  tier: 'balanced', costFactor: 0.9, delayHistory: 0.12, damageRate: 0.02, capabilities: ['general','machinery','automotive'] },
    { id: 'C_RAIL_ECON', name: 'China Railways', tier: 'economy', costFactor: 0.6, delayHistory: 0.16, damageRate: 0.025, capabilities: ['general','textiles','electronics'] },
  ],
};

function selectCarrier(modeType, priorityMode) {
  const list = CARRIERS[modeType] || CARRIERS.sea;
  const idx = priorityMode === 'cost' ? 2 : priorityMode === 'time' ? 0 : 1;
  return {
    premium: list[0],
    balanced: list[Math.min(1, list.length - 1)],
    economy: list[list.length - 1],
    recommended: list[Math.min(idx, list.length - 1)],
  };
}

module.exports = { determineMode, checkLCLCompatibility, getItemProfile, selectCarrier, CARRIERS, FRAGILITY_MAP };
