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
        primary: '#7100ad',
        'primary-foreground': '#ffffff',
        'nav-hover': '#7100ad',
        'nav-hover-bg': '#f8f4fc',
        'header-bg': '#ffffff',
        'header-border': '#e2e8f0',
        'drawer-bg': '#ffffff',
        'overlay-bg': 'rgba(15, 23, 42, 0.8)',
      },
    },
  },
  plugins: [],
}