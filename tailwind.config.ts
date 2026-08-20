import type { Config } from "tailwindcss";

/** Tailwind content sources for application and reusable component styles. */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
