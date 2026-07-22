# 23 — Estratégia de testes

## Pirâmide

1. Unidades: dinheiro, taxas, rubricas, bolsas e prestações.
2. Propriedades: conservação, ordem, monotonicidade local e limites.
3. Dourados: exemplos revistos por fiscalista/laboral e casos oficiais.
4. Diferenciais: motor atual versus novo, com motivo por divergência.
5. UI: teclado, leitor de ecrã, responsividade, estados vazios/erro e persistência.
6. End-to-end: importar → corrigir → simular → auditar → guardar/exportar.

## Cenários obrigatórios de payroll

- base simples nas três regiões e situações familiares;
- deficiência e 0/1/2/3+ dependentes;
- refeição nas fronteiras;
- suplementar nos seis patamares e a cruzar 100 horas;
- prémio regular/não regular/desconhecido;
- férias/Natal integral e duodécimos;
- retroativos;
- faltas e part-time;
- viatura e benefícios bloqueados;
- penhora geral, alimentos e decisão especial;
- IRS Jovem sem/com invocação;
- doença e parentalidade em todas as bandas.

## Critérios de aceitação

Nenhuma divergência inexplicada, `git diff --check`, TypeScript estrito, testes totais, build de produção, auditoria de dependências e revisão visual em mobile/desktop e tema escuro.

## Fixtures

Cada fixture guarda input, `asOf`, jurisdição, dataset, resultado esperado, memória e assinatura do revisor. Atualizar uma tabela não regrava automaticamente os dourados anteriores.

## Comandos

```bash
npm run typecheck --prefix ReciboCerto-Fiscal-Engine
npm test --prefix ReciboCerto-Fiscal-Engine
npx tsc --noEmit
npm run build
```
