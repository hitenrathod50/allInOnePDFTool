/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",          // scans all EJS files
    "./public/**/*.js",          // if you use JS files with classes
    "./src/**/*.js",          // if you use JS files with classes
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00006a',
        secondary : '#00004b',
        'light':'#dbdbe954',
        'primary-foreground': '#ffffff',
        'nav-hover': '#7100ad',
        'nav-hover-bg': 'rgba(244, 244, 255, 0.61)',
        'header-bg': '#ffffff',
        'header-border': '#e2e8f0',
        'drawer-bg': '#ffffff',
        'overlay-bg': 'rgba(15, 23, 42, 0.8)',
      },

      screens: {
        md: '980px',
        cst : '1235px',
        lgd: '1700px'
      },

      fontSize: {
        'fluid-sm': 'clamp(0.875rem, 1.5vw, 1rem)',
        'fluid-base': 'clamp(1rem, 2vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 2.5vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 3vw, 1.5rem)',
        'lg':'1.050rem',
      },

    },
  },
  plugins: [],
}