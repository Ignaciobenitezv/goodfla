/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        fontFamily: {
        sans: ['var(--font-barlow)', 'var(--font-montserrat)', 'sans-serif'],
      },
      colors: {
        marca: {
          beige: '#ecd5d1',
          piedra: '#c6b1a2',
          crema: '#f1ece6',
          gris: '#272727',
          blanco: '#FFFFFF',
          amarillo: '#f9d541',
          grisg: '#66666',
          negro: '#000000',
        },
      },
    },
  },
  plugins: [],
}
