/**
 * GBAIGBANCE Motion & Animation System
 * Apple iOS 27 inspired physics, spring damping, and micro-interactions
 */

export const springPhysics = {
  snappy: { type: 'spring', stiffness: 420, damping: 30 },
  gentle: { type: 'spring', stiffness: 260, damping: 25 },
  bouncy: { type: 'spring', stiffness: 500, damping: 18 },
} as const;

export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  cardTap: {
    whileHover: { scale: 1.015, transition: { duration: 0.18 } },
    whileTap: { scale: 0.96, transition: { duration: 0.1 } },
  },
  slideUp: {
    initial: { y: '100%', opacity: 0.8 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
} as const;
