/**
 * pssEngine.js
 * Path Safety Score (PSS) implementation based on research models.
 * Combines SafeRoute (kSNN, MADM) and CrowdSPaFE (pheromone/decaying reports).
 */

/**
 * 1. Report Decay (Pheromone Evaporation from CrowdSPaFE)
 * Decreases the impact of a user report over time.
 * @param {string|Date} reportTimestamp 
 * @param {string|Date} currentTimestamp 
 * @returns {number} decay multiplier (0.1 to 1.0)
 */
export const calculateReportDecay = (reportTimestamp, currentTimestamp = new Date()) => {
  const diffMs = new Date(currentTimestamp).getTime() - new Date(reportTimestamp).getTime();
  const diffMins = Math.max(0, diffMs / 60000);

  if (diffMins < 30) return 1.0;
  if (diffMins <= 60) return 0.7; // 30-60 mins
  if (diffMins <= 180) return 0.4; // 1-3 hrs
  return 0.1; // >3 hrs
};

/**
 * 2. PSS Formula (Multi-Attribute Decision Making / MADM)
 * Calculates the Path Safety Score for a specific zone/segment.
 * 
 * @param {Object} zoneData - base metrics { lighting: 0-100, footfall: 0-100, crimeSafety: 0-100 }
 * @param {Array} reports - array of relevant recent reports { severity, timestamp }
 * @param {Object} userPreferences - custom weighting modifiers
 * @param {Date} currentTime - time context for calculations
 * @returns {number} Path Safety Score (0-100)
 */
export const calculatePSS = (
  zoneData = {},
  reports = [], 
  userPreferences = { prioritizeLighting: false, avoidCrowds: false },
  currentTime = new Date()
) => {
  // Base weights (MADM principles)
  let weights = {
    lighting: 0.30,
    footfall: 0.20,
    crime: 0.25,
    reports: 0.25
  };

  // Adjust weights via User Preferences
  if (userPreferences.prioritizeLighting) {
    weights.lighting += 0.15;
    weights.crime -= 0.05;
    weights.footfall -= 0.10;
  }
  if (userPreferences.avoidCrowds) {
    weights.footfall -= 0.10;
    weights.crime += 0.10;
  }

  // Normalize weights securely to ensure sum = 1.0
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(k => (weights[k] /= totalWeight));

  // Extract base metrics (default to 50 if missing)
  const lightingScore = zoneData.lighting ?? 50;
  const footfallScore = zoneData.footfall ?? 50;
  const crimeScore = zoneData.crimeSafety ?? 50; // Historical crime safety (100 = safe)

  // Aggregate Report Safety Impact using Pheromone Evaporation
  let reportSafetyScore = 100; // 100 = No reports
  if (reports.length > 0) {
    const dangerReductionList = reports.map(report => {
      const decay = calculateReportDecay(report.timestamp, currentTime);
      // Determine severity weight natively
      let severityMod = 0.5; // default CAUTION
      if (report.severity === 'CRITICAL') severityMod = 1.0;
      if (report.severity === 'DANGER') severityMod = 0.8;
      
      // Max reduction per report is 40 points
      return 40 * severityMod * decay;
    });

    // Sum all reductions (cap at 100 points dropped)
    const totalReduction = dangerReductionList.reduce((sum, val) => sum + val, 0);
    reportSafetyScore = Math.max(0, 100 - totalReduction);
  }

  // Calculate Weighted Average
  const pss = (
    (lightingScore * weights.lighting) +
    (footfallScore * weights.footfall) +
    (crimeScore * weights.crime) +
    (reportSafetyScore * weights.reports)
  );

  return Math.min(100, Math.max(0, Math.round(pss)));
};

/**
 * 3. Detect Danger Transition (Coolight / safety-first routing)
 * Compares current segment PSS with upcoming segment PSS.
 * If score drops significantly, trigger a preventative awareness alert.
 * 
 * @param {number} prevPSS - Previous physical or temporal score
 * @param {number} currentPSS - Upcoming physical or temporal score
 * @param {number} threshold - Score drop threshold to trigger alert
 * @returns {Object|null} Alert object or null
 */
export const detectDangerTransition = (prevPSS, currentPSS, threshold = 20) => {
  if (typeof prevPSS !== 'number' || typeof currentPSS !== 'number') return null;

  const drop = prevPSS - currentPSS;
  
  if (drop >= threshold) {
    const isCritical = drop >= 40;
    return {
      alert: true,
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      dropValue: Math.round(drop),
      message: `Sharp decline in safety detected ahead. Score drops by ${Math.round(drop)} points. proceed with caution.`
    };
  }

  return null;
};
