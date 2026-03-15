import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Backgrounds
        background: {
          DEFAULT: "#0F1629",
          light: "#161E54",
          lighter: "#1E2846",
          hover: "#252D52",
        },
        // Primary Blue
        primary: {
          DEFAULT: "#0066FF",
          hover: "#0052CC",
          light: "#3385FF",
          lighter: "#66A3FF",
          dark: "#0047B3",
        },
        // Secondary Deep Blue
        secondary: "#002896",
        // Accent Gold/Amber
        accent: {
          amber: "#FFB800",
          "amber-light": "#FFD23C",
          orange: "#FF6E00",
          "light-orange": "#FF8C41",
          yellow: "#FFD700",
        },
        // Card Colors
        card: {
          DEFAULT: "#1A233E",
          hover: "#252D52",
          light: "#2A3456",
        },
        // Border Colors
        border: {
          DEFAULT: "#2A3456",
          hover: "#3A4470",
          light: "#252D52",
        },
        // Text Colors
        text: {
          DEFAULT: "#FFFFFF",
          muted: "#9CA3AF",
          "muted-light": "#D1D5DB",
          dark: "#0A0E1A",
        },
        // Status Colors
        success: "#00D287",
        warning: "#FFB800",
        error: "#FF4757",
        info: "#00D4FF",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      },
      fontFamily: {
        sans: ["var(--font-readex-pro)", "system-ui", "sans-serif"],
        display: ["var(--font-readex-pro)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
        "6xl": "3.75rem",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      zIndex: {
        60: "60",
        70: "70",
        80: "80",
        90: "90",
        100: "100",
      },
      keyframes: {
        // Entrance Animations
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Continuous Animations
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // Interactive Animations
        "bounce-slight": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.5s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        float: "float 3s ease-in-out infinite",
        "bounce-slight": "bounce-slight 1s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
