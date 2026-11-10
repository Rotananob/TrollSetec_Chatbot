/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        kantumruy: ["'Kantumruy Pro'", 'Battambang', 'system-ui', 'sans-serif'],
        battambang: ['Battambang', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
