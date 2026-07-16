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
        pri: "#154734",
        "pri-dark": "#0c3023",
        "pri-light": "#e4f0e8",
        accent: "#c7f36b",
        ink: "#102018",
        paper: "#f7f5ef"
      },
      fontFamily: {
        sans: ["Aptos", "Avenir Next", "Segoe UI Variable", "Segoe UI", "sans-serif"],
        display: ["Aptos Display", "Avenir Next", "Trebuchet MS", "sans-serif"],
        mono: ["Cascadia Mono", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
