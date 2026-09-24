/**
 * Shared Framer Motion (motion/react) tokens for the whole app.
 * House style: opacity + small transforms only, short durations,
 * one shared easing curve. Always pair with useReducedMotion.
 */

/** House ease-out — cubic-bezier(0.23, 1, 0.32, 1). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Standard quick duration for UI micro-interactions (seconds). */
export const DURATION_FAST = 0.18;

/** Standard duration for screen transitions (seconds). */
export const DURATION_SCREEN = 0.28;

/** Screen enter/exit: fade + tiny rise. Pairs with AnimatePresence mode="wait". */
export const screenVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
} as const;

export const screenTransition = {
  duration: DURATION_SCREEN,
  ease: EASE_OUT,
} as const;

/** Modal enter/exit: backdrop fade + panel scale-up from 0.97. */
export const modalBackdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export const modalPanelVariants = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
} as const;

export const modalTransition = {
  duration: DURATION_SCREEN,
  ease: EASE_OUT,
} as const;

/** Feed post entrance — rise + fade, staggered by list index (capped). */
export function postEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.32,
      ease: EASE_OUT,
      delay: Math.min(index, 5) * 0.05,
    },
  } as const;
}
