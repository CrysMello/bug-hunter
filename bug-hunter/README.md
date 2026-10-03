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

## Progresso do jogador

Salvo automaticamente no `localStorage` a cada ação. Continua salvo ao fechar o navegador; só se perde
se o jogador limpar os dados do navegador, usar modo anônimo ou trocar de dispositivo. Para isso existe
**Progresso → Exportar/Importar** (arquivo ou código `BH1.`).

Toda leitura e gravação passa por `carregarProgresso()` e `salvarProgresso()` em `src/game/save.ts`.
Para sincronizar na nuvem no futuro, basta trocar o corpo dessas duas funções.
