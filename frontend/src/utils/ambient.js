/**
 * Ambient Intelligence Utilities
 * Color + animation helpers that react to safety data
 */

// ── Dynamic colour from score ──────────────────────────────────────────────

export function getDynamicColor(score) {
  const s = typeof score === 'number' ? score : 100;
  if (s >= 70) return '#00F5D4';   // teal  — safe
  if (s >= 50) return '#FFB703';   // amber — moderate
  return '#FF4D6D';                // coral — danger
}

export function getDynamicColorRgb(score) {
  const s = typeof score === 'number' ? score : 100;
  if (s >= 70) return '0, 245, 212';
  if (s >= 50) return '255, 183, 3';
  return '255, 77, 109';
}

export function getDynamicLabel(score) {
  const s = typeof score === 'number' ? score : 100;
  if (s >= 70) return 'safe';
  if (s >= 50) return 'caution';
  return 'danger';
}

// ── Hour → ambient palette ──────────────────────────────────────────────────

/**
 * Returns css-variable-ready gradient stops for the background veil
 * based on the current hour (18–24).
 */
export function getTimeAmbience(hour) {
  const h = typeof hour === 'number' ? hour : 22;

  // 6–8 PM  → cool blue dusk
  if (h >= 18 && h < 20) {
    return {
      primary:   '37, 99, 235',    // blue-600
      secondary: '99, 102, 241',   // indigo-500
      label: 'dusk',
    };
  }
  // 8–10 PM → deep purple
  if (h >= 20 && h < 22) {
    return {
      primary:   '109, 40, 217',   // violet-700
      secondary: '55, 6, 80',      // very dark purple
      label: 'evening',
    };
  }
  // 10–12 AM → near-black with red tint
  return {
    primary:   '127, 29, 29',     // red-900
    secondary: '15, 5, 20',       // near-black
    label: 'midnight',
  };
}

// ── Clamp helper ────────────────────────────────────────────────────────────

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
