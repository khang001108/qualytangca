/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "375px",
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: 0, transform: "translateY(12px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        popIn: {
          "0%":   { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)",   opacity: 1 },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-5px)" },
        },
      },
      animation: {
        fadeSlideUp:   "fadeSlideUp 0.25s ease-out forwards",
        popIn:         "popIn 0.22s cubic-bezier(.22,1,.36,1) forwards",
        "bounce-slow": "bounce-slow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
