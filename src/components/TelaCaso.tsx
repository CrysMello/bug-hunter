import { useEffect, useState } from 'react'
import type { Caso, EntradaHistorico, Investigacao, Perfil } from '../game/types'
import { CUSTO, coletarPista, confianca, definirTeoria, finalizar, investigarCaos, pedirAjuda, pista, podeAgir, testarHipotese } from '../game/engine'
import { Card, Logo, Modal, Status } from './ui'
import { Quadro } from './Quadro'

interface Props {
  caso: Caso
  inv: Investigacao
  perfil: Perfil
  historico: EntradaHistorico[]
  onChange: (inv: Investigacao) => void
  onConcluir: (inv: Investigacao) => void
  onSair: () => void
  onRejogar: () => void
}

type ModalAberto = 'testar' | 'ajuda' | 'recomendar' | null

export function TelaCaso({ caso, inv, perfil, historico, onChange, onConcluir, onSair, onRejogar }: Props) {
  const [modal, setModal] = useState<ModalAberto>(null)
  const [toast, setToast] = useState<{ texto: string; tipo: string; id: number } | null>(null)

  const avisar = (texto: string, tipo: 'ok' | 'info' | 'erro' = 'info') => setToast({ texto, tipo, id: Date.now() })
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const semTempo = inv.tempoRestante === 0
  const acabouColeta = caso.ordemColeta.every(id => inv.pistasReveladas.includes(id))
  const conf = inv.teoria ? confianca(caso, inv, inv.teoria) : 0
  const teoria = caso.hipoteses.find(h => h.id === inv.teoria)

  function agir(novo: Investigacao, msg: string) {
    if (novo === inv) return
    onChange(novo)
    avisar(msg, 'ok')
  }

  return (
    <div className="app">
      <header className="topo">
        <Logo />
        <Status perfil={perfil} />
        <button className="btn-ghost" onClick={onSair}>← Mural de casos</button>
      </header>

      <div className="banner">
        <h1>CASO #{caso.id}: “{caso.titulo.toUpperCase()}”</h1>
        <p>{caso.subtitulo}</p>
        {inv.treino && <span className="tag blue">Modo treino · não altera sua reputação</span>}
      </div>

      <main className="grade">
        {/* ===== Linha 1 ===== */}
        <Card titulo="Resumo do caso" className="resumo">
          <blockquote>“{caso.citacao}”<cite>— {caso.autorCitacao ?? 'Cliente via chat'}</cite></blockquote>
          <dl>
            <dt>Impacto</dt><dd className="red">{caso.impacto}</dd>
            <dt>Início</dt><dd>{caso.inicio}</dd>
            <dt>Ambiente</dt><dd className="blue">{caso.ambiente}</dd>
          </dl>
          <h3>Seu objetivo</h3>
          <p className="muted">{caso.objetivo}</p>
          <div className={`relogio ${inv.tempoRestante <= 2 ? 'pouco' : ''}`}>
            <span>⏱ Tempo restante</span>
            <strong>{inv.tempoRestante}h <small>/ {caso.tempoTotal}h</small></strong>
            <div className="bar"><div style={{ width: `${(inv.tempoRestante / caso.tempoTotal) * 100}%` }} /></div>
          </div>
        </Card>

        <Card titulo="Quadro de pistas" sub="Clique em duas pistas para ligá-las. Conexões certas revelam insights (grátis)." className="quadro-card">
          <Quadro caso={caso} inv={inv} onChange={onChange} avisar={avisar} />
        </Card>

        <Card titulo="Sua investigação" className="investigacao">
          <h3>Teoria atual</h3>
          <p className="teoria">{teoria ? teoria.texto : 'Marque uma hipótese abaixo como sua teoria.'}</p>
          {teoria && (
            <>
              <div className="conf-label">Confiança: <b>{conf}%</b></div>
              <div className="bar conf"><div style={{ width: `${conf}%` }} /></div>
            </>
          )}
          <h3>Hipóteses</h3>
          <ul className="hipoteses">
            {caso.hipoteses.map(h => (
              <li key={h.id}>
                <label>
                  <input type="radio" name="teoria" checked={inv.teoria === h.id} onChange={() => onChange(definirTeoria(inv, h.id))} disabled={!!inv.finalizado} />
                  <span>{h.texto}</span>
                </label>
                {inv.hipotesesTestadas.includes(h.id) && <span className="testada" title={h.teste.resultado}>testada</span>}
              </li>
            ))}
          </ul>
          <button className="btn primario" disabled={!teoria || inv.hipotesesTestadas.includes(teoria.id) || !podeAgir(inv, CUSTO.testar)}
            onClick={() => teoria && agir(testarHipotese(caso, inv, teoria.id), teoria.teste.resultado)}>
            Testar essa teoria · {CUSTO.testar}h
          </button>
        </Card>

        {/* ===== Linha 2 ===== */}
        <Card titulo="Linha do tempo" sub="Eventos das pistas que você revelou." className="timeline-card">
          <LinhaDoTempo caso={caso} inv={inv} />
        </Card>

        <Card titulo="Perfil dos devs envolvidos" sub={`Cada dev tem seu estilo. Pedir ajuda custa ${CUSTO.repAjuda} de reputação e ${CUSTO.ajuda}h.`} className="devs">
          <div className="devs-lista">
            {caso.devs.map(d => {
              const consultado = inv.devsConsultados.includes(d.id)
              return (
                <div key={d.id} className="dev">
                  <div className="avatar">{d.nome[0]}</div>
                  <b>{d.nome}</b>
                  <span className="muted small">{d.cargo}</span>
                  <div className="tracos">{d.tracos.map(t => <span key={t} className="tag">{t}</span>)}</div>
                  {consultado
                    ? <p className="fala">“{d.fala}”</p>
                    : <button className="btn" disabled={!podeAgir(inv, CUSTO.ajuda)} onClick={() => agir(pedirAjuda(caso, inv, d.id), `${d.nome} respondeu. Veja o card dele.`)}>Perguntar</button>}
                </div>
              )
            })}
          </div>
        </Card>

        <Card titulo="🌀 Modo caos ativo" sub="Outros relatos chegando. Nem tudo tem relação com o caso." className="caos">
          <ul className="caos-lista">
            {caso.caos.map(c => {
              const visto = inv.caosInvestigados.includes(c.id)
              return (
                <li key={c.id}>
                  <div><b>{c.titulo}</b><span className="muted small">({c.relatos} relatos)</span></div>
                  {visto
                    ? <p className={c.revela ? 'achado' : 'muted'}>{c.resultado}</p>
                    : <button className="btn mini" disabled={!podeAgir(inv, CUSTO.caos)} onClick={() => agir(investigarCaos(caso, inv, c.id), c.resultado)}>Investigar · {CUSTO.caos}h</button>}
                </li>
              )
            })}
          </ul>
          <p className="muted small">Dica: foque no que tem maior impacto.</p>
        </Card>

        {/* ===== Linha 3 ===== */}
        <Card titulo="Diário da investigação" className="diario">
          <ol>{[...inv.diario].reverse().map((d, i) => <li key={i}>{d}</li>)}</ol>
          {historico.length > 0 && <p className="muted small">Casos anteriores: {historico.length}</p>}
        </Card>

        <Card titulo="Escolha sua ação" sub="Toda decisão tem consequência. Pense como um QA sênior." className="acoes">
          {semTempo && !inv.finalizado && <div className="aviso erro">⏰ O tempo acabou. Hora de recomendar uma ação com o que você tem.</div>}
          <div className="acoes-grade">
            <button className="acao amarela" disabled={acabouColeta || !podeAgir(inv, CUSTO.coletar)}
              onClick={() => agir(coletarPista(caso, inv), 'Nova pista no quadro!')}>
              Coletar mais pistas<small>{acabouColeta ? 'nada novo por aqui' : `${CUSTO.coletar}h · novas evidências`}</small>
            </button>
            <button className="acao azul" disabled={!podeAgir(inv, CUSTO.testar)} onClick={() => setModal('testar')}>
              Testar uma hipótese<small>{CUSTO.testar}h · clareza</small>
            </button>
            <button className="acao roxa" disabled={!podeAgir(inv, CUSTO.ajuda)} onClick={() => setModal('ajuda')}>
              Solicitar ajuda ao time<small>−{CUSTO.repAjuda} rep · informação</small>
            </button>
            <button className="acao vermelha" disabled={!!inv.finalizado} onClick={() => setModal('recomendar')}>
              Recomendar ação<small>encerra o caso</small>
            </button>
          </div>
        </Card>
      </main>

      {modal === 'testar' && (
        <Modal titulo="Qual hipótese você quer testar?" onFechar={() => setModal(null)}>
          <div className="opcoes">
            {caso.hipoteses.map(h => (
              <button key={h.id} className="opcao" disabled={inv.hipotesesTestadas.includes(h.id)}
                onClick={() => { agir(testarHipotese(caso, inv, h.id), h.teste.resultado); setModal(null) }}>
                {h.texto}{inv.hipotesesTestadas.includes(h.id) && ' · já testada'}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'ajuda' && (
        <Modal titulo="Pedir ajuda para quem?" onFechar={() => setModal(null)}>
          <p className="muted">Cada pergunta custa {CUSTO.repAjuda} de reputação. E lembre: cada dev vê o problema do seu jeito.</p>
          <div className="opcoes">
            {caso.devs.map(d => (
              <button key={d.id} className="opcao" disabled={inv.devsConsultados.includes(d.id)}
                onClick={() => { agir(pedirAjuda(caso, inv, d.id), `${d.nome}: “${d.fala}”`); setModal(null) }}>
                <b>{d.nome}</b> · {d.cargo}{inv.devsConsultados.includes(d.id) && ' · já consultado'}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'recomendar' && (
        <Recomendar caso={caso} inv={inv} onFechar={() => setModal(null)}
          onConfirmar={(h, r) => { const fim = finalizar(caso, inv, h, r); setModal(null); onConcluir(fim) }} />
      )}

      {inv.finalizado && <TelaResultado caso={caso} inv={inv} onSair={onSair} onRejogar={onRejogar} />}

      {toast && <div key={toast.id} className={`toast ${toast.tipo}`} onClick={() => setToast(null)}>{toast.texto}</div>}
    </div>
  )
}

function LinhaDoTempo({ caso, inv }: { caso: Caso; inv: Investigacao }) {
  const minutos = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }
  const eventos = inv.pistasReveladas.map(id => pista(caso, id)).filter(p => p.hora).sort((a, b) => minutos(a.hora!) - minutos(b.hora!))
  // A escala usa todos os horários do caso (não só os revelados), para os eventos não "pularem" de lugar.
  const horas = caso.pistas.filter(p => p.hora).map(p => minutos(p.hora!))
  const ini = Math.floor(Math.min(...horas, 600) / 30) * 30
  const fim = Math.max(ini + 60, Math.ceil((Math.max(...horas, 600) + 10) / 30) * 30)
  const passo = fim - ini <= 60 ? 10 : fim - ini <= 180 ? 30 : 60
  const pos = (h: string) => Math.min(100, Math.max(0, ((minutos(h) - ini) / (fim - ini)) * 100))
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const marcas = Array.from({ length: (fim - ini) / passo + 1 }, (_, i) => fmt(ini + i * passo))
  return (
    <div className="timeline">
      <div className="eixo">
        {marcas.map(m => <span key={m} className="marca" style={{ left: `${pos(m)}%` }}>{m}</span>)}
      </div>
      <div className="eventos">
        {eventos.length === 0 && <p className="muted small">Nenhum evento com horário ainda.</p>}
        {eventos.map((p, i) => (
          <div key={p.id} className={`evento tipo-${p.tipo}`} style={{ left: `${pos(p.hora!)}%`, top: `${(i % 3) * 52}px` }}>
            <b>{p.hora}</b>{p.evento}
          </div>
        ))}
      </div>
    </div>
  )
}

function Recomendar({ caso, inv, onFechar, onConfirmar }: { caso: Caso; inv: Investigacao; onFechar: () => void; onConfirmar: (h: string, r: string) => void }) {
  const [h, setH] = useState(inv.teoria ?? '')
  const [r, setR] = useState('')
  return (
    <Modal titulo="Recomendação final" onFechar={onFechar}>
      <p className="muted">Esta decisão encerra o caso e entra no seu histórico. Não dá para desfazer.</p>
      <h3>1. Qual é a causa raiz?</h3>
      <div className="opcoes">
        {caso.hipoteses.map(x => (
          <label key={x.id} className={`opcao ${h === x.id ? 'marcada' : ''}`}>
            <input type="radio" name="causa" checked={h === x.id} onChange={() => setH(x.id)} /> {x.texto}
            <span className="muted small"> · confiança {confianca(caso, inv, x.id)}%</span>
          </label>
        ))}
      </div>
      <h3>2. O que o time deve fazer?</h3>
      <div className="opcoes">
        {caso.recomendacoes.map(x => (
          <label key={x.id} className={`opcao ${r === x.id ? 'marcada' : ''}`}>
            <input type="radio" name="rec" checked={r === x.id} onChange={() => setR(x.id)} /> {x.texto}
          </label>
        ))}
      </div>
      <button className="btn primario grande" disabled={!h || !r} onClick={() => onConfirmar(h, r)}>Confirmar recomendação</button>
    </Modal>
  )
}

function TelaResultado({ caso, inv, onSair, onRejogar }: { caso: Caso; inv: Investigacao; onSair: () => void; onRejogar: () => void }) {
  const res = inv.finalizado!
  const h = caso.hipoteses.find(x => x.id === res.hipoteseId)!
  const r = caso.recomendacoes.find(x => x.id === res.recomendacaoId)!
  const certa = caso.hipoteses.find(x => x.correta)!
  return (
    <Modal titulo={res.acertouCausa ? '✅ Caso resolvido!' : '❌ Diagnóstico incorreto'}>
      <div className={`resultado ${res.acertouCausa ? 'ok' : 'nok'}`}>
        <h3>Causa raiz: {h.texto}</h3>
        <p>{h.feedback}</p>
        {!res.acertouCausa && <p><b>A causa real:</b> {certa.texto}. {certa.feedback}</p>}
        <h3>Recomendação ({res.qualidadeAcao})</h3>
        <p>{r.feedback}</p>
        <table className="placar">
          <tbody>
            {res.detalhes.map(d => <tr key={d.label}><td>{d.label}</td><td className={d.valor >= 0 ? 'pos' : 'neg'}>{d.valor >= 0 ? '+' : ''}{d.valor}</td></tr>)}
            <tr className="total"><td>Reputação</td><td>{res.deltaRep >= 0 ? '+' : ''}{res.deltaRep}</td></tr>
            <tr className="total"><td>XP</td><td>+{res.xp}</td></tr>
          </tbody>
        </table>
        {inv.treino && <p className="muted small">Modo treino: o resultado não alterou seu perfil.</p>}
        <div className="licao"><b>Lição do caso</b><p>{caso.licao}</p></div>
        <div className="linha-botoes">
          <button className="btn primario" onClick={onSair}>Voltar ao mural</button>
          <button className="btn" onClick={onRejogar}>Jogar de novo (treino)</button>
        </div>
      </div>
    </Modal>
  )
}
