import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F5F0',
        surface: '#FFFFFF',
        surface2: '#F0EDE6',
        border: '#E2DDD4',
        border2: '#CEC9BE',
        text1: '#1A1916',
        text2: '#6B6760',
        text3: '#A09D98',
        green: { DEFAULT: '#2D5A27', bg: '#EAF2E8' },
        red: { DEFAULT: '#8B2020', bg: '#F5EAEA' },
        amber: { DEFAULT: '#7A4A0A', bg: '#FAF0E0' },
        blue: { DEFAULT: '#1A3A5C', bg: '#E8F0F8' },
        purple: { DEFAULT: '#3D2B6B', bg: '#EEEAF5' },
        teal: { DEFAULT: '#1A4A40', bg: '#E6F2F0' },
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      borderRadius: {
        card: '12px',
        sm: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
