import type { Caso, Investigacao, Pista, Resultado } from './types'

// ===== Regras do jogo: custos =====
export const CUSTO = {
  coletar: 1,      // horas
  testar: 2,
  ajuda: 1,
  caos: 1,
  repAjuda: 5,     // reputação gasta ao pedir ajuda
} as const

export const XP_POR_NIVEL = 500

// Todas as funções são puras: recebem o estado e devolvem um novo.
// Isso deixa o motor fácil de testar e de salvar.

export function novaInvestigacao(caso: Caso): Investigacao {
  return {
    casoId: caso.id,
    tempoRestante: caso.tempoTotal,
    pistasReveladas: caso.pistas.filter(p => p.inicial).map(p => p.id),
    hipotesesTestadas: [],
    devsConsultados: [],
    caosInvestigados: [],
    conexoesFeitas: [],
    teoria: null,
    diario: [`Caso #${caso.id} aberto. Você tem ${caso.tempoTotal}h para investigar.`],
    repGasta: 0,
  }
}

export const pista = (caso: Caso, id: string): Pista => {
  const p = caso.pistas.find(x => x.id === id)
  if (!p) throw new Error(`Pista inexistente: ${id}`)
  return p
}

const revelar = (inv: Investigacao, id?: string) =>
  id && !inv.pistasReveladas.includes(id) ? [...inv.pistasReveladas, id] : inv.pistasReveladas

const gastar = (inv: Investigacao, horas: number) => Math.max(0, inv.tempoRestante - horas)

export const podeAgir = (inv: Investigacao, horas: number) => !inv.finalizado && inv.tempoRestante >= horas

// ----- Ações -----

export function coletarPista(caso: Caso, inv: Investigacao): Investigacao {
  const proxima = caso.ordemColeta.find(id => !inv.pistasReveladas.includes(id))
  if (!proxima || !podeAgir(inv, CUSTO.coletar)) return inv
  return {
    ...inv,
    tempoRestante: gastar(inv, CUSTO.coletar),
    pistasReveladas: revelar(inv, proxima),
    diario: [...inv.diario, `Nova pista: ${pista(caso, proxima).titulo}.`],
  }
}

export function testarHipotese(caso: Caso, inv: Investigacao, hipId: string): Investigacao {
  const h = caso.hipoteses.find(x => x.id === hipId)
  if (!h || inv.hipotesesTestadas.includes(hipId) || !podeAgir(inv, CUSTO.testar)) return inv
  return {
    ...inv,
    tempoRestante: gastar(inv, CUSTO.testar),
    hipotesesTestadas: [...inv.hipotesesTestadas, hipId],
    pistasReveladas: revelar(inv, h.teste.revela),
    diario: [...inv.diario, `Teste — ${h.texto}: ${h.teste.resultado}`],
  }
}

export function pedirAjuda(caso: Caso, inv: Investigacao, devId: string): Investigacao {
  const d = caso.devs.find(x => x.id === devId)
  if (!d || inv.devsConsultados.includes(devId) || !podeAgir(inv, CUSTO.ajuda)) return inv
  return {
    ...inv,
    tempoRestante: gastar(inv, CUSTO.ajuda),
    repGasta: inv.repGasta + CUSTO.repAjuda,
    devsConsultados: [...inv.devsConsultados, devId],
    pistasReveladas: revelar(inv, d.revela),
    diario: [...inv.diario, `${d.nome}: "${d.fala}"`],
  }
}

export function investigarCaos(caso: Caso, inv: Investigacao, caosId: string): Investigacao {
  const c = caso.caos.find(x => x.id === caosId)
  if (!c || inv.caosInvestigados.includes(caosId) || !podeAgir(inv, CUSTO.caos)) return inv
  return {
    ...inv,
    tempoRestante: gastar(inv, CUSTO.caos),
    caosInvestigados: [...inv.caosInvestigados, caosId],
    pistasReveladas: revelar(inv, c.revela),
    diario: [...inv.diario, `${c.titulo}: ${c.resultado}`],
  }
}

export const chaveConexao = (a: string, b: string) => [a, b].sort().join('|')

/** Conectar duas pistas no quadro é grátis. Retorna o insight, se a conexão for significativa. */
export function conectar(caso: Caso, inv: Investigacao, a: string, b: string): { inv: Investigacao; insight: string | null } {
  const chave = chaveConexao(a, b)
  if (a === b || inv.conexoesFeitas.includes(chave)) return { inv, insight: null }
  const c = caso.conexoes.find(x => chaveConexao(...x.pistas) === chave)
  if (!c) return { inv, insight: null }
  return {
    inv: { ...inv, conexoesFeitas: [...inv.conexoesFeitas, chave], diario: [...inv.diario, `Conexão: ${c.insight}`] },
    insight: c.insight,
  }
}

export const definirTeoria = (inv: Investigacao, hipId: string | null): Investigacao => ({ ...inv, teoria: hipId })

// ----- Confiança na teoria: calculada a partir das evidências reveladas -----

export function confianca(caso: Caso, inv: Investigacao, hipId: string): number {
  let valor = 20
  for (const id of inv.pistasReveladas) {
    const p = pista(caso, id)
    if (p.apoia?.includes(hipId)) valor += 15
    if (p.refuta?.includes(hipId)) valor -= 30
  }
  return Math.max(0, Math.min(100, valor))
}

// ----- Fim do caso -----

export function finalizar(caso: Caso, inv: Investigacao, hipId: string, recId: string): Investigacao {
  const h = caso.hipoteses.find(x => x.id === hipId)!
  const r = caso.recomendacoes.find(x => x.id === recId)!
  const detalhes: Resultado['detalhes'] = []

  detalhes.push({ label: h.correta ? 'Causa raiz correta' : 'Causa raiz errada', valor: h.correta ? 25 : -15 })
  const pontosAcao = { melhor: 15, parcial: 5, ruim: -10 }[r.qualidade]
  detalhes.push({ label: `Recomendação ${r.qualidade}`, valor: pontosAcao })
  // Acertar no chute não vale: a eficiência só conta se a decisão tiver evidências.
  const baseadaEmEvidencia = confianca(caso, inv, hipId) >= 60
  if (h.correta && baseadaEmEvidencia && inv.tempoRestante > 0) detalhes.push({ label: `Eficiência (${inv.tempoRestante}h sobrando)`, valor: inv.tempoRestante * 2 })
  if (h.correta && !baseadaEmEvidencia) detalhes.push({ label: 'Palpite sem evidência suficiente', valor: -10 })
  if (inv.conexoesFeitas.length) detalhes.push({ label: `Conexões no quadro (${inv.conexoesFeitas.length})`, valor: inv.conexoesFeitas.length * 2 })
  if (inv.repGasta) detalhes.push({ label: 'Ajuda do time', valor: -inv.repGasta })

  const deltaRep = detalhes.reduce((s, d) => s + d.valor, 0)
  const xp = (h.correta ? 120 : 40) + inv.conexoesFeitas.length * 20 + inv.pistasReveladas.length * 5
    + (h.correta && baseadaEmEvidencia ? inv.tempoRestante * 10 : 0)

  return {
    ...inv,
    finalizado: {
      hipoteseId: hipId,
      recomendacaoId: recId,
      acertouCausa: h.correta,
      qualidadeAcao: r.qualidade,
      deltaRep,
      xp,
      detalhes,
    },
  }
}

// ----- Progressão -----

export const nivel = (xp: number) => Math.floor(xp / XP_POR_NIVEL) + 1

export function titulo(reputacao: number): string {
  if (reputacao >= 900) return 'QA Lendário'
  if (reputacao >= 800) return 'Investigador Sênior'
  if (reputacao >= 700) return 'Analista Confiável'
  if (reputacao >= 600) return 'Analista'
  return 'Estagiário de QA'
}
