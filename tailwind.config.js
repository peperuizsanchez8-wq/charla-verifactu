export default {
  content: ['./app.html', './*.{js,jsx}'],
  theme: { extend: {
    colors: { ink:'#1d2a33', brand:{ DEFAULT:'#0f6e66', dark:'#0b524c', soft:'#e2f1ef' }, sand:'#f6f4ef' },
    fontFamily: { sans:['Inter','system-ui','sans-serif'], display:['"DM Serif Display"','Georgia','serif'] }
  } },
  plugins: []
}
