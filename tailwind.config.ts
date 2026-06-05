import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#f7f8f4",
        line: "#d9ded6",
        moss: "#386641",
        sky: "#2f80ed",
        rust: "#b45309",
        rose: "#be123c",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(23, 32, 42, 0.1)",
        "panel-hover": "0 18px 45px rgba(23, 32, 42, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
