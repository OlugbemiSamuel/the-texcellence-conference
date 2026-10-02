/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette lifted from the official conference flyer:
        // deep navy (primary), gold (accent), lavender mist (wash).
        brand: {
          navy: '#26225e',
          deep: '#17153c',
          gold: '#c9962e',
          goldlight: '#f3e6c8',
          mist: '#f3eff9',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
