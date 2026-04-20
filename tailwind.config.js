/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132238",
        mist: "#edf4f7",
        coral: "#ff7a59",
        teal: "#1f9d8b",
        gold: "#ffcc66",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(19, 34, 56, 0.12)",
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(19, 34, 56, 0.09) 1px, transparent 0)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
