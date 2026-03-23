/**
 * Animation utilities and variants for dashboard
 * Provides smooth, modern animations for admin interface
 */

import { Variants } from 'framer-motion';

// Stagger container - animates children with delay
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Fade up animation
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Scale in animation
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Slide in from right (for sidebar, panels)
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

// Modal backdrop animation
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Modal content animation
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 15,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 400,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Card hover effect
export const cardHover = {
  rest: { scale: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hover: {
    scale: 1.01,
    borderColor: 'rgba(255, 184, 0, 0.3)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

// Button press effect
export const buttonPress = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
};

// List item animation for tables
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
    },
  },
};

// Status badge pulse
export const statusPulse = {
  pulse: {
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  reduced: {
    opacity: 1,
    transition: {
      duration: 0,
    },
  },
};

// Form field focus animation
export const fieldFocus = {
  rest: { borderColor: 'rgba(255,255,255,0.1)' },
  focus: {
    borderColor: 'rgba(255, 184, 0, 0.5)',
    boxShadow: '0 0 0 3px rgba(255, 184, 0, 0.1)',
    transition: { duration: 0.2 },
  },
};

// Preview refresh animation
export const previewRefresh: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};
