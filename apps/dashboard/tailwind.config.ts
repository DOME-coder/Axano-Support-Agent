import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1b1b1f',
        accent: '#4f8cff',
      },
    },
  },
  plugins: [],
};

export default config;
