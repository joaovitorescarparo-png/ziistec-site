# ZiisTec Site

Site institucional oficial da ZiisTec, separado da aplicação principal.

## Arquitetura
- Público e estático; sem Supabase, banco, API ou secrets.
- Build gera `dist/`.
- `site/styles.css` preserva o design base e `site/v2.css` concentra as evoluções do Site 2.0; o build concatena ambos em `dist/styles.css`.
- Assets oficiais da marca são baixados no build a partir do commit fixo `24f790b46f0299cd9b11f5b51501eecb05ede89b` do repositório `joaovitorescarparo-png/Ziistec` e validados pelo Git blob SHA.
- O deployment resultante contém os PNGs como arquivos estáticos em `/brand/`.
- `app.ziistec.com` permanece reservado e não pode aparecer em links públicos enquanto o acesso comercial estiver em homologação.

## Segurança
CSP restritiva, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy e Permissions-Policy. Não existem chaves ou variáveis de ambiente.

## Build reproduzível
O projeto não possui dependências de terceiros. Mesmo assim, mantém `package-lock.json` para registrar o estado de instalação e fixa a major do Node em `24.x`, alinhada ao ambiente Vercel. Não foram adicionadas dependências artificiais para criar o lockfile.

```bash
npm ci
npm run check
npm run build
```
