import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#08070b",
        obsidian: "#111017",
        charcoal: "#1a1721",
        ember: "#d89b4a",
        aureate: "#f1c96b",
        mana: "#54c6ff",
        violet: "#9f7aea",
        crimson: "#d94b5f",
        stamina: "#65d184"
      },
      boxShadow: {
        rune: "0 0 40px rgba(84, 198, 255, 0.14)",
        ember: "0 0 36px rgba(241, 201, 107, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
