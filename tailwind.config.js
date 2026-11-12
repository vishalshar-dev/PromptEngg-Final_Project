/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    'text-emerald-300', 'bg-emerald-500/10', 'border-emerald-500/20', 'bg-emerald-400', 'from-emerald-500/15', 'to-emerald-500/5',
    'text-orange-300', 'bg-orange-500/10', 'border-orange-500/20', 'bg-orange-400', 'from-orange-500/15', 'to-orange-500/5',
    'text-sky-300', 'bg-sky-500/10', 'border-sky-500/20', 'bg-sky-400', 'from-sky-500/15', 'to-sky-500/5',
    'text-violet-300', 'bg-violet-500/10', 'border-violet-500/20', 'bg-violet-400', 'from-violet-500/15', 'to-violet-500/5',
    'text-zinc-300', 'bg-zinc-500/10', 'border-zinc-500/20', 'bg-zinc-400', 'from-zinc-500/15', 'to-zinc-500/5',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#09090b',
          900: '#0c0c0f',
          850: '#131316',
          800: '#1a1a1f',
          750: '#222228',
          700: '#2a2a31',
          600: '#3a3a42',
          500: '#52525b',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'pop': 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16,185,129,0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(16,185,129,0.35)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3) translateY(20px)' },
          '50%': { opacity: '1', transform: 'scale(1.05) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        progressFill: {
          '0%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
