import type { Config } from "tailwindcss";

export const webTailwindConfig: Config = {
  darkMode: ["class"],
  content: [],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#132238",
          accent: "#13795b",
          sand: "#f5efe5",
          coral: "#d95d39",
          slate: "#5f6f81",
        },
      },
      boxShadow: {
        soft: "0 24px 60px rgba(19, 34, 56, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
