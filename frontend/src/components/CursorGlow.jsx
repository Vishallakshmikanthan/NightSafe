import { useEffect, useRef, useCallback } from 'react';

/**
 * CursorGlow
 *
 * Renders a soft glowing circle that follows the cursor.
 * Color reacts to hovered element:
 *   - buttons / interactive → teal
 *   - [data-danger] elements → coral
 *   - default               → neutral white
 *
 * Implementation:
 *   - Single <div> moved via CSS transform (GPU composited, no layout thrash)
 *   - mousemove listener on document using refs — zero React state changes
 *   - Visibility toggled on mouseleave/enter
 *   - Graceful no-op on touch devices
 */
export default function CursorGlow() {
  const glowRef   = useRef(null);
  const posRef    = useRef({ x: -200, y: -200 });
  const frameRef  = useRef(null);
  const colorRef  = useRef('255,255,255');
  const visRef    = useRef(false);

  const COLORS = {
    teal:    '0, 245, 212',
    coral:   '255, 77, 109',
    amber:   '255, 183, 3',
    default: '255, 255, 255',
  };

  const getColor = useCallback((target) => {
    if (!target) return COLORS.default;
    // Walk up max 5 parents to detect element type
    let el = target;
    for (let i = 0; i < 5 && el; i++) {
      const tag  = el.tagName?.toLowerCase();
      const role = el.getAttribute?.('role');
      const hasDanger = el.dataset?.danger || el.classList?.contains('danger-zone');
      const hasAmber  = el.classList?.contains('caution-zone');

      if (hasDanger)  return COLORS.coral;
      if (hasAmber)   return COLORS.amber;
      if (tag === 'button' || tag === 'a' || role === 'button') return COLORS.teal;
      el = el.parentElement;
    }
    return COLORS.default;
  }, []);

  const flush = useCallback(() => {
    const el = glowRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    el.style.background = `radial-gradient(circle, rgba(${colorRef.current}, 0.12) 0%, rgba(${colorRef.current}, 0.04) 40%, transparent 70%)`;
    frameRef.current = null;
  }, []);

  useEffect(() => {
    // Skip on touch-primary devices (no hover)
    if (window.matchMedia('(hover: none)').matches) return;

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      colorRef.current = getColor(e.target);
      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(flush);
      }
    };

    const onEnter = () => {
      const el = glowRef.current;
      if (el) { el.style.opacity = '1'; visRef.current = true; }
    };

    const onLeave = () => {
      const el = glowRef.current;
      if (el) { el.style.opacity = '0'; visRef.current = false; }
    };

    document.addEventListener('mousemove', onMove,  { passive: true });
    document.addEventListener('mouseenter', onEnter, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [flush, getColor]);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 280,
        height: 280,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0,
        transition: 'opacity 0.4s ease, background 0.3s ease',
        willChange: 'transform',
        mixBlendMode: 'screen',
      }}
    />
  );
}
