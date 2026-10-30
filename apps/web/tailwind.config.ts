import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        servora: {
          navy: "#041F56",       // Primary text, navigation, headings
          core: "#0554F4",       // Primary actions, active navigation, links[cite: 2]
          bright: "#0C88FB",     // Highlights, focus accents[cite: 2]
          teal: "#05BBBB",       // Secondary actions, positive progress[cite: 2]
          deepTeal: "#176E84",   // Layered visuals, secondary data series[cite: 2]
          white: "#FFFFFF",      // Clean page surfaces[cite: 2]
          pale: "#F5F8FE",       // Subtle section backgrounds, hover states[cite: 2]
        },
      },
    },
  },
  plugins: [],
};
export default config;