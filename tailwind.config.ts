import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#050508",
          card: "rgba(255,255,255,0.052)",
          muted: "rgba(255,255,255,0.035)"
        }
      },
      boxShadow: {
        nebula: "0 22px 70px rgba(0, 0, 0, 0.45)",
        glow: "0 0 28px rgba(34, 211, 238, 0.18), 0 0 42px rgba(168, 85, 247, 0.14)"
      },
      animation: {
        "notification-in": "notification-in 180ms ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
