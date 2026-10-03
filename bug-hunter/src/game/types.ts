// ===== Conteúdo de um caso (vem do JSON em src/cases) =====

export type TipoPista = 'relato' | 'log' | 'metrica' | 'email' | 'ambiente' | 'config' | 'comparacao' | 'codigo' | 'requisito'

export interface Pista {
  id: string
  tipo: TipoPista
  titulo: string
  texto: string[]          // linhas exibidas no cartão
  hora?: string            // "10:41" → entra na linha do tempo
  evento?: string          // rótulo curto para a linha do tempo
  inicial?: boolean        // já começa revelada
  apoia?: string[]         // ids de hipóteses que esta pista fortalece
  refuta?: string[]        // ids de hipóteses que esta pista enfraquece
}

export interface Hipotese {
  id: string
  texto: string
  correta: boolean
  feedback: string         // mostrado no fim do caso
  teste: {                 // o que acontece ao "Testar hipótese"
    resultado: string
    revela?: string        // id de pista revelada pelo teste
  }
}

export interface Dev {
  id: string
  nome: string
  cargo: string
  tracos: string[]
  fala: string
  revela?: string
  confiavel: boolean       // dica honesta ou enviesada
}

export interface EventoCaos {
  id: string
  titulo: string
  relatos: number
  resultado: string
  revela?: string          // um evento "ruído" pode, na verdade, ser sintoma!
}

export interface Conexao {
  pistas: [string, string]
  insight: string
}

export interface Recomendacao {
  id: string
  texto: string
  qualidade: 'melhor' | 'parcial' | 'ruim'
  feedback: string
}

export type Plataforma = 'web' | 'app' | 'backend' | 'ci'

export interface Caso {
  id: number
  plataforma?: Plataforma
  titulo: string
  subtitulo: string
  citacao: string
  autorCitacao?: string    // padrão: "Cliente via chat"
  impacto: 'BAIXO' | 'MÉDIO' | 'ALTO'
  inicio: string
  ambiente: string
  objetivo: string
  tempoTotal: number       // orçamento de horas da investigação
  ordemColeta: string[]    // ordem em que "Coletar pistas" revela
  pistas: Pista[]
  hipoteses: Hipotese[]
  devs: Dev[]
  caos: EventoCaos[]
  conexoes: Conexao[]
  recomendacoes: Recomendacao[]
  licao: string            // a moral do caso, mostrada no final
}

// ===== Estado da partida (vai para o save) =====

export interface Investigacao {
  casoId: number
  tempoRestante: number
  pistasReveladas: string[]
  hipotesesTestadas: string[]
  devsConsultados: string[]
  caosInvestigados: string[]
  conexoesFeitas: string[]       // chave "a|b" ordenada
  teoria: string | null          // hipótese marcada como teoria atual
  diario: string[]               // mensagens do que aconteceu
  repGasta: number               // reputação gasta pedindo ajuda
  treino?: boolean               // caso já resolvido antes: não altera o perfil
  finalizado?: Resultado
}

export interface Resultado {
  hipoteseId: string
  recomendacaoId: string
  acertouCausa: boolean
  qualidadeAcao: Recomendacao['qualidade']
  deltaRep: number
  xp: number
  detalhes: { label: string; valor: number }[]
}

export interface Perfil {
  reputacao: number
  xp: number
  casosResolvidos: number
  acertos: number
}

export interface EntradaHistorico {
  casoId: number
  correto: boolean
  deltaRep: number
  resumo: string
  data: string
}

export interface Save {
  versao: 1
  perfil: Perfil
  historico: EntradaHistorico[]
  emAndamento: Record<number, Investigacao>
}
