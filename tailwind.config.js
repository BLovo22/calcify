/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./*.html",
    "./guides/**/*.html",
    "./tools/**/*.html",
    "./_build/**/*.html",
    "./_build/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        pri: "#2563eb",
        "pri-dark": "#1d4ed8",
        "pri-light": "#eff6ff"
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};
