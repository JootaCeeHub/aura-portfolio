module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          50: '#f5f7ff',
          100: '#eef2ff',
          500: '#6c7cff',
          700: '#3b46b0'
        }
      }
    }
  },
  plugins: []
};
