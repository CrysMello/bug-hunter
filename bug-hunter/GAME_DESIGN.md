# Game Design: como o Bug Hunter funciona

## A fantasia

Você é o QA chamado quando algo dá errado em produção. O jogo não testa se você sabe programar;
testa se você **investiga com método**: junta evidências antes de concluir, desconfia de opiniões,
separa sintoma de ruído e recomenda algo que resolve agora **e** impede que volte.

## O loop de um caso

```
Abrir caso → [ Coletar · Testar · Perguntar · Investigar caos · Conectar ]* → Recomendar → Resultado
                         └──────── cada ação gasta horas ────────┘
```

1. **Briefing**: relato do cliente, impacto, ambiente e uma pista inicial no quadro.
2. **Investigação** com um orçamento de horas (8h no Caso #317).
3. **Recomendação final**: escolher a causa raiz **e** a ação. Não tem volta.
4. **Resultado**: feedback de cada escolha, pontuação detalhada e a lição do caso.

## Ações e custos

| Ação | Custo | O que faz |
|---|---|---|
| Coletar mais pistas | 1h | Revela a próxima pista da `ordemColeta` |
| Testar hipótese | 2h | Mostra o resultado do teste e revela uma pista ligada a ela |
| Pedir ajuda a um dev | 1h + 5 rep | O dev fala, e pode revelar uma pista. Nem todo dev é imparcial |
| Investigar evento de caos | 1h | A maioria é ruído; algum pode ser um **sintoma** do mesmo bug |
| Conectar duas pistas | grátis | Se a relação for real, gera um insight e bônus |
| Recomendar ação | encerra | Causa raiz + ação |

Quando as horas acabam, só sobra recomendar.

## Confiança na teoria

O jogador marca uma hipótese como teoria. A confiança é calculada a partir das pistas reveladas:
começa em 20%, **+15** por pista que apoia e **−30** por pista que refuta (refutar pesa mais: uma
evidência contrária derruba uma teoria). Isso ensina que confiança vem de evidência, não de intuição.

## Pontuação (reputação)

| Item | Pontos |
|---|---|
| Causa raiz correta / errada | +25 / −15 |
| Recomendação melhor / parcial / ruim | +15 / +5 / −10 |
| Eficiência (só se acertou com confiança ≥ 60%) | +2 por hora sobrando |
| Acertou no chute (confiança < 60%) | −10 |
| Cada conexão encontrada | +2 |
| Ajuda do time | −5 por pergunta |

XP sobe sempre (aprender também conta), mais quando acerta. A cada 500 XP, um nível.
Rejogar um caso já resolvido é **modo treino**: não altera o perfil, para não virar farm.

## Elementos que criam a tensão

- **Tempo**: investigar tudo é impossível; escolher o que investigar é a habilidade.
- **Devs com vieses**: João defende o próprio código e chuta o banco; Lucas causou o problema e
  minimiza. A informação vem misturada com opinião.
- **Modo caos**: relatos paralelos. Carrinho e cupom são ruído; o e-mail de boas-vindas é sintoma.
- **Pistas falsas plausíveis**: um deploy 2 minutos antes do incidente parece culpado, mas não é.
- **Recomendação em camadas**: corrigir a causa não basta; a melhor resposta também recupera quem foi
  afetado e cria teste e alerta.

## O que torna um bom caso (checklist para autores)

- Uma causa raiz clara e **alcançável** por pelo menos dois caminhos diferentes.
- Ao menos uma pista falsa plausível e um dev cuja opinião engana.
- Um evento de caos que parece ruído mas é sintoma.
- Hipóteses erradas com feedback que **ensina**, não só "errado".
- Uma recomendação "melhor" que vá além do conserto imediato.
- Uma lição de uma ou duas frases.

O `tools/validate_cases.py` checa automaticamente as regras estruturais (hipótese correta única,
pistas alcançáveis, referências válidas).

## Próximas ideias

- Casos 318 e 319 (já aparecem bloqueados no mural).
- Tipos de causa variados: processo, requisito mal entendido, dado de terceiros, flaky test.
- Conquistas ("resolveu sem pedir ajuda", "não caiu em nenhuma pista falsa").
- Gerador de casos com IA offline: um script Python que gera o JSON, e o validador garante a qualidade.
