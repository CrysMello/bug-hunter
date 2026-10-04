// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { CASOS } from './game/cases'
import { confianca, finalizar, novaInvestigacao } from './game/engine'
import { exportarCodigo, importarCodigo, saveInicial } from './game/save'

// jsdom não tem ResizeObserver
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never

const caso = CASOS.find(c => c.id === 317)!
const clicar = (nome: RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }))

describe('motor', () => {
  it('chute certo sem evidência é penalizado', () => {
    const r = finalizar(caso, novaInvestigacao(caso), 'h_fila', 'r_completo').finalizado!
    expect(r.detalhes.some(d => d.label.includes('Palpite'))).toBe(true)
  })
  it('evidência contrária derruba a confiança', () => {
    const inv = { ...novaInvestigacao(caso), pistasReveladas: ['relato_cliente', 'deploy_v134'] }
    expect(confianca(caso, inv, 'h_codigo')).toBe(0)
  })
  it('exportar e importar preservam o save (com acentos)', () => {
    const s = { ...saveInicial(), historico: [{ casoId: 1, correto: true, deltaRep: 5, resumo: 'configuração', data: '' }] }
    expect(importarCodigo(exportarCodigo(s))).toEqual(s)
  })
})

describe('partida completa', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('investiga, conecta pistas, recomenda e atualiza o perfil salvo', () => {
    render(<App />)
    fireEvent.click(screen.getByText('O pedido que sumiu'))

    for (let i = 0; i < 3; i++) clicar(/Coletar mais pistas/)
    fireEvent.click(screen.getByLabelText(/Timeout na fila após mudança/))
    clicar(/Testar essa teoria/)
    expect(document.querySelector('.quadro')!.textContent).toContain('Histórico de configuração')

    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Histórico de configuração'))
    fireEvent.click(cartao('Log do sistema'))
    expect(document.querySelector('.toast')!.textContent).toContain('3000ms')

    // tempo: 8 - 3 (coletas) - 2 (teste) = 3h
    expect(screen.getByText(/^3h/)).toBeTruthy()

    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Reverter o timeout para 30s/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))

    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
    const salvo = JSON.parse(localStorage.getItem('bughunter.save.v1')!)
    expect(salvo.perfil.casosResolvidos).toBe(1)
    expect(salvo.perfil.reputacao).toBeGreaterThan(600)
  })

  it('continua de onde parou depois de recarregar', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByText('O pedido que sumiu'))
    clicar(/Coletar mais pistas/)
    unmount()

    render(<App />)
    expect(screen.getByText(/Em andamento · 7h restantes/)).toBeTruthy()
  })
})

describe('todos os casos', () => {
  it.each(CASOS.map(c => [c.id, c] as const))('caso #%i é vencível com evidência', (_id, c) => {
    const tudo = { ...novaInvestigacao(c), pistasReveladas: c.pistas.map(p => p.id) }
    const certa = c.hipoteses.find(h => h.correta)!
    expect(confianca(c, tudo, certa.id)).toBeGreaterThanOrEqual(60)
    for (const h of c.hipoteses.filter(h => !h.correta)) expect(confianca(c, tudo, h.id)).toBeLessThan(60)
  })
})

describe('caso 318', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('pedir ajuda à PO e testar a teoria leva à causa certa', () => {
    render(<App />)
    fireEvent.click(screen.getByText('O desconto fantasma'))
    clicar(/Coletar mais pistas/)
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Carla/ }))
    expect(document.querySelector('.quadro')!.textContent).toContain('História de usuário #482')

    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Log do checkout'))
    fireEvent.click(cartao('História de usuário'))
    expect(document.querySelector('.toast')!.textContent).toContain('primeira compra')

    fireEvent.click(screen.getByLabelText(/regras diferentes para "primeira compra"/))
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Definir a regra com a PO/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
    clicar(/Voltar ao mural/)
    expect(screen.getByText(/Resolvido ✔/)).toBeTruthy()
  })
})

describe('caso 319', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('o evento de caos revela um sintoma e a teoria do fuso fecha o caso', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Funciona na minha máquina'))
    expect(screen.getByText(/Gerente da loja Centro/)).toBeTruthy()

    clicar(/Coletar mais pistas/)
    clicar(/Coletar mais pistas/)
    const caos = screen.getByText('Cupom fiscal com horário adiantado').closest('li')!
    fireEvent.click(within(caos as HTMLElement).getByRole('button', { name: /Investigar/ }))
    expect(document.querySelector('.quadro')!.textContent).toContain('Cupom com horário errado')

    fireEvent.click(screen.getByLabelText(/fuso horário da máquina/))
    clicar(/Testar essa teoria/)
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Cupom com horário errado'))
    fireEvent.click(cartao('Ambiente: local x container'))
    expect(document.querySelector('.toast')!.textContent).toContain('Três horas')

    // linha do tempo do 319 usa a escala da noite (21:00–23:30)
    expect(document.querySelector('.eixo')!.textContent).toContain('21:00')
    expect(document.querySelector('.eixo')!.textContent).not.toContain('10:00')

    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Tornar o fuso explícito/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})

describe('caso 320', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('quarentenar o teste é um diagnóstico errado; a corrida resolve', () => {
    const c = CASOS.find(x => x.id === 320)!
    const ruim = finalizar(c, novaInvestigacao(c), 'h_ordem', 'r_quarentena').finalizado!
    expect(ruim.acertouCausa).toBe(false)
    expect(ruim.deltaRep).toBeLessThan(0)

    render(<App />)
    fireEvent.click(screen.getByText('O teste que às vezes passa'))
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Júlia/ }))
    fireEvent.click(screen.getByLabelText(/Condição de corrida/))
    clicar(/Testar essa teoria/)
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Código da reserva'))
    fireEvent.click(cartao('Reservas: em paralelo'))
    expect(document.querySelector('.toast')!.textContent).toContain('ambas vendem')

    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Segurar a release/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})

describe('caso 321 (app)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('aparece como app no mural e o retry sem idempotência fecha o caso', () => {
    render(<App />)
    const item = screen.getByText('O e-mail que chegou em dobro').closest('button')!
    expect(item.textContent).toContain('📱 App')
    fireEvent.click(item)

    clicar(/Coletar mais pistas/)
    clicar(/Coletar mais pistas/)
    clicar(/Coletar mais pistas/)
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Felipe/ }))
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Log da API'))
    fireEvent.click(cartao('Configuração da biblioteca'))
    expect(document.querySelector('.toast')!.textContent).toContain('retry manda de novo')

    fireEvent.click(screen.getByLabelText(/reenvia o pedido quando a rede oscila/))
    clicar(/Testar essa teoria/)
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Criar chave de idempotência/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
    expect(screen.queryByText(/Palpite sem evidência/)).toBeNull()
  })
})

describe('caso 322 (app, acessibilidade)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('a dica do SAC e o teste com fonte grande levam à causa', () => {
    render(<App />)
    fireEvent.click(screen.getByText('A tela que ninguém consegue usar'))
    clicar(/Coletar mais pistas/)
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Sônia/ }))
    fireEvent.click(screen.getByLabelText(/não se adapta à fonte grande/))
    clicar(/Testar essa teoria/)

    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('O truque do SAC'))
    fireEvent.click(cartao('fonte padrão x fonte grande'))
    expect(document.querySelector('.toast')!.textContent).toContain('gatilho')

    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Voltar a tela antiga pela feature flag agora/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })

  it('culpar o usuário dá diagnóstico errado', () => {
    const c = CASOS.find(x => x.id === 322)!
    const r = finalizar(c, novaInvestigacao(c), 'h_usuario', 'r_tutorial').finalizado!
    expect(r.acertouCausa).toBe(false)
    expect(r.qualidadeAcao).toBe('ruim')
  })
})

describe('caso 323 (app, migração)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('o tema resetado é sintoma e o teste de atualização confirma a causa', () => {
    render(<App />)
    fireEvent.click(screen.getByText('A atualização que apagou os favoritos'))
    for (let i = 0; i < 4; i++) clicar(/Coletar mais pistas/)
    const caos = screen.getByText('Tema do app voltou para o claro sozinho').closest('li')!
    fireEvent.click(within(caos as HTMLElement).getByRole('button', { name: /Investigar/ }))

    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Preferências de volta'))
    fireEvent.click(cartao('Log do app'))
    expect(document.querySelector('.toast')!.textContent).toContain('banco inteiro')

    fireEvent.click(screen.getByLabelText(/quem pulou versões/))
    clicar(/Testar essa teoria/)
    expect(document.querySelector('.relogio strong')!.textContent).toMatch(/^1h/)  // 8h - 4 coletas - caos (1h) - teste (2h)

    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Pausar a distribuição da 6.1 nas lojas, publicar/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})

describe('caso 324 (site, notificações)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('o SRE revela o alerta cego e o painel do provedor confirma a cota', () => {
    render(<App />)
    const item = screen.getByText('A notificação que nunca chega').closest('button')!
    expect(item.textContent).toContain('🌐 Site')
    fireEvent.click(item)

    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Vitor/ }))
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Fábio/ }))
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Alerta de e-mails'))
    fireEvent.click(cartao('Código de envio'))
    expect(document.querySelector('.toast')!.textContent).toContain('nunca poderia tocar')

    fireEvent.click(screen.getByLabelText(/esgotou a cota diária/))
    clicar(/Testar essa teoria/)
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Ampliar a cota agora/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
    // ajuda do time custa reputação
    expect(screen.getByText('Ajuda do time')).toBeTruthy()
  })
})

describe('caso 325 (app, bateria)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('a marketing revela o changelog e o teste em segundo plano aponta o SDK', () => {
    render(<App />)
    fireEvent.click(screen.getByText('O app que descarrega a bateria'))
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Gustavo/ }))
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Mariana/ }))
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Bibliotecas atualizadas'))
    fireEvent.click(cartao('Changelog do GeoAds'))
    expect(document.querySelector('.toast')!.textContent).toContain('ninguém leu')

    fireEvent.click(screen.getByLabelText(/biblioteca de terceiros atualizada/))
    clicar(/Testar essa teoria/)
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Desligar a coleta em segundo plano/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
    expect(screen.queryByText(/Palpite sem evidência/)).toBeNull()
  })
})

describe('caso 326 (volume)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('a DBA mostra as consultas repetidas e a contagem confirma a causa', () => {
    render(<App />)
    fireEvent.click(screen.getByText('O relatório que trava às segundas'))
    clicar(/Coletar mais pistas/)
    clicar(/Coletar mais pistas/)
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Beatriz/ }))
    fireEvent.click(screen.getByLabelText(/uma consulta por venda/))
    clicar(/Testar essa teoria/)
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Log do relatório'))
    fireEvent.click(cartao('Consultas por tamanho'))
    expect(document.querySelector('.toast')!.textContent).toContain('85s')
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Buscar os clientes de uma vez só/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})

describe('caso 327 (paginação)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('setas falam cursor, números falam page', () => {
    render(<App />)
    fireEvent.click(screen.getByText('A paginação que só anda pelas setas'))
    clicar(/Coletar mais pistas/)
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Camila/ }))
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Código da paginação'))
    fireEvent.click(cartao('Console do navegador'))
    expect(document.querySelector('.toast')!.textContent).toContain('língua nova')

    fireEvent.click(screen.getByLabelText(/trocou a paginação por página por cursor/))
    clicar(/Testar essa teoria/)
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/Devolver o suporte a page/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})

describe('caso 328 (arredondamento)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('os números do caso são os que o computador realmente produz', () => {
    expect(Math.trunc(80.10 * 100)).toBe(8009)
    expect(Math.trunc(19.99 * 100)).toBe(1998)
    expect(Math.trunc(89.70 * 100)).toBe(8970)
    expect(Math.trunc(116.85 * 100)).toBe(11685)
    expect(Math.round(80.10 * 100)).toBe(8010)
  })

  it('o QA revela os testes redondos e a conta no computador confirma a causa', () => {
    render(<App />)
    fireEvent.click(screen.getByText('O centavo que não fecha'))
    clicar(/Solicitar ajuda ao time/)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Yuri/ }))
    fireEvent.click(screen.getByLabelText(/corta em vez de arredondar/))
    clicar(/Testar essa teoria/)
    const cartao = (t: string) => [...document.querySelectorAll('.quadro .pista')].find(e => e.textContent!.includes(t))!
    fireEvent.click(cartao('Testes da integração'))
    fireEvent.click(cartao('A conta no computador'))
    expect(document.querySelector('.toast')!.textContent).toContain('escondem o bug')
    clicar(/Recomendar ação/)
    const modal = screen.getByRole('dialog')
    fireEvent.click(within(modal).getByLabelText(/centavos inteiros/))
    fireEvent.click(within(modal).getByRole('button', { name: /Confirmar/ }))
    expect(screen.getByText(/Caso resolvido/)).toBeTruthy()
  })
})
