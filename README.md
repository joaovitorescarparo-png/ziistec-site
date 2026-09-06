# ZiisTec Site

Site institucional oficial da ZiisTec, separado da aplicação principal.

## Arquitetura
- Público e estático; sem Supabase, banco, API ou secrets.
- Build gera `dist/`.
- Assets oficiais da marca são baixados no build a partir do commit fixo `24f790b46f0299cd9b11f5b51501eecb05ede89b` do repositório `joaovitorescarparo-png/Ziistec` e validados pelo Git blob SHA.
- O deployment resultante contém os PNGs como arquivos estáticos em `/brand/`.
- CTA de login preparado para `https://app.ziistec.com`.

## Segurança
CSP restritiva, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy e Permissions-Policy. Não existem chaves ou variáveis de ambiente.

## Build
```bash
npm run check
npm run build
```
