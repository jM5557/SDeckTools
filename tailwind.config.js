module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#15f7ff", // Light blue accent,
        accentMid: "rgb(24, 216, 223)", // Light blue accent
        nightLight: "#26354e",
        nightMid: "#202c41",
        night: "#1E293B", // Dark background
        white: "#FFFFFF", // White text
      },
      fontFamily: {
        sans: ["Mulish", "sans-serif"],
      },
    },
  },
  plugins: [],
};
