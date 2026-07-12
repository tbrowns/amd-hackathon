import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16231b",
        forest: "#175c3a",
        leaf: "#2f8355",
        moss: "#9db448",
        oat: "#f5f2e9",
        sun: "#f2b94b",
        clay: "#b85e3f",
      },
      boxShadow: {
        card: "0 18px 50px rgba(24, 67, 44, 0.10)",
        soft: "0 8px 24px rgba(24, 67, 44, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
