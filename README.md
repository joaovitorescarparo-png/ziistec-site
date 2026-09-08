# ZiisTec Site V3 Sales

Site institucional estático da ZiisTec, separado da aplicação principal.

## Base e objetivo

A branch `site-v3-sales` parte exatamente do checkpoint `505125098e5b47aabec0425964c86a83b21970e1` da V3 Conversion aprovada. Esta rodada não redesenha o site: trabalha dor, valor percebido, objeções, CTA e hierarquia comercial para aumentar intenção de contato.

## Posicionamento

Gestão para prestadores de serviço e equipes de campo. A página vende **operação conectada**, não uma lista de módulos: cliente → orçamento → OS/agenda → execução → venda/financeiro → histórico/pós-venda.

## Canal comercial

Não existe no repositório uma origem oficial comprovada de WhatsApp comercial (`whatsapp`, `wa.me` ou endpoint equivalente). Por isso os CTAs continuam usando o contato real `acesso@ziistec.com`, com assuntos específicos por origem e `data-cta` analytics-ready. Nenhum tracker foi instalado.

## Sales pass

- Hero preserva `Seu serviço inteiro em um só lugar.` e reforça consequência: menos informação perdida e mais controle por serviço.
- Operação fragmentada ganha uma comparação curta `ANTES DA ZIISTEC` → `COM A ZIISTEC`.
- `Por que ZiisTec` passa a responder por menos retrabalho, mais controle, mais profissionalismo e preparo para crescer.
- Orçamento vira porta de entrada comercial: o serviço aprovado continua para a OS sem recadastro.
- Catálogo vende reutilização de produtos/serviços, não apenas cadastro.
- Equipe vende acompanhamento sem depender de mensagens para descobrir o que aconteceu no campo.
- Histórico usa o cenário concreto de retorno do cliente meses depois.
- Financeiro usa linguagem de recebimento/saída e mantém rentabilidade por OS explicitamente em homologação.
- FAQ comercial usa `details/summary` nativos, com seis objeções reais e respostas baseadas no capability audit.
- Profissional continua em R$ 79,90 e recebe contexto de valor: R$ 40 acima do Essencial e cerca de R$ 2,66/dia considerando 30 dias, sem promessa de retorno financeiro.

## Pricing e capability safety

Preços permanecem:

- Essencial — R$ 39,90/mês
- Profissional — R$ 79,90/mês — MAIS ESCOLHIDO
- Empresa — R$ 139,90/mês

Limites e contratação pública continuam marcados como em validação. O Preview não cobra nem altera assinatura/plataforma.

As promessas públicas seguem `docs/CAPABILITY_AUDIT_V3.md`. Rentabilidade por OS permanece **em homologação**. Calculadora independente de margem, relatório profissional de atendimento, NFS-e/fiscal, conciliação bancária, checkout e quotas operacionais não são vendidos como disponíveis.

## Arquitetura

- HTML + CSS + JavaScript pequeno; sem framework de runtime.
- `site/v3-final/01.css` … `06.css` permanecem intactos como base V3.
- `site/v3-conversion.css` preserva a camada de branding/conversão anterior.
- `site/v3-sales.css` adiciona apenas comparação de rotina, FAQ e hierarquia comercial.
- `scripts/sales-transform.mjs` aplica a copy Sales de forma determinística no artefato de Preview; o build falha se o HTML-base divergir dos trechos esperados.
- `site/script.js` permanece responsável apenas por menu, reveal, tabs e storytelling existentes; nenhuma animação nova foi adicionada.
- `prefers-reduced-motion: reduce` permanece preservado.

## Gates

```bash
npm ci
npm run check
node --check site/script.js
node --check scripts/build.mjs
npm run build
```
