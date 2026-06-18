import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // Provides the `prose` classes used for the editor's document styling.
    require("@tailwindcss/typography"),
  ],
};

export default config;
