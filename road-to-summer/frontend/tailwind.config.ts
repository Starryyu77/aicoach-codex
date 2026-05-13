import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        field: "#f4f7f2",
        panel: "#ffffff",
        action: "#1f7a5a",
        amber: "#c37a25"
      }
    }
  },
  plugins: []
};

export default config;

