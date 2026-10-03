import type { Caso, Plataforma } from './types'

// Todos os arquivos src/cases/*.json entram no build automaticamente.
// Para criar um caso novo: adicione o JSON e rode `npm run validate`.
const arquivos = import.meta.glob<{ default: Caso }>('../cases/*.json', { eager: true })

export const CASOS: Caso[] = Object.values(arquivos)
  .map(m => m.default)
  .sort((a, b) => a.id - b.id)

export const buscarCaso = (id: number) => CASOS.find(c => c.id === id)

export const PLATAFORMA: Record<Plataforma, string> = {
  web: '🌐 Site',
  app: '📱 App',
  backend: '🖥️ Sistema interno',
  ci: '⚙️ CI / Testes',
}
