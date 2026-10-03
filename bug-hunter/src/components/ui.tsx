import type { ReactNode } from 'react'
import type { Perfil } from '../game/types'
import { XP_POR_NIVEL, nivel, titulo } from '../game/engine'

export function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="4" />
        <line x1="29" y1="29" x2="42" y2="42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M14 18c2-4 10-4 12 0M15 23h10" stroke="var(--red)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <div>
        <div className="logo-title">BUG HUNTER</div>
        <div className="logo-sub">LEGADO DE DECISÕES</div>
      </div>
    </div>
  )
}

export function Status({ perfil }: { perfil: Perfil }) {
  const nv = nivel(perfil.xp)
  const xpNoNivel = perfil.xp % XP_POR_NIVEL
  return (
    <div className="status">
      <div className="status-rep">
        <span className="label">Reputação QA</span>
        <strong>{perfil.reputacao}</strong>
        <span className="muted small">{titulo(perfil.reputacao)}</span>
      </div>
      <div className="status-nivel">
        <span className="label">Nível {nv}</span>
        <div className="bar"><div style={{ width: `${(xpNoNivel / XP_POR_NIVEL) * 100}%` }} /></div>
        <span className="muted small">{xpNoNivel} / {XP_POR_NIVEL} XP</span>
      </div>
    </div>
  )
}

export function Card({ titulo, sub, children, className = '' }: { titulo?: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {titulo && <h2>{titulo}</h2>}
      {sub && <p className="card-sub">{sub}</p>}
      {children}
    </section>
  )
}

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar?: () => void; children: ReactNode }) {
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          {onFechar && <button className="x" onClick={onFechar} aria-label="Fechar">✕</button>}
        </div>
        {children}
      </div>
    </div>
  )
}
