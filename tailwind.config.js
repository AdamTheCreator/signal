/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080c14',
          card: 'rgba(255,255,255,0.03)',
        },
        border: {
          card: 'rgba(255,255,255,0.08)',
        },
        intel: '#00e5ff',
        'deep-context': '#7c3aed',
        concept: '#10b981',
        'interview-edge': '#f59e0b',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
