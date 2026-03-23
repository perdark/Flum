/**
 * Animation utilities and variants for Framer Motion
 * Provides smooth, modern animations for the storefront
 */

import { Variants } from 'framer-motion';

// Stagger container - animates children with delay
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Fade up animation
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Scale in animation
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Hero carousel variants
export const heroCarousel: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

// Countdown pulse animation
export const countdownPulse: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Modal backdrop animation
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Modal content animation
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 },
  },
};

// Card hover effect
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 17,
    },
  },
};

// Shimmer effect for loading
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear',
    },
  },
};

// Scroll trigger variants
export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

// Floating animation for decorative elements
export const floating = {
  float: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Progress bar animation for countdown/expiry
export const progressShrink: Variants = {
  full: { scaleX: 1 },
  shrinking: {
    scaleX: 0,
    transition: {
      duration: 1,
      ease: 'linear',
    },
  },
};

// Get scroll progress for triggering animations
export const getScrollProgress = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const offsetTop = rect.top + scrollTop;
  const windowHeight = window.innerHeight;
  return Math.min(
    Math.max((scrollTop + windowHeight - offsetTop) / windowHeight, 0),
    1
  );
};
