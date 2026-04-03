import { useEffect } from 'react';

/**
 * RippleProvider
 *
 * A single document-level click listener that injects a ripple <div>
 * at the click position, then removes it after the animation ends.
 *
 * No React state — no re-renders. DOM manipulation only.
 * Skips ripple if the target already prevents default (e.g. disabled buttons).
 */
export default function RippleProvider() {
  useEffect(() => {
    const onClick = (e) => {
      // Don't ripple on disabled / non-interactive targets
      const target = e.target;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      const interactive = tag === 'button' || tag === 'a'
        || target.getAttribute?.('role') === 'button'
        || target.closest?.('button, a, [role="button"]');
      if (!interactive) return;

      const ripple = document.createElement('div');
      ripple.className = 'ripple-circle';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top  = `${e.clientY}px`;
      ripple.style.position = 'fixed';  // override .ripple-circle absolute

      document.body.appendChild(ripple);

      // Remove after animation completes
      ripple.addEventListener('animationend', () => {
        ripple.parentNode?.removeChild(ripple);
      });
    };

    document.addEventListener('click', onClick, { passive: true });
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
