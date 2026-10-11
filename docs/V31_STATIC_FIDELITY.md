# Homepage V3.1 — Static Fidelity

Implementação estática da Homepage V3.1 (Premium Product Storytelling) a partir do handoff congelado
`ziistec-v31-handoff` (`HANDOFF-V31.md`, `mkt-tokens.csv`, pranchas FROZEN e quadros de verificação 1024/768).
Esta fase **não** tem motion: nenhuma animação, observer, `requestAnimationFrame` ou scroll storytelling.

## Onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| `site/index.html` | Markup completo da V3.1, sprite SVG único, sem `style` inline (CSP `style-src 'self'`). |
| `site/v4/02-home.css` | Base compartilhada + páginas legais (inalteradas) e, abaixo, toda a homepage V3.1. |
| `site/v4/01-tokens.css` | Design System global `--zt-*` — **não foi alterado**. |
| `site/script.js` | Só o menu (abrir/fechar, Escape devolve o foco). O FAQ usa `<details>` nativo. |
| `scripts/check.mjs` | Gates da Fase 3 intactos + invariantes da V3.1 (abaixo). |

## Tokens `--mkt-*`

Camada local no escopo `.page-home`, exatamente como `mkt-tokens.csv`:
`≥1280` (padrão) · `@media (max-width:1279px)` · `@media (max-width:1023px)` · `@media (max-width:639px)` ·
`@media (min-width:1024px) and (max-height:760px)` (na coluna de altura, preço e margem seguem a largura).

## Breakpoints

| Largura | Hero | Fluxo | Planos |
|---|---|---|---|
| ≥ 1440 | título 100 px em 3 linhas, coluna de 340 px ao lado | 6 quadros de 900 px | 3 colunas, preço 76 |
| 1280–1439 | título 100 px; apoio e CTAs numa linha sob o título | idem, dispositivos em grupo | idem |
| 1024–1279 | título 84 px; apoio e CTAs sob o título; janela com trilho de ícones a 0,86 | quadros de 768 px, dispositivos ≤ 0,74 | preço 56 com “por mês” abaixo |
| altura ≤ 760 (≥1024) | título 68 px (2 linhas a partir de 1280, 3 abaixo), janela densa | quadros em 100vh, deslocamentos compactos | tokens da coluna de altura |
| 640–1023 | coluna única, janela de 688 px com trilho de ícones, celular sobre a faixa vazia | três cenas, sem cena fixa | cartões empilhados com 2 colunas internas |
| < 640 | Mobile V3.1 | três cenas do Mobile V3.1 | cartões empilhados |

Produto sempre reduzido em grupo por uma escala `--k`: fluida (`tan(atan2(100cqw …))` dentro de
`main{container-type:inline-size}`) quando o navegador suporta, com degraus fixos como fallback.

## Estruturas preparadas para a fase de motion

- `ol.flow-track[data-flow-track]` — os seis quadros do desktop em sequência; a altura total já é a da futura
  cena fixa (6 × altura de tela). A fase de motion prende um quadro (`position:sticky`) e troca o ativo.
- `li.flow-frame[data-flow-stage="1…6"][data-flow-place="office|field"]` — estado de cada etapa.
- `.rail.rail-p1…p6`, `.rail-stop.is-done|is-now` e `.rail-token[data-flow-object="os-0248"]` — o trilho e o
  token que vão animar.
- `[data-flow-object="os-0248"]` — a OS #0248 em cada dispositivo (janela, celular, cartões): o objeto que
  viaja escritório → campo → escritório.
- `.fd-win`, `.fd-win-back`, `.fd-phone`, `.fd-toast` — camadas do palco em coordenadas da prancha
  (origem 520, 196), prontas para transformar sem recompor.
- `article.flow-scene[data-flow-scene="office-01-02|field-03-04|office-05-06"]` — as três cenas abaixo de 1024.
- `.mk-hero-stage` com `.hero-win`, `.hero-phone`, `.hero-toast` posicionados separadamente — a sequência de
  entrada do hero só precisa animar `transform`/`opacity` dessas camadas.
- `--zt-motion-*`, `--zt-ease-*` e `--zt-rise*` já zeram em `prefers-reduced-motion` (01-tokens.css).

## Invariantes verificados pelo `npm run check`

Rótulos aprovados presentes (`Total do orçamento`, `03 · recebida`, `04 · em atendimento`,
`No escritório · proprietário`, `No campo · técnico`, `Etapas 01–02/03–04/05–06`, Escritório → Campo → Escritório);
nenhum “Cena A/B/C” publicado; nenhum R$ 2.420; nenhum valor em reais dentro do celular do técnico; seis
`data-flow-stage`, `data-flow-track` e as três `data-flow-scene`. Cada regra tem teste de mutação em
`scripts/tooling.test.mjs`.

## Diferenças em relação ao handoff

- Desktop sem motion: as seis etapas aparecem como seis quadros estáticos em sequência (a prancha mostrava um
  quadro fixo; a cena presa por 6 alturas de tela fica para a fase de motion).
- 1280–1439: a coluna lateral de 340 px não cabe ao lado do título de 100 px (≈ 885 px); apoio e CTAs descem
  para uma linha sob o título, a mesma solução aprovada para 1024.
- Textos de apoio das seções usam `--mkt-lead` (20 px em ≥ 1280); a prancha usava 19–22 px.
- Dúvidas: as 6 perguntas continuam `<details>` nativos (gate da Fase 3), com +/− por CSS.
- Rodapé usa “Privacidade” e “Termos”, como a prancha.

## V3.1.1 — Responsive Workflow Fix (etapas 05–06, abaixo de 1024)

Causa: o cartão “Histórico do cliente” era preso por `position:absolute; bottom:0` dentro de `.scene-device-c`, com
reserva fixa de 236 px (mobile) / 210 px (tablet), menor que a altura do cartão (274–292 px). O resumo da OS #0248
flui do topo de uma janela de altura fixa (540 px / 560 × `--kt`). Quando o conteúdo cresce (360) ou a janela é
reduzida (640–1023), o resumo chega à zona do cartão e R$ 2.000 / R$ 420 ficavam cobertos.

Regra (px de projeto; no tablet multiplicados por `--kt`):

- Janela do Financeiro = conteúdo + faixa de pouso de 64 px abaixo do resumo. Mobile: altura automática,
  `padding-bottom:64px` em `.app-main`. Tablet: altura de projeto 582 px (518 + 64).
- Cartão no fluxo, logo após a janela, com `margin-top:-48px` (tablet `-48px × --kt`) e `position:relative` para
  ficar acima da janela. Folga mínima 64 − 48 = 16 px. Crescimento do cartão vai para baixo.
- Reservas fixas de 236/210 px removidas. Largura e posição horizontal do cartão inalteradas.
- Abaixo de 346 px, “Escritório → Campo → Escritório” quebra em duas linhas (8 px entre elas).
- Rótulo e valor do resumo têm 12 px mínimos entre si (só muda algo em 320–340 px).

Desktop (≥ 1024) sem nenhuma mudança.

## V3.1.2 — Valores monetários indivisíveis (etapas 05–06, abaixo de 1024)

Entre 320 e ~335 px, “R$ 420” quebrava entre a moeda e o número. Regra: o valor monetário do resumo da OS #0248 é
uma unidade indivisível — `.scene-device-c .fin-line .ui-val{white-space:nowrap}`, só no elemento do valor. O rótulo
continua podendo quebrar; os 12 px entre rótulo e valor, a fonte, a escala e o cartão não mudam. Desktop sem mudança.
`npm run check` reprova se o valor sair de `.ui-val` ou se a regra for removida.
