/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // <--- thêm dòng này
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
    "./globals.css",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
