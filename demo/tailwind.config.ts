import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../src/**/*.{ts,tsx}",
    "../dist/**/*.{js,cjs,mjs}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
