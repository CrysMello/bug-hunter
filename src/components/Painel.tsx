import { useState } from 'react'
import type { Save } from '../game/types'
import { CASOS, PLATAFORMA } from '../game/cases'
import { titulo } from '../game/engine'
import { apagarProgresso, baixarArquivo, exportarCodigo, importarCodigo, saveInicial } from '../game/save'
import { Card, Logo, Modal, Status } from './ui'

interface Props {
  save: Save
  salvou: boolean
  onAbrir: (id: number) => void
  onImportar: (s: Save) => void
}

const EM_BREVE = [
  { id: 329, titulo: 'O frete que só erra no Norte' },
]

export function Painel({ save, salvou, onAbrir, onImportar }: Props) {
  const { perfil, historico } = save
  const [menuSave, setMenuSave] = useState(false)
  const precisao = perfil.casosResolvidos ? Math.round((perfil.acertos / perfil.casosResolvidos) * 100) : 0
  const primeiraVez = perfil.casosResolvidos === 0 && Object.keys(save.emAndamento).length === 0

  return (
    <div className="app">
      <header className="topo">
        <Logo />
        <Status perfil={perfil} />
        <button className="btn-ghost" onClick={() => setMenuSave(true)}>💾 Progresso</button>
      </header>

      {!salvou && <div className="aviso erro">Este navegador não permite salvar (modo anônimo?). Use “Progresso → Exportar” antes de sair.</div>}
      {primeiraVez && salvou && (
        <div className="aviso">Seu progresso é salvo automaticamente neste navegador. Para jogar em outro dispositivo, use <b>Progresso → Exportar</b>.</div>
      )}

      <main className="painel">
        <Card titulo="Mural de casos" sub="Escolha um incidente para investigar." className="casos">
          <div className="lista-casos">
            {CASOS.map(c => {
              const inv = save.emAndamento[c.id]
              const andamento = inv && !inv.finalizado
              const feito = historico.find(h => h.casoId === c.id)
              return (
                <button key={c.id} className="caso-item" onClick={() => onAbrir(c.id)}>
                  <span className="caso-num">#{c.id}</span>
                  <span className="caso-nome">{c.titulo}{c.plataforma && <span className="plataforma">{PLATAFORMA[c.plataforma]}</span>}</span>
                  <span className="caso-sub">{c.subtitulo}</span>
                  <span className={`tag ${andamento ? 'amber' : feito ? (feito.correto ? 'green' : 'red') : 'blue'}`}>
                    {andamento ? `Em andamento · ${inv.tempoRestante}h restantes` : feito ? (feito.correto ? 'Resolvido ✔ · jogar de novo' : 'Errou · tentar de novo') : `Impacto ${c.impacto} · Novo`}
                  </span>
                </button>
              )
            })}
            {EM_BREVE.map(c => (
              <div key={c.id} className="caso-item bloqueado">
                <span className="caso-num">#{c.id}</span>
                <span className="caso-nome">{c.titulo}</span>
                <span className="tag">🔒 Em breve</span>
              </div>
            ))}
          </div>
        </Card>

        <Card titulo="Sua reputação QA" className="perfil">
          <div className="escudo">🛡️</div>
          <div className="perfil-titulo">{titulo(perfil.reputacao)}</div>
          <p className="muted">Casos resolvidos: {perfil.casosResolvidos} · Precisão: {precisao}%</p>
          <div className="como-jogar">
            <h3>Como jogar</h3>
            <ol>
              <li>Cada caso tem um orçamento de <b>horas</b>. Toda ação gasta tempo.</li>
              <li><b>Colete pistas</b> e <b>conecte</b> as que se relacionam no quadro (grátis).</li>
              <li>Marque uma <b>teoria</b> e <b>teste</b>. A confiança muda com as evidências.</li>
              <li>Pedir <b>ajuda ao time</b> custa reputação, e nem todo dev é imparcial.</li>
              <li>Cuidado com o <b>Modo Caos</b>: alguns relatos são ruído, outros são sintomas.</li>
              <li><b>Recomende a ação</b>: causa raiz + o que fazer. Sem chance de desfazer.</li>
            </ol>
          </div>
        </Card>

        <Card titulo="Histórico de decisões" className="historico">
          {historico.length === 0 && <p className="muted">Nenhuma decisão ainda. Seu primeiro caso espera por você.</p>}
          <ul className="hist">
            {historico.map((h, i) => (
              <li key={i} className={h.correto ? 'ok' : 'nok'}>
                <b>Caso #{h.casoId}</b>
                <span>{h.correto ? 'Correto' : 'Incorreto'}</span>
                <span className="pts">{h.deltaRep >= 0 ? '+' : ''}{h.deltaRep} rep</span>
                <span className="muted">{h.resumo}</span>
              </li>
            ))}
          </ul>
        </Card>
      </main>

      {menuSave && <MenuSave save={save} onImportar={onImportar} onFechar={() => setMenuSave(false)} />}
    </div>
  )
}

function MenuSave({ save, onImportar, onFechar }: { save: Save; onImportar: (s: Save) => void; onFechar: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState('')
  const [apagando, setApagando] = useState(false)

  async function copiar() {
    const c = exportarCodigo(save)
    try { await navigator.clipboard.writeText(c); setMsg('Código copiado! Cole no outro dispositivo.') }
    catch { setCodigo(c); setMsg('Copie o código abaixo:') }
  }

  function importar(texto: string) {
    try { onImportar(importarCodigo(texto)); setMsg('Progresso importado ✔') }
    catch { setMsg('Não consegui ler esse código ou arquivo.') }
  }

  return (
    <Modal titulo="Seu progresso" onFechar={onFechar}>
      <p className="muted">O jogo salva sozinho neste navegador. Para levar a outro dispositivo, exporte aqui e importe lá.</p>
      <div className="linha-botoes">
        <button className="btn" onClick={() => baixarArquivo(save)}>⬇ Baixar arquivo</button>
        <button className="btn" onClick={copiar}>📋 Copiar código</button>
        <label className="btn">
          ⬆ Importar arquivo
          <input type="file" accept=".json,application/json" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) importar(await f.text()) }} />
        </label>
      </div>
      <textarea placeholder="…ou cole aqui um código BH1." value={codigo} onChange={e => setCodigo(e.target.value)} rows={3} />
      <div className="linha-botoes">
        <button className="btn" disabled={!codigo.trim()} onClick={() => importar(codigo)}>Importar código</button>
        {apagando
          ? <button className="btn perigo" onClick={() => { apagarProgresso(); onImportar(saveInicial()); setApagando(false); setMsg('Progresso apagado.') }}>Confirmar: apagar tudo</button>
          : <button className="btn perigo" onClick={() => { setApagando(true); setMsg('Clique de novo para confirmar. Isso não pode ser desfeito.') }}>Apagar progresso</button>}
      </div>
      {msg && <p className="msg">{msg}</p>}
    </Modal>
  )
}
