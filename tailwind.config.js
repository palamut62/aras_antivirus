/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/renderer/src/**/*.{ts,tsx}', './app/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mole: {
          bg: 'var(--mole-bg)',
          surface: 'var(--mole-surface)',
          border: 'var(--mole-border)',
          accent: 'var(--mole-accent)',
          'accent-hover': 'var(--mole-accent-hover)',
          safe: 'var(--mole-safe)',
          warning: 'var(--mole-warning)',
          danger: 'var(--mole-danger)',
          text: 'var(--mole-text)',
          'text-muted': 'var(--mole-text-muted)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
