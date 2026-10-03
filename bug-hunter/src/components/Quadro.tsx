import { useLayoutEffect, useRef, useState } from 'react'
import type { Caso, Investigacao, Pista } from '../game/types'
import { chaveConexao, conectar, pista } from '../game/engine'

const ICONE: Record<Pista['tipo'], string> = {
  relato: '💬', log: '🗂️', metrica: '📈', email: '✉️', ambiente: '🌐', config: '⚙️', comparacao: '⚖️', codigo: '🧩', requisito: '📋',
}

interface Props {
  caso: Caso
  inv: Investigacao
  onChange: (inv: Investigacao) => void
  avisar: (texto: string, tipo?: 'ok' | 'info' | 'erro') => void
}

/** Quadro de pistas: clique em uma pista e depois em outra para ligá-las com um fio. */
export function Quadro({ caso, inv, onChange, avisar }: Props) {
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const area = useRef<HTMLDivElement>(null)
  const cartoes = useRef<Record<string, HTMLDivElement | null>>({})
  const [linhas, setLinhas] = useState<{ x1: number; y1: number; x2: number; y2: number; k: string }[]>([])

  // Recalcula a posição dos fios sempre que o quadro muda de tamanho ou ganha pistas/conexões.
  useLayoutEffect(() => {
    const calcular = () => {
      const base = area.current?.getBoundingClientRect()
      if (!base) return
      const centro = (id: string) => {
        const r = cartoes.current[id]?.getBoundingClientRect()
        return r ? { x: r.left - base.left + r.width / 2, y: r.top - base.top + 18 } : null
      }
      setLinhas(
        inv.conexoesFeitas.flatMap(k => {
          const [a, b] = k.split('|')
          const pa = centro(a), pb = centro(b)
          return pa && pb ? [{ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, k }] : []
        }),
      )
    }
    calcular()
    const ro = new ResizeObserver(calcular)
    if (area.current) ro.observe(area.current)
    return () => ro.disconnect()
  }, [inv.conexoesFeitas, inv.pistasReveladas])

  function clicar(id: string) {
    if (inv.finalizado) return
    if (!selecionada) return setSelecionada(id)
    if (selecionada === id) return setSelecionada(null)
    const chave = chaveConexao(selecionada, id)
    if (inv.conexoesFeitas.includes(chave)) avisar('Essas pistas já estão conectadas.', 'info')
    else {
      const r = conectar(caso, inv, selecionada, id)
      if (r.insight) { onChange(r.inv); avisar(`🔗 ${r.insight}`, 'ok') }
      else avisar('Essas duas pistas não parecem se explicar. Tente outra combinação.', 'info')
    }
    setSelecionada(null)
  }

  return (
    <div className="quadro" ref={area}>
      <svg className="fios" aria-hidden="true">
        {linhas.map(l => <line key={l.k} {...l} />)}
      </svg>
      {inv.pistasReveladas.map((id, i) => {
        const p = pista(caso, id)
        const ultima = i === inv.pistasReveladas.length - 1 && i > 0
        return (
          <div
            key={id}
            ref={el => { cartoes.current[id] = el }}
            className={`pista tipo-${p.tipo} ${selecionada === id ? 'sel' : ''} ${ultima ? 'nova' : ''}`}
            style={{ rotate: `${((i * 37) % 5) - 2}deg` }}
            onClick={() => clicar(id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && clicar(id)}
          >
            <span className="alfinete" />
            <h3>{ICONE[p.tipo]} {p.titulo}</h3>
            {p.texto.map((t, j) => <p key={j} className={/TIMEOUT|✘|→/.test(t) ? 'destaque' : ''}>{t}</p>)}
          </div>
        )
      })}
      {inv.pistasReveladas.length < 3 && (
        <div className="pista vazia">Use <b>Coletar mais pistas</b> para preencher o quadro.</div>
      )}
    </div>
  )
}
