import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
// Entrada de desarrollo: app.html. El build genera un único HTML autocontenido
// que se copia a index.html en la raíz (lo que sirve GitHub Pages).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { rollupOptions: { input: 'app.html' } }
})
