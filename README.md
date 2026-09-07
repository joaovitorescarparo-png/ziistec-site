# ZiisTec Site V3 Conversion

Site institucional estático da ZiisTec, separado da aplicação principal.

## Base e objetivo

A branch `site-v3-conversion` parte do checkpoint aprovado `7b6408ed9b0b383d1383f5e6dc9fc10c6043a40a` e mantém a arquitetura visual do Site V3. Esta rodada é cirúrgica: marca, copy, hierarquia comercial e CTAs para aumentar compreensão e intenção de contato sem alterar o escopo real do produto.

## Posicionamento

Gestão para prestadores de serviço e equipes de campo. A página vende **operação conectada**, não uma lista de módulos: cliente → orçamento → OS/agenda → execução → venda/financeiro → histórico/pós-venda.

## Marca

- Header, CTA final e footer mantêm o lockup horizontal web aprovado.
- Lockups internos que antes desenhavam um `Z` por CSS agora usam `/brand/ziistec-icon.png`, o símbolo oficial da aplicação, baixado do commit fixo da plataforma e validado pelo build.
- O derivado `site/brand/ziistec-horizontal-light-web.png` continua validado por SHA-256 e sem redesenho da identidade.

## Conversão

- CTA principal do Hero usa o contato real `acesso@ziistec.com`; o CTA secundário leva à demonstração do produto.
- CTAs principais recebem `data-cta` sem instalar analytics, pixels ou trackers.
- Há CTAs discretos após jornada/equipe e nos planos, sem checkout ou promessa de contratação pública.
- O plano Profissional permanece R$ 79,90 e recebe hierarquia visual maior, sem alterar preços ou esconder os planos laterais.

## Capability safety

As promessas públicas seguem `docs/CAPABILITY_AUDIT_V3.md`. Rentabilidade por OS permanece marcada como **em homologação**. Calculadora independente de margem, relatório profissional de atendimento, NFS-e/fiscal, conciliação bancária, checkout e quotas operacionais não são apresentados como disponíveis.

Pricing continua explicitamente **em validação**. O Preview não cobra nem altera assinatura/plataforma.

## Arquitetura

- HTML + CSS + JavaScript pequeno; sem framework de runtime.
- `site/v3-final/01.css` … `06.css` permanecem intactos como base V3.
- `site/v3-conversion.css` é uma camada curta de marca/hierarquia/conversão adicionada depois do CSS V3 no build.
- `prefers-reduced-motion: reduce` e o storytelling V3 permanecem preservados.
- O `prebuild` executa check e validação de sintaxe antes do build Vercel.

## Gates

```bash
npm ci
npm run check
node --check site/script.js
node --check scripts/build.mjs
npm run build
```
