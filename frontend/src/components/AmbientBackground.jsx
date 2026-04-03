import React, { useEffect, useRef, useMemo } from 'react';
import { getDynamicColorRgb, getTimeAmbience, clamp } from '../utils/ambient';

/**
 * AmbientBackground
 *
 * Renders three layered canvas-free ambient glows that react to:
 *  - avgSafetyScore  → colour of the central radial bloom
 *  - currentHour     → time-of-day colour veil + intensity
 *  - alertCount      → pulse intensity of edge glow
 *
 * All animation is done via CSS keyframes + inline variables —
 * zero React re-renders after mount, zero requestAnimationFrame loops.
 * Pointer-events: none everywhere so nothing blocks interaction.
 */
export default function AmbientBackground({ avgSafetyScore = 65, currentHour = 22, alertCount = 0 }) {
  const safetyRgb  = getDynamicColorRgb(avgSafetyScore);
  const timeData   = getTimeAmbience(currentHour);
  const alertLevel = clamp(alertCount / 20, 0, 1);         // 0–1 normalised

  // Opacity levels — keep very subtle so map stays readable
  const bloomOpacity = 0.07 + alertLevel * 0.05;           // 0.07–0.12
  const timeOpacity  = 0.06;
  const edgeOpacity  = 0.05 + alertLevel * 0.08;           // 0.05–0.13

  // Animation duration slows when safe, quickens when alert
  const bloomDuration = alertCount > 5 ? '8s' : '14s';
  const edgeDuration  = alertCount > 5 ? '5s' : '10s';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* ── Layer 1: Safety-reactive central bloom ───────────────────── */}
      <div
        className="ambient-bloom"
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw',
          height: '60vh',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(${safetyRgb}, ${bloomOpacity}) 0%, transparent 70%)`,
          animation: `ambientPulse ${bloomDuration} ease-in-out infinite`,
          willChange: 'transform, opacity',
        }}
      />

      {/* ── Layer 2: Time-of-day atmospheric veil ────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(${timeData.secondary}, ${timeOpacity}) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(${timeData.primary},   ${timeOpacity}) 0%, transparent 50%)
          `,
          transition: 'background 3s ease',
        }}
      />

      {/* ── Layer 3: Edge vignette that pulses with alert count ───────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(${safetyRgb}, ${edgeOpacity}) 100%)`,
          animation: `edgePulse ${edgeDuration} ease-in-out infinite`,
          willChange: 'opacity',
        }}
      />

      {/* ── Layer 4: Subtle corner bloom — always present ────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '40vw',
          height: '40vh',
          background: `radial-gradient(ellipse at 100% 100%, rgba(${safetyRgb}, 0.04) 0%, transparent 65%)`,
          animation: `ambientPulse 18s ease-in-out infinite reverse`,
        }}
      />
    </div>
  );
}
