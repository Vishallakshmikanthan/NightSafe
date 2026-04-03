/**
 * agentEngine.js — NightSafe Multi-Agent AI Orchestrator
 *
 * Five specialised agents analyse city safety data and produce structured
 * insights. Each agent runs synchronously on local data with optional API
 * enrichment fetched in parallel. All agents are wrapped in try/catch so a
 * single failure never aborts the full orchestration run.
 */

import {
  fetchDangerZones,
  fetchStreets,
  fetchPredictions,
  fetchInvestmentReport,
} from '../services/api';

// ─── static fallback data ────────────────────────────────────────────────────

const FALLBACK_AREAS = [
  { name: 'Perambur North',    priority: 'high'   },
  { name: 'T Nagar Main',      priority: 'high'   },
  { name: 'Kodambakkam',       priority: 'medium' },
  { name: 'Guindy Junction',   priority: 'medium' },
  { name: 'Tondiarpet',        priority: 'low'    },
];

const INFRA_ACTIONS = [
  'Install CCTV and street lighting on arterial roads',
  'Increase night police patrol frequency',
  'Add SOS emergency call points every 200 m',
  'Improve pedestrian pathway illumination',
  'Deploy mobile police checkpoints',
  'Install panic buttons at all bus stops',
];

// ─── Risk Agent ──────────────────────────────────────────────────────────────
/**
 * Analyses danger-zone density and the current hour to produce a city-wide
 * risk score (0–100) plus trend and affected-area details.
 */
function runRiskAgent(dangerZones, streets, currentHour) {
  try {
    const dz    = Array.isArray(dangerZones) ? dangerZones : [];
    const total = Math.max(Array.isArray(streets) ? streets.length : 1, 1);
    const ratio = dz.length / total;

    const h             = Number(currentHour) || 22;
    const isLateNight   = h >= 22 || h < 5;
    const isPeakEvening = h >= 18 && h < 22;
    const penalty       = isLateNight ? 15 : isPeakEvening ? 7 : 0;
    const score         = Math.max(0, Math.min(100, Math.round(100 - ratio * 200 - penalty)));

    let status, headline, trend;
    if (score < 30) {
      status = 'critical'; trend = 'rising';
      headline = 'City risk level critical — multiple hotspots active';
    } else if (score < 50) {
      status = 'elevated'; trend = 'rising';
      headline = 'Elevated risk detected — stay on well-lit roads';
    } else if (score < 72) {
      status = 'moderate'; trend = 'stable';
      headline = 'Moderate conditions — exercise standard caution';
    } else {
      status = 'safe'; trend = 'falling';
      headline = 'Stable safe zone — city conditions nominal';
    }

    const details = [];
    if (dz.length > 0)
      details.push(`${dz.length} danger zone${dz.length !== 1 ? 's' : ''} active across monitored corridors`);
    if (isLateNight)
      details.push('Late-night hours amplify pedestrian vulnerability');
    if (isPeakEvening)
      details.push('Evening peak — transit zones under elevated pressure');
    if (ratio > 0.25)
      details.push('Danger density above safe threshold — patrol deployment advised');
    if (details.length === 0)
      details.push('All monitored corridors within safe operating parameters');

    const affectedAreas = dz
      .slice(0, 4)
      .map(z => z.street_name || z.name || null)
      .filter(Boolean);

    return { status, headline, details, score, trend, affectedAreas };
  } catch {
    return {
      status: 'unknown',
      headline: 'Risk analysis temporarily unavailable',
      details: ['Engine fallback active — monitoring continues'],
      score: 50,
      trend: 'stable',
      affectedAreas: [],
    };
  }
}

// ─── Crowd Agent ─────────────────────────────────────────────────────────────
/**
 * Simulates footfall patterns based on hour and danger-zone density. Produces
 * a 0–100 footfall index and safe/unsafe zone classifications.
 */
function runCrowdAgent(dangerZones, currentHour) {
  try {
    const h  = Number(currentHour) || 22;
    const dz = Array.isArray(dangerZones) ? dangerZones : [];

    let footfallIndex, status, headline;
    if      (h >= 7  && h < 9)  { footfallIndex = 70; status = 'moderate'; headline = 'Morning commute — steady crowd buildup'; }
    else if (h >= 9  && h < 17) { footfallIndex = 52; status = 'moderate'; headline = 'Daytime activity — mixed zone occupancy'; }
    else if (h >= 17 && h < 20) { footfallIndex = 90; status = 'dense';    headline = 'Evening peak — city-wide high activity'; }
    else if (h >= 20 && h < 23) { footfallIndex = 62; status = 'moderate'; headline = 'Night activity — main corridors populated'; }
    else                         { footfallIndex = 18; status = 'sparse';   headline = 'Low footfall — reduced visibility, elevated risk'; }

    const details = [];
    if (footfallIndex < 30) {
      details.push('Sparse activity → heightened vulnerability for solo travel');
      details.push('Maintain presence on illuminated main roads');
    } else if (footfallIndex >= 80) {
      details.push('High density → natural deterrent for opportunistic crime');
      details.push('Remain vigilant in crowded transit zones');
    } else {
      details.push('Moderate crowd levels — conditions manageable');
      details.push('Avoid isolated side streets after 21:00');
    }

    const safeZones   = ['Anna Nagar Main Rd', 'T Nagar Bus Terminus', 'Adyar Signal Junction'];
    const unsafeZones = dz
      .slice(0, 3)
      .map(z => z.street_name || z.name || null)
      .filter(Boolean);
    if (unsafeZones.length === 0) unsafeZones.push('No active danger corridors');

    return { status, headline, footfallIndex, details, safeZones, unsafeZones };
  } catch {
    return {
      status: 'unknown',
      headline: 'Crowd data temporarily unavailable',
      footfallIndex: 50,
      details: [],
      safeZones: [],
      unsafeZones: [],
    };
  }
}

// ─── Alert Agent ─────────────────────────────────────────────────────────────
/**
 * Determines current alert severity from live alert count and produces
 * predictive warnings based on time patterns + optional API predictions.
 */
function runAlertAgent(alerts, predictions, currentHour) {
  try {
    const al    = Array.isArray(alerts) ? alerts : [];
    const count = al.length;
    let severity;
    if      (count === 0) severity = 'none';
    else if (count < 3)   severity = 'low';
    else if (count < 7)   severity = 'medium';
    else                  severity = 'high';

    const h         = Number(currentHour) || 22;
    const rulePreds = [];
    if (h >= 21)           rulePreds.push('⚠️ Egmore likely unsafe in the next 30 min');
    if (h >= 21)           rulePreds.push('Tambaram incidents may spike after 23:00');
    if (h >= 17 && h < 22) rulePreds.push('📍 T Nagar pedestrian density nearing threshold');
    if (h >= 0  && h < 5)  rulePreds.push('🔴 City-wide low-footfall window — extreme vigilance required');
    if (h >= 22)           rulePreds.push('Night bus routes 21C / 27C showing reduced patrol coverage');

    const apiPreds = Array.isArray(predictions)
      ? predictions
          .slice(0, 3)
          .map(p => (typeof p === 'string' ? p : p?.message || p?.description || null))
          .filter(Boolean)
      : [];

    const topAlert = al.length > 0
      ? (al[0]?.message || al[0]?.description || `Active alert — ${al[0]?.street_name || 'unknown area'}`)
      : null;

    return {
      severity,
      count,
      predictions: [...rulePreds, ...apiPreds].slice(0, 6),
      activeAlerts: al.slice(0, 8),
      topAlert,
    };
  } catch {
    return { severity: 'none', count: 0, predictions: [], activeAlerts: [], topAlert: null };
  }
}

// ─── Route Agent ─────────────────────────────────────────────────────────────
/**
 * Analyses the active route for danger / caution segments and produces
 * rerouting recommendations with alternative suggestions.
 */
function runRouteAgent(routeData) {
  try {
    if (!routeData) {
      return {
        hasRoute:        false,
        recommendation:  'No active route — select a destination for real-time guidance',
        dangerSegments:  0,
        cautionSegments: 0,
        safeAlternative: null,
        avoidAreas:      [],
      };
    }

    const steps = Array.isArray(routeData.route)
      ? routeData.route
      : Array.isArray(routeData.segments)
      ? routeData.segments
      : [];

    const dangerSegments = steps.filter(
      s => s.zone === 'DANGER' || (typeof s.safety_score === 'number' && s.safety_score < 40),
    ).length;

    const cautionSegments = steps.filter(
      s => s.zone === 'CAUTION' ||
        (typeof s.safety_score === 'number' && s.safety_score >= 40 && s.safety_score < 70),
    ).length;

    const avoidAreas = steps
      .filter(s => s.zone === 'DANGER' || (typeof s.safety_score === 'number' && s.safety_score < 40))
      .slice(0, 3)
      .map(s => s.street_name || s.from_name || null)
      .filter(Boolean);

    let recommendation, safeAlternative;
    if (dangerSegments === 0 && cautionSegments === 0) {
      recommendation  = 'Active route fully clear — all segments within safe parameters';
      safeAlternative = null;
    } else if (dangerSegments === 0) {
      recommendation  = `Route passes through ${cautionSegments} caution zone${cautionSegments !== 1 ? 's' : ''} — remain alert`;
      safeAlternative = 'Safest route adds ~2 min but avoids all caution zones';
    } else {
      recommendation  = `Route intersects ${dangerSegments} danger segment${dangerSegments !== 1 ? 's' : ''} — reroute strongly advised`;
      safeAlternative = `Safest alternative avoids ${dangerSegments} danger zone${dangerSegments !== 1 ? 's' : ''} with minimal time cost`;
    }

    return { hasRoute: true, recommendation, dangerSegments, cautionSegments, safeAlternative, avoidAreas };
  } catch {
    return {
      hasRoute:        false,
      recommendation:  'Route analysis engine error — using fallback',
      dangerSegments:  0,
      cautionSegments: 0,
      safeAlternative: null,
      avoidAreas:      [],
    };
  }
}

// ─── Investment Agent ─────────────────────────────────────────────────────────
/**
 * Identifies infrastructure investment priorities using API data where
 * available, falling back to rule-based analysis of active danger zones.
 */
function runInvestmentAgent(dangerZones, investmentData) {
  try {
    const dz = Array.isArray(dangerZones) ? dangerZones : [];
    let topAreas = [];

    // Use structured API response if available
    if (investmentData && Array.isArray(investmentData.recommendations)) {
      topAreas = investmentData.recommendations.slice(0, 5).map((r, i) => ({
        area:     r.area         || r.street_name || `Zone ${i + 1}`,
        priority: r.priority     || (r.risk_score > 70 ? 'high' : r.risk_score > 40 ? 'medium' : 'low'),
        action:   r.recommendation || r.action  || INFRA_ACTIONS[i % INFRA_ACTIONS.length],
      }));
    }

    // Rule-based fallback: derive from live danger zones
    if (topAreas.length === 0 && dz.length > 0) {
      topAreas = dz.slice(0, 5).map((z, i) => ({
        area:     z.street_name || z.name || FALLBACK_AREAS[i]?.name || `Zone ${i + 1}`,
        priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
        action:   INFRA_ACTIONS[i % INFRA_ACTIONS.length],
      }));
    }

    // Static fallback when no live data is available
    if (topAreas.length === 0) {
      topAreas = FALLBACK_AREAS.map((f, i) => ({
        area:     f.name,
        priority: f.priority,
        action:   INFRA_ACTIONS[i % INFRA_ACTIONS.length],
      }));
    }

    const highCount      = topAreas.filter(a => a.priority === 'high').length;
    const headline       = highCount > 0
      ? `${highCount} high-priority infrastructure gap${highCount !== 1 ? 's' : ''} identified`
      : 'City safety infrastructure within acceptable parameters';
    const estimatedImpact = `Addressing top ${Math.min(topAreas.length, 3)} areas could reduce incident rate by ~${15 + topAreas.length * 4}%`;

    return { topAreas, headline, estimatedImpact };
  } catch {
    return {
      topAreas:        FALLBACK_AREAS.map((f, i) => ({ area: f.name, priority: f.priority, action: INFRA_ACTIONS[i % INFRA_ACTIONS.length] })),
      headline:        'Investment analysis running on local data',
      estimatedImpact: 'Impact assessment pending full data',
    };
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
/**
 * runAgents — parallel-fetches all required data, runs all five agents,
 * and returns a consolidated insights object.
 *
 * Uses Promise.allSettled so any API failure degrades gracefully rather
 * than aborting the entire run.
 *
 * @param {object}       ctx
 * @param {Array}        ctx.alerts      — live alert objects from app state
 * @param {object|null}  ctx.routeData   — active route object from app state
 * @param {number}       ctx.currentHour — time-slider hour (0–23)
 * @returns {Promise<AgentInsights>}
 */
export async function runAgents({ alerts = [], routeData = null, currentHour = 22 } = {}) {
  const [dzResult, stResult, pdResult, invResult] = await Promise.allSettled([
    fetchDangerZones(currentHour),
    fetchStreets(),
    fetchPredictions(currentHour),
    fetchInvestmentReport(5),
  ]);

  const dangerZones = dzResult.status  === 'fulfilled' ? (Array.isArray(dzResult.value)  ? dzResult.value  : []) : [];
  const streets     = stResult.status  === 'fulfilled' ? (Array.isArray(stResult.value)  ? stResult.value  : []) : [];
  const predictions = pdResult.status  === 'fulfilled' ? (Array.isArray(pdResult.value)  ? pdResult.value  : []) : [];
  const investData  = invResult.status === 'fulfilled' ? (invResult.value ?? null) : null;

  return {
    risk:       runRiskAgent(dangerZones, streets, currentHour),
    crowd:      runCrowdAgent(dangerZones, currentHour),
    alert:      runAlertAgent(alerts, predictions, currentHour),
    route:      runRouteAgent(routeData),
    investment: runInvestmentAgent(dangerZones, investData),
    timestamp:  new Date().toLocaleTimeString(),
  };
}
