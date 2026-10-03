# Bug Hunter: Legado de Decisões

Jogo de investigação de bugs cujo objetivo é treinar o pensamento crítico. Em cada caso você coleta
pistas, testa hipóteses, separa fatos de opiniões enviesadas e de ruído, e recomenda uma ação com
base em evidências, não em palpites. Roda 100% no navegador e é publicado no GitHub Pages.

## Rodar localmente

```bash
npm install
npm run dev          # abre em http://localhost:5173/bug-hunter/
npm run validate     # valida os casos (Python 3, só biblioteca padrão)
npm run build        # gera dist/ (o que vai para o GitHub Pages)
npm run build:single # gera dist-single/index.html, um arquivo único para jogar offline
```


## Estrutura

```
src/
  cases/317.json        ← conteúdo dos casos (só dados)
  game/types.ts         ← formato de um caso e do save
  game/engine.ts        ← regras do jogo (funções puras)
  game/save.ts          ← persistência: localStorage + exportar/importar
  game/cases.ts         ← carrega todos os JSON de src/cases
  components/           ← telas (React)
tools/validate_cases.py ← validador em Python (roda no CI)
.github/workflows/      ← deploy automático
GAME_DESIGN.md          ← como o jogo funciona
```

## Criar um caso novo
1. Copie `src/cases/317.json` para `src/cases/<id>.json` e edite.
2. Rode `npm run validate` até passar.
3. `git push`. O caso aparece no mural automaticamente.

## Como funciona a pontuação

O jogo tem dois contadores separados: **Reputação** e **XP**.

| | O que mede | Como muda |
|---|---|---|
| **Reputação** | A qualidade das suas decisões | Sobe ou desce a cada caso |
| **XP** | O quanto você já investigou e aprendeu | Só sobe |

### Reputação

Todo jogador começa com **600** de reputação. Ao fim de cada caso, ela muda assim:

| Item | Pontos |
|---|---|
| Causa raiz correta | +25 |
| Causa raiz errada | −15 |
| Recomendação melhor | +15 |
| Recomendação parcial | +5 |
| Recomendação ruim | −10 |
| Cada conexão certa entre pistas no quadro | +2 |
| Cada hora que sobrou (só se acertou com evidência) | +2 |
| Acertou a causa no chute (confiança abaixo de 60%) | −10 |
| Cada dev consultado ("Solicitar ajuda ao time") | −5 |

A reputação define o seu título:

| Reputação | Título |
|---|---|
| Abaixo de 600 | Estagiário de QA |
| 600 a 699 | Analista |
| 700 a 799 | Analista Confiável |
| 800 a 899 | Investigador Sênior |
| 900 ou mais | QA Lendário |

### XP e níveis

| Item | XP |
|---|---|
| Acertou a causa raiz | 120 |
| Errou a causa raiz | 40 |
| Cada pista revelada no quadro | +5 |
| Cada conexão certa entre pistas | +20 |
| Cada hora que sobrou (só se acertou com evidência) | +10 |

O XP se acumula entre as partidas. A cada **500 XP** você sobe um nível, e a barra recomeça do zero. Como um caso rende entre 150 e 270 XP, dá para subir um nível a cada 2 ou 3 casos.

### Confiança na teoria

Ao marcar uma hipótese como teoria, o jogo calcula a sua confiança a partir das pistas reveladas: começa em 20%, ganha **+15** por pista que apoia a teoria e perde **30** por pista que a contradiz. Uma evidência contrária pesa mais que uma a favor, porque basta uma para derrubar uma teoria.

Se você acertar a causa com confiança abaixo de 60%, o jogo entende que foi palpite: perde 10 de reputação e não ganha o bônus das horas que sobraram.

### Pontuação máxima

Cada caso tem o seu máximo, entre **+48 e +52** de reputação e entre **235 e 270** de XP. Não dá para tirar o máximo dos dois na mesma partida:

- **Reputação** premia a investigação eficiente: poucas ações certeiras e tempo sobrando.
- **XP** premia a investigação completa: muitas pistas reveladas e conectadas.

### Modo treino

Jogar de novo um caso já resolvido é **modo treino**: você vê o resultado, mas a reputação e o XP não mudam.

## Progresso do jogador

Salvo automaticamente no `localStorage` a cada ação. Continua salvo ao fechar o navegador; só se perde
se o jogador limpar os dados do navegador, usar modo anônimo ou trocar de dispositivo. Para isso existe
**Progresso → Exportar/Importar** (arquivo ou código `BH1.`).

Toda leitura e gravação passa por `carregarProgresso()` e `salvarProgresso()` em `src/game/save.ts`.
Para sincronizar na nuvem no futuro, basta trocar o corpo dessas duas funções.
