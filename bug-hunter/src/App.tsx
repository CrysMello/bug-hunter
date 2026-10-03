import { useEffect, useState } from 'react'
import type { Investigacao, Save } from './game/types'
import { carregarProgresso, salvarProgresso } from './game/save'
import { buscarCaso } from './game/cases'
import { novaInvestigacao } from './game/engine'
import { Painel } from './components/Painel'
import { TelaCaso } from './components/TelaCaso'

export default function App() {
  const [save, setSave] = useState<Save>(carregarProgresso)
  const [casoAberto, setCasoAberto] = useState<number | null>(null)
  const [salvou, setSalvou] = useState(true)

  // Autosave: toda mudança de estado vai para o navegador.
  useEffect(() => { setSalvou(salvarProgresso(save)) }, [save])

  const caso = casoAberto != null ? buscarCaso(casoAberto) : undefined

  function abrir(id: number, reiniciar = false) {
    const c = buscarCaso(id)
    if (!c) return
    setSave(s => {
      const atual = s.emAndamento[id]
      if (atual && !atual.finalizado && !reiniciar) return s // continua de onde parou
      const treino = s.historico.some(h => h.casoId === id)
      return { ...s, emAndamento: { ...s.emAndamento, [id]: { ...novaInvestigacao(c), treino } } }
    })
    setCasoAberto(id)
  }

  function atualizar(inv: Investigacao) {
    setSave(s => ({ ...s, emAndamento: { ...s.emAndamento, [inv.casoId]: inv } }))
  }

  /** Aplica o resultado ao perfil. Rejogar um caso já resolvido é "modo treino": não altera a reputação. */
  function concluir(inv: Investigacao) {
    const r = inv.finalizado!
    setSave(s => {
      const emAndamento = { ...s.emAndamento, [inv.casoId]: inv } // mantém o resultado visível
      if (inv.treino) return { ...s, emAndamento }
      return {
        ...s,
        emAndamento,
        perfil: {
          reputacao: Math.max(0, s.perfil.reputacao + r.deltaRep),
          xp: s.perfil.xp + r.xp,
          casosResolvidos: s.perfil.casosResolvidos + 1,
          acertos: s.perfil.acertos + (r.acertouCausa ? 1 : 0),
        },
        historico: [
          {
            casoId: inv.casoId,
            correto: r.acertouCausa,
            deltaRep: r.deltaRep,
            resumo: buscarCaso(inv.casoId)!.hipoteses.find(h => h.id === r.hipoteseId)!.texto,
            data: new Date().toISOString(),
          },
          ...s.historico,
        ],
      }
    })
  }

  if (caso && save.emAndamento[caso.id]) {
    return (
      <TelaCaso
        caso={caso}
        inv={save.emAndamento[caso.id]}
        perfil={save.perfil}
        historico={save.historico}
        onChange={atualizar}
        onConcluir={concluir}
        onSair={() => setCasoAberto(null)}
        onRejogar={() => abrir(caso.id, true)}
      />
    )
  }

  return <Painel save={save} salvou={salvou} onAbrir={abrir} onImportar={setSave} />
}
