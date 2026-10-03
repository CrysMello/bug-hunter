import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// GitHub Pages publica em https://<usuario>.github.io/<repo>/
// Troque "bug-hunter" pelo nome do seu repositório.
// `npm run build:single` gera um único index.html (útil para testar offline).
export default defineConfig(({ mode }) => ({
  base: mode === 'single' ? './' : '/bug-hunter/',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}))
