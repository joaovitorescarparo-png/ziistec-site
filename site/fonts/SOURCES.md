# Fontes auto-hospedadas — procedência e licença

Todas as famílias abaixo são distribuídas sob a **SIL Open Font License 1.1 (OFL)**, que
permite expressamente uso e incorporação em websites, inclusive comercialmente, desde que
o texto da licença acompanhe o software de fonte. Os arquivos de licença estão neste mesmo
diretório e são publicados junto com o site.

Nenhum provedor externo é usado: a CSP (`default-src 'self'`) permanece intacta e as fontes
são servidas pela própria origem, em `/fonts/`.

## Space Grotesk

| | |
|---|---|
| Origem | `floriankarsten/space-grotesk` (repositório oficial do autor, Florian Karsten) |
| Commit fixado | `03507d024a01282884232081fc6011c09ff4e849` |
| Arquivo de origem | `fonts/otf/SpaceGrotesk-Bold.otf` |
| sha256 da origem | `be8709abe941dcc98f3625663b340ca20dc90cd6806ee76bd68b568097b6368f` |
| Entregue como | `SpaceGrotesk-Bold.woff2` (35.436 bytes) |
| sha256 entregue | `aaa4fb7d71023da0c2cec811d449d0beff4d04c05107d0b1ed9bf0a93bbe0a76` |
| Licença | `LICENSE-SpaceGrotesk-OFL.txt` — OFL 1.1, © 2020 The Space Grotesk Project Authors |

O upstream não publica WOFF2 pronto; publica o **peso Bold desenhado** em OTF. A conversão
OTF → WOFF2 é apenas troca de contêiner/compressão — nenhum contorno, métrica ou peso foi
gerado. Equivalência verificada na conversão:

```
família "Space Grotesk" · subfamília "Bold" · versão 2.000
987 glifos · unitsPerEm 1000 · OS/2 usWeightClass 700 · head.macStyle 1
idênticos entre o OTF de origem e o WOFF2 entregue
```

## IBM Plex Sans e IBM Plex Mono

| | |
|---|---|
| Origem | `IBM/plex` (repositório oficial da IBM) |
| Tag | `v6.4.0` → commit `383c681f015ed2626e919ec4e3cca16ccc204e9d` |
| Caminhos | `IBM-Plex-Sans/fonts/complete/woff2/` e `IBM-Plex-Mono/fonts/complete/woff2/` |
| Licença | `LICENSE-IBMPlex-OFL.txt` — OFL 1.1, © 2017 IBM Corp., Reserved Font Name "Plex" |

WOFF2 baixado diretamente do upstream, sem reprocessamento.

| Arquivo | Peso | Bytes | sha256 |
|---|---|---|---|
| `IBMPlexSans-Regular.woff2` | 400 | 63.020 | `ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a` |
| `IBMPlexSans-Bold.woff2` | 700 | 63.012 | `fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d` |
| `IBMPlexMono-Regular.woff2` | 400 | 45.640 | `49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131` |
| `IBMPlexMono-Medium.woff2` | 500 | 46.724 | `8c2c290cbd998fa1f647e4572aca6ebbd72589551b0f3f9f8bb8628fbb8219d5` |

## Verificação automática

`scripts/font-integrity.mjs` roda no `check` e no `build`: confere a assinatura `wOF2`,
o tamanho e o sha256 de cada arquivo, e exige que os dois textos de licença OFL continuem
presentes. Substituir uma fonte sem atualizar a procedência reprova o build.
