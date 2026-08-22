# Opportunity Discovery Engine

> Estado: **ODE-1 — geração combinatória a partir do grafo de conhecimento,
> contexto profundo em duas fases, scoring multidimensional com confiança
> separada do fit, stress test e diversificação. 2026-08-22.**
>
> Este documento é a especificação executável. O motor de EVIDÊNCIA — fontes,
> gates, licenças, frescura — continua a viver em
> [`market-intelligence-engine.md`](./market-intelligence-engine.md) e **não foi
> substituído**: é consumido por este.

---

## 0. A diferença que este documento existe para registar

A ferramenta respondia a uma pergunta:

> Das ideias que conhecemos, quais combinam contigo?

E o universo de respostas era, literalmente, o comprimento de um array. Vinte e
quatro entradas em vez de cinco é mais cobertura e continua a ser um catálogo:
acrescentar a hipótese número 25 exigia um humano a escrevê-la.

O motor passa a responder a outra:

> Que problemas económicos, dos que conhecemos, alguém com ESTES recursos,
> NESTA zona, com ESTAS restrições consegue atacar — e o que é que a evidência
> disponível diz sobre cada um?

O espaço de respostas deixa de ser um array e passa a ser um **produto
cartesiano filtrado**: problema × cliente × modelo de receita × entrega ×
geografia × ativos × competências. Uma combinação que ninguém escreveu pode
aparecer, e aparece com a mesma disciplina de proveniência que as curadas.

---

## 1. Auditoria do que existia (Fase 1 do pedido)

### 1.1. Arquitetura atual

| Camada | Ficheiro | O que faz | Reutilizável? |
|---|---|---|---|
| Catálogo | `market/catalogo-oportunidades.ts` | 24 dossiers curados, congelados | **Sim — vira seed** |
| Fit | `market/opportunities.ts` | Founder Fit v2, 6 eixos, repartição | **Sim — vira uma das dimensões** |
| Gate | `market/evidence-gate.ts` | 8 estados, precedência testada | **Sim, intacto** |
| Gate local | `market/gate-local.ts` | O mesmo gate com zona/preço/provas | **Sim, intacto** |
| Geografia | `market/geografia.ts` | NUTS II 2024, local/nacional/outra | **Sim, alargado a distrito** |
| Frescura | `market/freshness.ts` | fresh/expiring/stale/invalid | **Sim, alargado por TTL** |
| Conectores | `market/connectors/*` | INE, Eurostat, dados.gov | **Sim, intacto** |
| Bloco | `market/bulk/*` | Portal BASE, 246 978 registos | **Sim, intacto** |
| Pilotos | `market/pilots.ts` | 15 séries, 8 operações | **Sim, intacto** |
| Preço | `pricing/*` | Motor canónico de preço | **Sim, única porta de preço** |
| Routing | `routing.ts` | Hierarquia de CTA | **Sim, intacto** |
| Hipóteses | `market/hipoteses.ts` | Prova comercial local | **Sim, intacto** |
| Store | `store/hipoteses-mercado.ts` | Cofre local, sem caminho para a nuvem | **Sim, intacto** |
| UI | `DescobrirNegocioStudio.tsx` | Três colunas, contexto+lista+foco | Reescrito em duas fases |

### 1.2. Modelo de contexto anterior

```ts
interface BusinessDiscoveryProfile {
  structure; delivery; capital; recurrence; strengths[]; region;
}
```

Seis campos. `capital` era uma de três faixas; `strengths` um conjunto sem
nível; nada sobre tempo, rendimento pretendido, equipa, ativos, experiência,
restrições ou risco. Um perfil com carrinha e cinco anos de logística era,
para o motor, indistinguível de um perfil sem nada — desde que os dois
carregassem no mesmo chip.

### 1.3. Limitações medidas

- **Universo fechado.** `rankOpportunityTemplates` era `catalogue.map(...).sort(...)`.
- **Contexto raso.** Seis respostas, das quais duas (estrutura, zona) chegaram a
  não alterar coisa nenhuma até à correção anterior.
- **Sem restrições.** Não havia como dizer «não quero empregados» ou «não tenho
  carro». Tudo era preferência, nada eliminava.
- **Sem economia.** Nenhuma estimativa de investimento, break-even ou tempo até
  receita: isso vivia noutra ferramenta e só depois de escolher.
- **Sem risco.** Nem financeiro, nem regulatório, nem de sazonalidade.
- **Sem lacuna.** Zero sinais de `supply` e `competition` — logo, nenhuma
  análise de procura menos oferta era possível.
- **Fase única.** Configuração e resultados no mesmo ecrã, com a configuração a
  sair de vista assim que a lista crescia.

### 1.4. O que NÃO se toca

A doutrina do produto está certa e é o que lhe dá valor. Estas catorze
fronteiras vieram do relatório de auditoria e continuam a valer, agora
verificadas também contra o motor novo:

1. Compatibilidade pessoal e evidência de mercado **nunca** se somam num número.
2. Uma fonte que falha **perde o número**; não recebe fallback plausível.
3. Duas publicações da mesma operação estatística contam **uma** vez.
4. `regions` diz onde o **modelo** faz sentido, nunca onde há dados.
5. Uma observação nacional é **contexto**, e é mostrada marcada como tal.
6. Entrevista **não** é prova de mercado.
7. `operating` exige repetição, contribuição positiva **e** recebimento.
8. Perfil, zona, entrevistas, orçamentos e vendas ficam **no dispositivo**.
9. O valor contratual anunciado **não** é receita provável.
10. Acesso público **não** é direito de republicação.
11. Sem *scraping* de plataformas comerciais.
12. A IA pode propor um mapeamento; **não o aprova nem fornece o número**.
13. A hierarquia dos CTA pertence ao motor de routing, não ao ecrã.
14. Uma hipótese sem evidência que a sustente **não abre rota comercial**.

---

## 2. Arquitetura alvo

```
src/lib/negocio/descoberta/
├── contexto/          Context Engine
│   ├── tipos.ts       OpportunityContext (localização, capital, tempo,
│   │                  rendimento, competências com nível, experiência,
│   │                  equipa, preferências, restrições, risco)
│   ├── perguntas.ts   O questionário em três níveis de profundidade
│   └── profundidade.ts  Quanto do cenário já conhecemos (não é precisão)
├── conhecimento/      Internal Knowledge Engine
│   ├── tipos.ts       Setor · Atividade · ModeloReceita · Problema ·
│   │                  Competência · Ativo · Regulação · Cliente
│   ├── grafo.ts       As relações e as travessias
│   ├── dados/*.ts     As entidades atómicas
│   └── seeds.ts       Os 24 dossiers curados → benchmarks do grafo
├── motor/
│   ├── gerador.ts     generateCandidates(contexto, sinais)
│   ├── restricoes.ts  O que ELIMINA e o que penaliza
│   ├── viabilidade.ts Intervalos, nunca falsa precisão
│   ├── regulacao.ts   Licenças e requisitos, com fonte ou sem afirmação
│   ├── procura.ts     Lacuna = procura − oferta (e a distinção crítica)
│   ├── risco.ts       Sete dimensões, separadas
│   ├── scoring.ts     OpportunityScore multidimensional, pesos justificados
│   ├── confianca.ts   Confiança ≠ fit ≠ mercado
│   ├── stress.ts      Tentar destruir antes de promover
│   ├── diversidade.ts Evitar dez variantes do mesmo negócio
│   ├── explicacao.ts  Porque apareceu, e porque não apareceu
│   ├── validacao.ts   7 / 30 / 90 dias
│   ├── planeador.ts   Query planner por candidato
│   └── pipeline.ts    O orquestrador, com contagens reais
└── historico/
    └── instantaneos.ts  Snapshots por análise, locais e opcionais
```

### 2.1. O fluxo

```
CONTEXTO (fase A, completa antes de resultados)
   ↓
grafo: problemas alcançáveis pelas competências e ativos declarados
   ↓
GERAÇÃO combinatória de candidatos (problema × cliente × modelo × entrega)
   ↓
RESTRIÇÕES duras — elimina, com motivo guardado
   ↓
EVIDÊNCIA — pack público existente, por zona, com licença e frescura
   ↓
VIABILIDADE — intervalos herdados do grafo, nunca inventados
   ↓
REGULAÇÃO · PROCURA/OFERTA · RISCO
   ↓
SCORING multidimensional  +  CONFIANÇA (separada)
   ↓
STRESS TEST — o que pode matar isto
   ↓
DEDUPLICAÇÃO  →  DIVERSIFICAÇÃO  →  RANKING
   ↓
EXPLICAÇÃO + PLANO DE VALIDAÇÃO
```

### 2.2. Onde entra a IA

Em lado nenhum, em tempo de execução. A geração é **combinatória e
determinística**: o mesmo contexto e o mesmo instantâneo produzem o mesmo
resultado, e há um teste que o obriga. Um LLM que gerasse dossiers
reintroduziria exatamente o problema que a página se orgulha de ter resolvido
— premissas editoriais sem proveniência apresentadas como factos.

O que o motor produz quando não sabe é uma **frase que o diz**, e um plano de
investigação (`planeador.ts`) que nomeia a consulta que responderia à pergunta.

---

## 3. Anti-alucinação, por construção

Cada número que chega ao ecrã tem um `Proveniencia`:

```ts
type OrigemDoNumero = "observado" | "estimativa" | "calculo" | "hipotese";
```

- **observado** — veio de uma observação com fonte, período, geografia e licença;
- **estimativa** — intervalo do grafo, com o método declarado e sem falsa precisão;
- **calculo** — derivado de observações ou de estimativas já declaradas;
- **hipotese** — premissa da pessoa, marcada como tal.

Não há um quinto valor. Um número sem `Proveniencia` não compila, e o teste
`descoberta-proveniencia` falha se algum campo numérico do resultado não a
declarar.

---

## 4. O que fica por fazer, dito à cabeça

- **Pesquisa web em direto não está ligada.** O `planeador.ts` produz o plano de
  investigação — queries, fontes, métricas em falta, âmbito, frescura exigida —
  e a interface mostra-o como «o que falta investigar». Executá-lo exige uma
  integração de pesquisa que este repositório não tem, e improvisá-la com um
  LLM violaria a regra 12.
- **Sinais de oferta e concorrência continuam a zero.** O motor sabe raciocinar
  sobre lacuna e distingue «pouca oferta com procura» de «pouca oferta sem
  procura» — mas, sem uma série de `supply`, a resposta honesta é «não
  sabemos», e é isso que aparece. O RNAL do Turismo de Portugal é o próximo
  candidato e está registado no plano.
- **Granularidade geográfica.** A evidência desce a NUTS II; o contexto aceita
  distrito e raio. Onde o dado não existe ao nível pedido, a interface diz que
  está a mostrar o nível acima em vez de fingir precisão local.
