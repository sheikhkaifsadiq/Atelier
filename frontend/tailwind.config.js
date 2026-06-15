/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  "#f7f8fb",
          100: "#eef0f6",
          200: "#d9deea",
          300: "#b9c0d3",
          400: "#8a93ad",
          500: "#5a6483",
          600: "#3d4866",
          700: "#283150",
          800: "#171d35",
          900: "#0b0f22",
          950: "#05071a",
        },
        accent: {
          400: "#7c83ff",
          500: "#5a63ff",
          600: "#3f48f0",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(8, 12, 30, 0.45)",
      },
      backdropBlur: { xs: "2px" },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 220ms ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
