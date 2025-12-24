import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surfaceElevated: "var(--surface-elevated)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        accentStrong: "var(--accent-strong)",
        accentSoft: "var(--accent-soft)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94, 234, 212, 0.2), 0 20px 60px -30px rgba(94, 234, 212, 0.35)",
      },
      keyframes: {
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { from: { backgroundPosition: "0% 50%" }, to: { backgroundPosition: "100% 50%" } },
      },
      animation: {
        fade: "fade 0.6s ease-out",
        rise: "rise 0.7s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
