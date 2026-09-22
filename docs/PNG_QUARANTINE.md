# Quarentena temporária de PNGs — Fase 2.5

Nenhum arquivo de imagem ou referência pública foi alterado nesta fase.
Quarentena não significa PNG íntegro: os quatro arquivos abaixo continuam
corrompidos. Hash diferente do aprovado reprova o gate; a corrupção conhecida
é diagnosticada explicitamente. Não reparar, reconstruir ou substituir imagens
nesta fase.

| Arquivo | Hash fixado | Situação |
| --- | --- | --- |
| ziistec-icon.png | Git blob `b17b13a4d4989b21469267f02be9d608e5581a90` | CRC IDAT inválido |
| ziistec-horizontal-light.png | Git blob `bff25617f2040409fb5ff3def57b7a18aa52bd10` | IDAT truncado; IEND ausente |
| ziistec-horizontal-dark.png | Git blob `fa869f33e943be6453a7f0ea935c203f01a4d03c` | CRC inválido, chunk truncado; IEND ausente |
| ziistec-og.png | SHA-256 `ed9edc83f8abfd68bb05351ca7b769573b267748b1200ace1ef2c5ec8f443ddf` | CRC PLTE inválido, chunk truncado; IEND ausente |

Os três arquivos de marca são baixados pelo build de um commit fixo do
repositório Ziistec, com hashes verificados antes da inspeção PNG.
`site/og/ziistec-og.png` é versionado e copiado para `dist/og/ziistec-og.png`.
`site/index.html` referencia essa URL em `og:image` e `twitter:image`.
`scripts/check.mjs` exige sua existência e agora verifica seu hash e reporta
a corrupção; o build repete a verificação na cópia publicada.
Remover o OG agora alteraria a saída e quebraria referências existentes.

O favicon/Z oficial e o logo horizontal web legado continuam sujeitos à
validação estrita de hash e PNG, sem exceção. Os gates de fontes, segredos e
CSP permanecem ativos.

A saída da quarentena será tratada na Fase 3, mediante revisão das referências
e dos arquivos publicados. A Fase 2.5 não inicia esse trabalho e não declara
as imagens corrompidas como renderizáveis.
