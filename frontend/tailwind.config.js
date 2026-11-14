/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'), card: v('card'), ink: v('ink'), soft: v('soft'),
        forest: v('forest'), 'forest-hover': v('forest-hover'), 'on-forest': v('on-forest'),
        leaf: v('leaf'), sage: v('sage'), mist: v('mist'), haze: v('haze'), line: v('line'),
        amber: v('amber'), 'amber-soft': v('amber-soft'), rust: v('rust'),
        dim: v('dim'), up: v('up'), down: v('down'), thriving: v('thriving'), stable: v('stable'), struggling: v('struggling'),
        critical: v('critical'), zero: v('zero'),
      },
      fontFamily: {
        serif: ['"DM Sans Variable"', '"DM Sans Fallback"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', '"DM Sans Fallback"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['"DM Sans Variable"', '"DM Sans Fallback"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '10px', md: '14px', lg: '20px' },
      boxShadow: {
        paper: 'inset 0 1px 0 rgb(var(--ink) / 0.07)',
        lift: 'inset 0 1px 0 rgb(var(--ink) / 0.08), 0 40px 80px -30px rgb(0 0 0 / 0.8)',
      },
    },
  },
  plugins: [],
}
