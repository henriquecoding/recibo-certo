---
name: crescimento-recibocerto
description: Estratégia de crescimento, medição, clusters de decisão, routing comercial e programa de autoridade do Recibo Certo. Usar SEMPRE que criares uma página nova, uma ferramenta, um guia, um CTA comercial, um evento de medição — ou quando alguém pedir "mais uma calculadora" ou "mais artigos".
---

# Crescimento — Recibo Certo

Aplica o relatório estratégico 2026-2027. O plano completo está em
`docs/ESTRATEGIA.md`; esta skill é o que precisas de saber **antes de escrever
código**.

## A tese (não a contrariar sem autorização)

Recibo Certo = compreender, simular, comparar, preparar e acompanhar.
FIZ = emitir, declarar e executar. Contabilista = exceções complexas.

Nos próximos 90 dias a instrução é **parar de alargar a superfície por defeito**.
O problema não é falta de ferramentas: são dez ferramentas, um comparador, mais de
1 600 perguntas de quiz e cerca de 167 guias. O problema é o sistema que liga
intenção, valor, retorno e receita.

## Antes de adicionar seja o que for

1. **Está dentro de um dos oito clusters de decisão?** (`src/lib/clusters.ts`)
   Se não está, a resposta por defeito é **não**. «Nova calculadora fora dos
   clusters» está explicitamente bloqueada no backlog até haver prova de procura.
2. **Tem uma ferramenta que calcula?** Um cluster sem cálculo é um artigo.
3. **Tem transição definida?** Guardar, FIZ, especialista ou nada. Sem transição,
   é dívida editorial.
4. **Tem dono de atualização e SLA?** Página sem dono não cresce.

## Medição — obrigatória em fluxos novos

A camada vive em `src/lib/analytics/`. Ao criar um simulador, decisor ou fluxo:

```ts
import { registar } from "@/lib/analytics/cliente";

registar("simulator_start", { tool_id, scenario_type, entry_page, user_state });
registar("simulator_complete", { tool_id, fiscal_year, confidence_state });
registar("result_view", { tool_id, result_version, methodology_version });
```

Regras que o código faz cumprir e que não deves tentar contornar:

- **Nenhum dado fiscal pessoal.** Valores, NIF, documentos e texto livre são
  recusados por `pii.ts`, no cliente e no servidor. Precisas de uma grandeza? Usa
  `baldeDeValor()` / `baldeDeTempo()`.
- **Eventos de receita são só do servidor** (`plus_checkout_complete`,
  `fiz_outcome`, `lead_*`). Ver `analytics/servidor.ts`.
- **Sem consentimento de estatística não há medição** nem identificadores.
- **Um evento novo declara-se em `eventos.ts`** — com disparo e com a pergunta do
  painel a que serve. Sem entrada no catálogo, é recusado.

North Star: **DVM** = utilizadores únicos com `simulator_complete` +
`result_view` válido. Definição em `analytics/dvm.ts`.

## Resultados

Usa `ResultadoExplicado` (`src/components/ui/ResultadoExplicado.tsx`). Impõe as
seis camadas: cabeçalho com ano/perfil/confiança → como chegámos aqui → o que
fazer → cenários → fontes e limites → próximo passo.

**A hierarquia dos CTAs não é escolhida pela página.** Passas os sinais e
`escolherRota()` decide (`src/lib/routing.ts`). Nunca três ações com o mesmo peso.
Nunca uma rota comercial quando a confiança é `fora_de_escopo`.

## Conteúdo

Checklist antes de publicar: `docs/ESTRATEGIA.md` §7.4, publicada em
`/metodologia#editorial`. O essencial:

- Ano e território explícitos; data de vigência e revisão; fonte primária clicável.
- Conteúdo essencial **renderizado no servidor** — legível sem JavaScript.
- Um objetivo por página; disclosure antes de qualquer CTA afiliado.
- Datas reais em `src/lib/revisoes.ts` — nunca a data do build.

## Fronteiras comerciais (invioláveis)

Estão em código (`NUNCA_COMUNICAR`, `MONETIZACAO_PROIBIDA` em `routing.ts`) e
publicadas em `/metodologia#comercial`. Nunca dizer que uma simulação foi
submetida, que o estado local equivale a confirmação da AT ou da SS, ou que a FIZ
está incluída no Plus. Sem publicidade programática em resultados. Sem paywall no
handoff FIZ.

## Ao mexer em SEO ou indexação

- `lastmod` vem de `revisoes.ts` (data material), não de `new Date()`.
- `robots.ts` declara explicitamente OAI-SearchBot, GPTBot, ChatGPT-User,
  PerplexityBot, Google-Extended. É uma decisão registada, não um esquecimento.
- Rota pública nova entra em `PUBLIC_ROUTES` (`src/lib/seo.ts`) **e** ganha data
  em `REVISOES_MANUAIS` se não derivar de outra coisa.

## O que NÃO fazer

- Mais uma calculadora fora dos clusters.
- Mais artigos como meta de volume.
- Cinco planos e extras antes de perceber a recorrência do único Plus.
- Ordenar parceiros pelo valor pago.
- Dark patterns em consentimento, checkout, urgência fiscal ou recomendação.
- Testar conversão em cima de uma correção fiscal — a correção ganha sempre.
