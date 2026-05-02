/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        binge: {
          bg: '#0a0a0a',
          card: '#1a1a1a',
          border: '#333',
          dim: '#888',
          accent: '#dc2743',
          gradient: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
        }
      }
    },
  },
  plugins: [],
}