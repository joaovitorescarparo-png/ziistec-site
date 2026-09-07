# ZiisTec Site

Site institucional oficial da ZiisTec, separado da aplicação principal.

## Posicionamento
A ZiisTec é apresentada como gestão para prestadores de serviço e equipes de campo. A narrativa comercial conecta cliente, orçamento, OS, agenda, execução, equipe, venda/financeiro e histórico/pós-venda, sem anunciar recursos inexistentes ou limitar a marca a um único nicho técnico.

## Arquitetura
- Público e estático; sem Supabase, banco, API ou secrets.
- Build gera `dist/`.
- `site/styles.css` preserva o design base, `site/v2.css` mantém o Site 2.0, `site/v3/` concentra a camada visual de produto e `site/v4.css` fecha posicionamento, primeira dobra, público amplo e storytelling por scroll.
- Assets oficiais da marca são baixados no build a partir do commit fixo `24f790b46f0299cd9b11f5b51501eecb05ede89b` do repositório `joaovitorescarparo-png/Ziistec` e validados pelo Git blob SHA.
- `site/brand/ziistec-horizontal-light-web.png` é um derivado web trimmed da marca horizontal, usado para remover o excesso de canvas transparente no header sem crop/overflow frágil. O build valida seu SHA-256.
- O deployment resultante contém os PNGs oficiais como arquivos estáticos em `/brand/`.
- `app.ziistec.com` permanece reservado e não pode aparecer em links públicos enquanto o acesso comercial estiver em homologação.

## Motion
O Hero usa uma sequência finita. Jornada e equipe usam storytelling orientado pela rolagem com `requestAnimationFrame`, atributos de estado e CSS transform/opacity, sem scroll-jacking e sem bibliotecas. Em `prefers-reduced-motion: reduce`, o conteúdo aparece em estado estático completo. O processamento é pausado quando a aba fica oculta.

## Vídeo futuro
Dois usos estão documentados para uma etapa posterior, sempre com telas reais e dados sanitizados:

1. **Hero microdemo (6–10 s):** muted, playsinline e loop, mostrando um microfluxo real sem substituir o conteúdo textual essencial.
2. **Demo completa (45–90 s):** Dashboard → Orçamento → Aprovação → OS → profissional no celular → Venda → Finalização → Histórico/Garantia. Pode servir ao site, apresentação comercial e anúncios.

O site atual mantém apenas um poster passivo “Vídeo · em breve”; não existe autoplay, vídeo stock ou botão de play falso.

## Segurança
CSP restritiva, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy e Permissions-Policy. Não existem chaves ou variáveis de ambiente.

## Build reproduzível
O projeto não possui dependências de terceiros. Mesmo assim, mantém `package-lock.json` para registrar o estado de instalação e fixa a major do Node em `24.x`, alinhada ao ambiente Vercel. Não foram adicionadas dependências artificiais para criar o lockfile.

```bash
npm ci
npm run check
npm run build
```
