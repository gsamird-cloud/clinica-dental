/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16302E',
        pine: '#0E4B44',
        pine2: '#146B60',
        sage: '#E7EFE9',
        sand: '#F6F3EC',
        clay: '#C96A4B',
        clayLight: '#F0DCD3',
        line: '#DDE4DE',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
    },
  },
  plugins: [],
}
