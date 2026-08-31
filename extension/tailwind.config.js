/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.html",
  ],
  important: true, // Make all utilities !important
  theme: {
    extend: {},
  },
  plugins: [
    function({ addBase }) {
      // Add scoped preflight styles only for our container
      addBase({
        '#ticker-buddy-extension-root': {
          // Tailwind's preflight equivalent, scoped
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      });
    },
  ],
  corePlugins: {
    preflight: false, // Disable global preflight to not affect page
  },
}
