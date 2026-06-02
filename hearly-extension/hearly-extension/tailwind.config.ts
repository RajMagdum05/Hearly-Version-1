import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hearly: {
          bg: '#000000',
          surface: '#141414',
          raised: '#1A1A1A',
          panel: '#16181D',
          border: '#222222',
          accent: '#B5F03D',
          purple: '#8B5CF6',
          'accent-glow': 'rgba(181,240,61,0.08)',
          text: '#F0F0F0',
          secondary: '#9CA3AF',
          tertiary: '#555555',
          danger: '#E05252',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'wave-bar': 'waveBar 1.2s ease-in-out infinite',
        'wave-bar-calm': 'waveBarCalm 1.5s ease-in-out infinite',
        /** Enrolled home — slow, smooth undulation (scaleY + stagger) */
        'wave-bar-flow': 'waveBarFlow 2.35s cubic-bezier(0.45, 0.05, 0.25, 1) infinite',
        'wave-idle-calm': 'waveIdleCalm 3.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        /** Enrolled home — horizontal dot pulse strip */
        'hearly-dot-wave': 'hearlyDotWave 1.65s cubic-bezier(0.45, 0.05, 0.25, 1) infinite',
        'hearly-dot-idle': 'hearlyDotIdle 2.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'hearly-logo-bar': 'hearlyLogoBar 0.95s ease-in-out infinite',
        'wave-inactive': 'waveInactiveSubtle 3.8s ease-in-out infinite',
        /** Version line: discrete typographic states (variable Inter), not a breathe loop */
        'hearly-version': 'hearlyVersionSnap 6.8s linear infinite',
      },
      keyframes: {
        waveBar: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '20px' },
        },
        waveBarCalm: {
          '0%, 100%': { height: '5px' },
          '50%': { height: '15px' },
        },
        waveBarFlow: {
          '0%, 100%': { transform: 'scaleY(0.36)', opacity: '0.88' },
          '22%': { transform: 'scaleY(0.58)', opacity: '0.94' },
          '44%': { transform: 'scaleY(0.88)', opacity: '1' },
          '62%': { transform: 'scaleY(0.7)', opacity: '1' },
          '82%': { transform: 'scaleY(0.52)', opacity: '0.92' },
        },
        waveIdleCalm: {
          '0%, 100%': { transform: 'scaleY(0.44)', opacity: '0.58' },
          '50%': { transform: 'scaleY(0.6)', opacity: '0.78' },
        },
        hearlyDotWave: {
          '0%, 100%': { transform: 'scale(0.55)', opacity: '0.4' },
          '50%': { transform: 'scale(1)', opacity: '1' },
        },
        hearlyDotIdle: {
          '0%, 100%': { transform: 'scale(0.68)', opacity: '0.35' },
          '50%': { transform: 'scale(1)', opacity: '0.68' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        hearlyLogoBar: {
          '0%, 100%': { transform: 'scaleY(0.34)' },
          '50%': { transform: 'scaleY(1)' },
        },
        /** Dim home “off” bars — transform-based for smooth, low-energy motion */
        waveInactiveSubtle: {
          '0%, 100%': { transform: 'scaleY(0.38)' },
          '50%': { transform: 'scaleY(0.88)' },
        },
        hearlyVersionSnap: {
          '0%, 17%': {
            fontVariationSettings: "'wght' 470",
            letterSpacing: '0.12em',
          },
          '18%, 35%': {
            fontVariationSettings: "'wght' 680",
            letterSpacing: '0.02em',
          },
          '36%, 53%': {
            fontVariationSettings: "'wght' 520",
            letterSpacing: '0.09em',
          },
          '54%, 71%': {
            fontVariationSettings: "'wght' 640",
            letterSpacing: '0.035em',
          },
          '72%, 89%': {
            fontVariationSettings: "'wght' 500",
            letterSpacing: '0.11em',
          },
          '90%, 100%': {
            fontVariationSettings: "'wght' 470",
            letterSpacing: '0.12em',
          },
        },
      },
      boxShadow: {
        'hearly-glow': '0 0 32px rgba(181, 240, 61, 0.08)',
        /** Subtle lime aura on CTA at rest (enrollment home) */
        'hearly-btn-ambient':
          '0 0 26px rgba(181, 240, 61, 0.14), 0 0 48px rgba(181, 240, 61, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        /** Subtle lime aura on mic tile (enrollment home) */
        'hearly-mic-ambient':
          '0 0 16px rgba(181, 240, 61, 0.13), 0 0 30px rgba(181, 240, 61, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'hearly-card':
          '0 0 40px rgba(181, 240, 61, 0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
        'hearly-cta': '0 4px 24px rgba(181, 240, 61, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
