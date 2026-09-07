# ZiisTec — Pricing / entitlements handoff

A seção de pricing do Site V3 é **Preview comercial em validação**, não oferta pública contratável. Os preços-alvo e limites propostos não podem virar enforcement de UI.

## Direção comercial em validação

### Essencial — R$ 39,90/mês
Perfil: autônomo começando.
Capacidade proposta: 1 usuário; 100 clientes ativos; 30 orçamentos/mês; 30 OS/mês; 50 itens de catálogo.
Direção de recursos: clientes, agenda, orçamento/PDF, OS, histórico/garantia, financeiro básico.

### Profissional — R$ 79,90/mês
Perfil: autônomo com volume ou pequena equipe.
Capacidade proposta: Owner + 2 profissionais; 1.000 clientes; 300 orçamentos/mês; 300 OS/mês; 500 itens de catálogo.
Direção de valor: equipe, profissional no celular, venda em campo, registro de recebimento, financeiro gerencial e maior volume.
Rentabilidade por OS continua qualificada como em homologação V2.

### Empresa — R$ 139,90/mês
Perfil: operação com vários profissionais.
Capacidade proposta: Owner + 5 profissionais; 1.000 orçamentos/mês; 1.000 OS/mês; 2.000 itens de catálogo.
Relatórios por equipe/profissional só entram quando a função estiver disponível.

## O que precisa existir antes de oferta operacional

Autoridade em banco/backend, nunca apenas UI:

- `subscription_plan`
- `entitlements`
- `quotas`
- contadores/períodos confiáveis e idempotentes
- transição de plano sem perda de dados
- comportamento definido ao ultrapassar quota
- cancelamento/reativação preservando dados conforme política

Entitlements sugeridos:

- `max_users`
- `max_clients`
- `max_quotes_month`
- `max_work_orders_month`
- `max_catalog_items`
- `feature_team`
- `feature_field_sales`
- `feature_margin`
- `feature_advanced_finance`
- `feature_service_report`

## Segurança

A UI pode esconder ou explicar limites, mas o banco/backend deve rejeitar operações que excedam entitlement. Nunca confiar em `company_id`, role, ownership, preço, custo, quota ou plano enviados pelo browser.

## CTA enquanto billing não existe

O site usa somente contato real via `acesso@ziistec.com`. Não há checkout, host morto, Staging público ou cobrança fake.
