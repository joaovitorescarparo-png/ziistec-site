# PNGs e assets — estado após a Fase 3

A quarentena temporária aberta nas Fases 1–2.5 foi **encerrada na Fase 3**
(commit `5897282`). Nenhum PNG corrompido participa mais do build ou da
publicação, e nenhum deles foi reparado, reconstruído ou substituído por uma
imagem fabricada.

## Ativos corrompidos — removidos

| Arquivo | Defeito verificado | Hash legado | Situação atual |
| --- | --- | --- | --- |
| `ziistec-icon.png` | CRC inválido no IDAT | Git blob `b17b13a4d4989b21469267f02be9d608e5581a90` | Não é mais baixado pelo build nem referenciado |
| `ziistec-horizontal-light.png` | IDAT truncado; IEND ausente | Git blob `bff25617f2040409fb5ff3def57b7a18aa52bd10` | Não é mais baixado pelo build nem referenciado |
| `ziistec-horizontal-dark.png` | CRC inválido; chunk truncado; IEND ausente | Git blob `fa869f33e943be6453a7f0ea935c203f01a4d03c` | Não é mais baixado pelo build nem referenciado |
| `ziistec-og.png` | CRC do PLTE inválido; chunk truncado; IEND ausente | SHA-256 `ed9edc83f8abfd68bb05351ca7b769573b267748b1200ace1ef2c5ec8f443ddf` | Arquivo removido de `site/og/`; meta tags `og:image` e `twitter:image` retiradas |

Os três primeiros vinham de um commit fixo do repositório `Ziistec`; o OG era
versionado neste repositório. Os hashes ficam registrados só como histórico.

**Consequência conhecida:** sem `og:image`, links compartilhados (inclusive no
WhatsApp) não exibem imagem de prévia. Um OG válido precisa ser criado e
aprovado separadamente — não deve ser gerado a partir dos arquivos acima.

## Ativos íntegros

| Arquivo | Verificação | Uso |
| --- | --- | --- |
| `site/brand/ziistec-favicon.png` | PNG 96×96 íntegro (assinatura, CRC de todos os chunks, IEND); SHA-256 `368d4153166acf6a39280a3766379b31fecd47ed50d07f721ad2d463cd95452a` | Símbolo Z oficial do lockup Refinement A e favicon |
| `site/brand/ziistec-horizontal-light-web.png` | PNG íntegro; SHA-256 `fed5c39249ad01f8b3f010d4988cf53590c094a93c609826e0cc35f52c44d1b6` | Legado. Ainda é copiado para `dist/`, mas nenhuma página pode referenciá-lo |

## Gates que mantêm esse estado

- `scripts/check.mjs` reprova qualquer página publicada que referencie um dos
  quatro PNGs corrompidos ou o horizontal legado.
- `scripts/build.mjs` repete a verificação nas quatro páginas de `dist/`.
- O favicon é validado por hash **e** por estrutura PNG no check e no build.
- `scripts/tooling.test.mjs` prova que um PNG com CRC alterado ou sem IEND é
  reprovado e que uma referência publicada ao OG antigo quebra check e build.

## Limpeza técnica do hardening pós-Fase 3

- **`site/legal.css` removido.** Na Fase 3 o conteúdo tinha sido substituído
  por uma mensagem de erro de ferramenta de agente. O navegador lia o arquivo
  com zero regras CSS nas três páginas que o carregavam (Privacidade, Termos e
  404), que já eram estilizadas por inteiro pelas regras `legal-*` de
  `site/v4/02-home.css`. A referência foi retirada das três páginas e a
  renderização em 1440 e 390 px ficou idêntica pixel a pixel. A versão
  anterior à Fase 3 usava variáveis e o logo horizontal da V3 e não foi
  restaurada. O check reprova se o arquivo voltar ou se qualquer página
  carregar outra folha além de `/styles.css`.
- **Classes sem seletor zeradas.** `hero-kicker` e `legal-brand` eram ganchos
  sem estilo nem uso em JS e saíram do markup. `amber-dot` passou a aplicar o
  âmbar aprovado (`--zt-accent-status`) ao status "Em atendimento" da
  recriação do produto, como a intenção original. A paridade classe↔seletor
  não tem mais lista de exceções.
- **Saída de ferramenta proibida.** Check e build reprovam qualquer arquivo de
  texto do repositório ou de `dist/` que contenha as mensagens de erro de
  ferramenta que já corromperam este repositório.
