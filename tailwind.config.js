/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#173B3E',
        pine: '#0E8388',
        pine2: '#14A3A0',
        sage: '#E3F4F1',
        sand: '#F5FAFA',
        clay: '#E8734A',
        clayLight: '#FBE4D9',
        line: '#D8E8E7',
      },
      fontFamily: {
        display: ['"Quicksand"', 'sans-serif'],
        body: ['"Nunito"', 'sans-serif'],
        sans: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
}
