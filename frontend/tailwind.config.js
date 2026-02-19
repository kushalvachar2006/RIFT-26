/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: '#00f0ff',
          cyan: '#0ff',
          red: '#ff003c',
          orange: '#ff6a00',
          green: '#00ff88',
        },
        dark: {
          950: '#010409',
          900: '#0a0e1a',
          800: '#0d1425',
          700: '#111827',
          600: '#1a2235',
          500: '#1e2d42',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
        body: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0,240,255,0.3), 0 0 60px rgba(0,240,255,0.1)',
        'neon-red': '0 0 20px rgba(255,0,60,0.3), 0 0 60px rgba(255,0,60,0.1)',
        'neon-green': '0 0 20px rgba(0,255,136,0.3)',
        'glass': '0 8px 32px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          'from': { textShadow: '0 0 10px rgba(0,240,255,0.5)' },
          'to': { textShadow: '0 0 20px rgba(0,240,255,1), 0 0 40px rgba(0,240,255,0.5)' },
        }
      }
    }
  },
  plugins: []
}
