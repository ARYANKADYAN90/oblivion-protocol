import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'oblivion-black': '#050505',
        'oblivion-dark': '#0f0f11',
        'oblivion-blue': '#1e3a8a',
        'oblivion-neon': '#3b82f6',
        'oblivion-accent': '#60a5fa',
        'oblivion-text': '#e2e8f0',
        'oblivion-muted': '#94a3b8'
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-roboto-mono)'],
      }
    },
  },
  plugins: [],
};
export default config;
