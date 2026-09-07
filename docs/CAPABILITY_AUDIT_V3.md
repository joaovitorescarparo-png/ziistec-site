# ZiisTec V3 — Capability audit (read-only)

Base auditada: `joaovitorescarparo-png/Ziistec`, branch `hardening-v2-staging`, HEAD observado `0e0cc625cfa559b70fab11257f16d7478fa05a55`.

Este arquivo existe para impedir que o site institucional venda roadmap como se já fosse produto. `AVAILABLE` significa que há implementação real no código V2 auditado; alguns módulos continuam protegidos por migrations/guards de ambiente até a homologação. `PARTIAL` significa que existe base funcional, mas a promessa ampla ainda não deve ser feita sem qualificação. `PLANNED` é direção explícita, sem produto completo. `NOT PRESENT` não foi encontrado como capacidade operacional auditável.

## AVAILABLE

- **Clientes**: cadastro e uso como entidade central de orçamento, OS e histórico.
- **Orçamentos**: cliente, produtos, serviços, item livre, quantidades, preço, desconto/acréscimo, condição e observações; status de rascunho/enviado/aprovado/recusado/vencido.
- **PDF de orçamento**: geração autenticada, download e compartilhamento quando o dispositivo suporta arquivo compartilhável.
- **Orçamento aprovado → OS**: RPC `zt_create_work_order_from_quote`, vínculo por `quote_id` e comportamento idempotente previsto pela migration 0057.
- **Agenda / atribuição**: OS pode sair da conversão com responsável, data e horário, ou aguardando agendamento.
- **Produtos**: nome, marca/modelo, descrição, custo, preço, garantia, foto, habilitação de venda e controle de estoque.
- **Serviços**: catálogo de serviços com preço/custo e uso no orçamento.
- **Estoque de produtos**: saldo, mínimo, entrada/saída e histórico de movimentação no módulo V2 quando o contrato de banco correspondente está presente.
- **Equipe Owner / Technician**: permissões e contexto de trabalho separados; profissional de campo não recebe custos, margem, fornecedor ou financeiro privado.
- **Venda em campo**: venda rápida e venda vinculada à OS, preço vindo do backend, controle de estoque e idempotência por request ID.
- **Formas de recebimento**: Pix, dinheiro, cartão, transferência/outro conforme configuração da empresa; o sistema registra a confirmação, não processa adquirência.
- **Pix**: payload/QR gerado localmente com valor exato da venda e dados configurados do recebedor.
- **Financeiro operacional**: receitas/despesas, vencimento, pago/recebido, forma de pagamento, cliente, OS/compra de origem, faturado, recebido, a receber, despesas, atrasos e resultado de caixa.
- **Projeção de caixa**: 7/30/60 dias a partir de lançamentos em aberto.
- **Memória técnica da OS**: busca, status, local, solicitação, itens/materiais, relato técnico por texto/voz e evidências Antes/Durante/Depois/Equipamento/Vídeo.
- **Garantia manual**: cliente, produto/serviço, período, série opcional, local e observações, com registro no histórico quando a migration V2 está disponível.
- **Pós-venda/revisões**: `post_sale_followups` com vencimento e status.
- **Compras**: fornecedor/itens/vencimento e ligação com estoque/conta a pagar na arquitetura V2.

## PARTIAL / EM HOMOLOGAÇÃO

- **Rentabilidade por OS**: `FinanceV2` calcula receita, custos privados, resultado e margem quando os ledgers `work_order_item_costs`, `work_order_material_costs` e `work_order_private_costs` estão prontos. O site pode mostrar a capacidade como **em homologação V2**, não como promessa irrestrita.
- **Margem de orçamento**: a gestão de orçamentos calcula custo, margem e percentual internamente para o Owner. Isso não equivale a uma “calculadora de margem” independente.
- **IA de orçamento / análise financeira**: há implementação assistida, mas recursos pagos são fail-closed por feature flag. Não é diferencial central anunciado no Site V3.
- **Locais estruturados / Google Maps**: há contrato V2 para locais e Maps, mas o Site V3 não depende da promessa de integração avançada para vender o fluxo principal.
- **Garantias automáticas / contratos preventivos**: existem migrations e módulos V2, porém o Site V3 privilegia a promessa conservadora de histórico/garantia e pós-venda.

## PLANNED

- **Relatório profissional de atendimento / termo de serviço em PDF**: há memória técnica e relatos/evidências, mas não foi identificado um gerador dedicado de PDF de atendimento equivalente ao escopo comercial proposto.
- **Empacotamento de features por plano**: Essential / Professional / Company ainda precisa de entitlements backend-authoritative.
- **Quotas por plano**: usuários, clientes, orçamentos/mês, OS/mês e itens de catálogo ainda precisam ser implementados e medidos no backend.
- **Checkout/billing comercial automatizado**: cancelamento/reativação de assinatura existe, mas cobrança e automação comercial são trabalho separado.
- **Relatórios avançados por equipe/profissional**: não devem ser vendidos como prontos até existir contrato de dados e UI homologados.

## NOT PRESENT / NÃO ANUNCIAR COMO PRONTO

- Calculadora independente de margem.
- NFS-e/fiscal completo.
- Conciliação bancária.
- Integração bancária operacional.
- Checkout próprio / adquirência própria.
- GPS/rastreamento de equipe.
- Ponto eletrônico / folha de pagamento.
- Comissão automática.

## Regra para o Site V3

O site pode demonstrar capacidades `AVAILABLE`. Capacidades `PARTIAL` devem carregar qualificador visível quando apresentadas. `PLANNED` só pode aparecer em roadmap/handoff. `NOT PRESENT` fica fora da promessa comercial.
