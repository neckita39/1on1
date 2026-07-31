/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
        b24: ['"Work Sans"', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#0075FF', hover: '#0065DE' },
        link: { DEFAULT: '#0154C8', hover: '#003C93' },
        success: '#1BCE7B',
        warning: '#FAA72C',
        alert: '#FF5752',
        ai: { DEFAULT: '#853AF5', bg: '#F7F1FE', border: '#EADCFD', text: '#5B22B0' },
        cyan24: '#2FC6F6',
        night: { DEFAULT: '#0A1B33', text: '#8FA6C4', muted: '#5D7692' },
        page: '#F6FAFB',
        'blue-tint': { light: '#F8FBFF', DEFAULT: '#EAF3FF', deep: '#DCEBFF' },
        'gray-tint': { light: '#F4F7FA', DEFAULT: '#EEF3F7', deep: '#F0F4F7' },
        ink: { DEFAULT: '#333333', 2: '#525C69', 3: '#828B95', 4: '#A5AEB8' },
        line: { less: '#F7F7F7', DEFAULT: '#F0F0F0', accent: '#E2E2E2' },
        'hover-border': { DEFAULT: '#D8E8FF', deep: '#CFE3FF' },
        'gray-el': { DEFAULT: '#D5DDE5', deep: '#DCE4EA', handle: '#C9D3DC' },
      },
      borderRadius: {
        pill: '512px',
      },
      transitionTimingFunction: {
        spec: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
}
