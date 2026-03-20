/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          900: "#0a0e1a",
          800: "#121829",
          700: "#1b2340",
          600: "#263059",
        },
        safe: "#22c55e",
        caution: "#eab308",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};
