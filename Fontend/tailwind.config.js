/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        'public-sans': ['Public Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};