import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D9E75",
          dark: "#0F6E56",
          deep: "#0A4A39",
          light: "#E1F5EE",
          mint: "#9FE1CB",
        },
        cream: "#F5F4F0",
        sand: "#EDEAE2",
        ink: "#1A1A17",
        alert: {
          bg: "#FEFBD0",
          DEFAULT: "#FFF8A0",
          border: "#E8D97A",
          text: "#7A5C00",
        },
        // Argila/terracota pastel — usada para valores que saem (retenção, SS,
        // ações destrutivas). Substitui o vermelho agressivo. Tem override no
        // dark em globals.css (tom pastel claro sobre superfície quente escura).
        clay: {
          bg: "#F6E7E0",
          DEFAULT: "#C2745A",
          border: "#E6C5B7",
          text: "#97553C",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Escala de elevação coerente (sombras quentes, não cinzentas frias).
        soft: "0 10px 40px -12px rgba(28, 25, 23, 0.12)",
        card: "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -12px rgba(28,25,23,0.10)",
        lift: "0 2px 4px rgba(28,25,23,0.05), 0 18px 40px -16px rgba(28,25,23,0.18)",
        float: "0 30px 60px -24px rgba(15,110,86,0.28)",
        glow: "0 0 0 1px rgba(29,158,117,0.12), 0 20px 50px -20px rgba(29,158,117,0.30)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
