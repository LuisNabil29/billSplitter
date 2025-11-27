import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#ED5A02", // Naranja vibrante principal
          light: "#ED8302", // Naranja suave
          dark: "#ED3102", // Naranja rojizo intenso
          bright: "#EDA202", // Amarillo dorado
          yellow: "#EFC10A", // Amarillo brillante
          peach: "#EDA751", // Melocotón/naranja pálido
        },
        accent: {
          DEFAULT: "#EDA202", // Amarillo dorado como acento
          light: "#EFC10A", // Amarillo brillante
          dark: "#ED3102", // Naranja intenso
        },
      },
    },
  },
  plugins: [],
};
export default config;

