import type { Investigacao, Save } from './types'

// Ponto único de persistência. Hoje grava no navegador (localStorage);
// no futuro, troque o corpo destas funções para gravar na nuvem sem mexer no jogo.

const CHAVE = 'bughunter.save.v1'

export const saveInicial = (): Save => ({
  versao: 1,
  perfil: { reputacao: 600, xp: 0, casosResolvidos: 0, acertos: 0 },
  historico: [],
  emAndamento: {},
})

export function carregarProgresso(): Save {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? validar(JSON.parse(bruto)) : saveInicial()
  } catch {
    return saveInicial() // modo anônimo, dados bloqueados ou save corrompido
  }
}

export function salvarProgresso(save: Save): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(save))
    return true
  } catch {
    return false
  }
}

export function apagarProgresso() {
  try { localStorage.removeItem(CHAVE) } catch { /* nada a fazer */ }
}

// ----- Exportar / importar (levar o save para outro dispositivo) -----

/** Código compacto para copiar e colar (JSON → base64, com suporte a acentos). */
export function exportarCodigo(save: Save): string {
  const bytes = new TextEncoder().encode(JSON.stringify(save))
  let bin = ''
  bytes.forEach(b => (bin += String.fromCharCode(b)))
  return 'BH1.' + btoa(bin)
}

export function importarCodigo(codigo: string): Save {
  const limpo = codigo.trim()
  if (limpo.startsWith('{')) return validar(JSON.parse(limpo)) // aceita o arquivo .json colado
  if (!limpo.startsWith('BH1.')) throw new Error('Código inválido')
  const bin = atob(limpo.slice(4))
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return validar(JSON.parse(new TextDecoder().decode(bytes)))
}

export function baixarArquivo(save: Save) {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bughunter-save.json'
  a.click()
  URL.revokeObjectURL(url)
}

function validar(dados: unknown): Save {
  const s = dados as Partial<Save>
  if (!s || s.versao !== 1 || typeof s.perfil?.reputacao !== 'number') throw new Error('Save inválido')
  return {
    versao: 1,
    perfil: s.perfil,
    historico: Array.isArray(s.historico) ? s.historico : [],
    emAndamento: (s.emAndamento ?? {}) as Record<number, Investigacao>,
  }
}
