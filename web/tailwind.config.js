/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // T-Rebrand-1 resolved by T3-1: colors now reference the live CSS
      // custom properties defined in src/index.css (one block per
      // [data-theme]) instead of static light-only hex values. Tailwind's
      // config is still compiled at build time, but pointing these keys at
      // var(--x) means the *values* update at runtime when theme.js's React
      // port flips the [data-theme] attribute — no rebuild needed per theme.
      colors: {
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-card": "var(--bg-card)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "border-color": "var(--border-color)",
        shadow: "var(--shadow)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #7C4DFF 0%, #512DAB 100%)",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
}
