import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "var(--background)",
        card: "var(--card)",
        gold: {
          DEFAULT: "var(--gold)",
          bright: "var(--gold-bright)",
          dim: "var(--gold-dim)",
        },
        mist: "var(--mist)",
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "wuxia-radial":
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 55%)",
        "wuxia-mountains":
          "linear-gradient(180deg, #0a0b0d 0%, #0c0e14 40%, #0a0b0d 100%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,175,55,0.1)",
        "card-hover":
          "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
