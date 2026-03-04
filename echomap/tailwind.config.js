/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0f172a',    // Deep Blue/Slate
        'brand-primary': '#8b5cf6', // Violet
        'brand-accent': '#06b6d4',  // Cyan
        'brand-surface': '#1e293b', // Lighter Slate for cards
      }
    },
  },
  plugins: [],
}
