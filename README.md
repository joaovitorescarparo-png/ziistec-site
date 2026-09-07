# ZiisTec Site V3

Site institucional estático da ZiisTec, separado da aplicação principal.

## Posicionamento

Gestão para prestadores de serviço e equipes de campo. O Site V3 vende **operação conectada**, não uma lista de módulos: cliente → orçamento → OS/agenda → execução → venda/financeiro → histórico/pós-venda.

## Arquitetura

- HTML + CSS + JavaScript pequeno; sem framework de runtime.
- `site/v3-final.css` é o manifesto canônico; `site/v3-final/01.css` … `06.css` preservam a camada visual V3 em ordem determinística e o build concatena exatamente esse conjunto em `dist/styles.css`.
- O derivado `site/brand/ziistec-horizontal-light-web.png` remove apenas canvas transparente excedente da marca e é validado por SHA-256.
- Os quatro assets oficiais continuam sendo baixados do commit fixo da plataforma e validados por Git blob SHA durante o build.
- `app.ziistec.com` permanece reservado e proibido em links públicos.

## Produto e marketing

As promessas públicas seguem `docs/CAPABILITY_AUDIT_V3.md`. Pricing é explicitamente **em validação** e o handoff de quotas/entitlements está em `docs/PRICING_ENTITLEMENTS_HANDOFF.md`.

## Motion

Scroll storytelling usa `requestAnimationFrame`, data attributes e CSS transform/opacity. Não existe scroll-jacking nem biblioteca de animação. `prefers-reduced-motion: reduce` mantém todo o conteúdo em estado estático legível.

## Vídeo futuro

- Hero microdemo: 6–10 s, real, muted, playsinline, loop, quando existir.
- Demo completa: 45–90 s com Dashboard → Orçamento → Aprovação → OS → campo → venda → finalização → histórico.

O site atual usa apenas poster passivo “Demonstração em breve”.

## Gates

```bash
npm ci
npm run check
npm run build
```
