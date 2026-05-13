/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdf9',
          100: '#ccfbef',
          500: '#14b892',
          600: '#0F6E56',
          700: '#0a5040',
          800: '#063d30',
        },
      },
    },
  },
  plugins: [],
};
