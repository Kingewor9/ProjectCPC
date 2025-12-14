/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark blue, blue, and grey color scheme
        darkBlue: {
          900: '#0a1628',
          800: '#1a2f4a',
          700: '#2a4568',
          600: '#3a5a86',
          500: '#4a70a4',
        },
        blue: {
          600: '#0078d4',
          500: '#1084d7',
          400: '#1e90ff',
        },
        grey: {
          900: '#111318',
          800: '#1f2937',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
