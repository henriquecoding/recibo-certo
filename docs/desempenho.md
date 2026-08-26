# Desempenho — o que se mede, e o que já se corrigiu

> Dois motores mantêm isto honesto:
>
> - `npm run desempenho` — o que cada rota custa no browser, com uma base de
>   comparação em `desempenho.json`. `--guardar` fixa uma nova base.
> - `npm run fronteira` — que módulos pesados ficam alcançáveis a partir de um
>   componente `"use client"`, **e por que caminho**.
>
> Ambos exigem uma **build** servida (`npm run build && npx next start`). Um
> `next start` sobre uma build anterior mede o código antigo.

---

## 0. A regra

**Um componente de cliente recebe DADOS. Não importa CATÁLOGOS.**

O empacotador não avisa. Um componente `"use client"` que importa uma *função*
de um módulo de dados leva o módulo inteiro — e depois o que esse importa, e
assim por diante. Ninguém escreve isto de propósito; é o que acontece quando
uma fronteira não é verificada.

---

## 1. Porque é que os chunks não servem para diagnosticar

O Turbopack junta módulos sem relação no mesmo ficheiro. Um chunk de 547 KB
com fontes legais, dados fiscais, guias e concelhos lá dentro **não diz quem os
pediu** — e as três primeiras horas desta investigação foram gastas a tentar
lê-lo.

`npm run fronteira` percorre o grafo de imports a partir de cada ficheiro
`"use client"` e imprime o caminho mais curto até cada módulo pesado. É esse
caminho que se corta.

Não segue `import()` dinâmico, de propósito: é precisamente a ferramenta que
corta a fronteira, e segui-la apagaria a diferença entre um módulo carregado à
entrada e outro carregado quando alguém abre um painel.

`ENTRADAS=a,b npm run fronteira` limita a análise a um sub-conjunto — é assim
que se separa o custo do **layout** (que todas as páginas pagam) do de uma
página só.

---

## 2. O que se mediu, e o que se encontrou

### 2.1 A medição tem de separar o caminho crítico do resto

A primeira medição dizia 2 612 KB em todas as rotas — e estava a somar coisas
que não são comparáveis. Separando pelo evento `load`:

| | crítico | depois do `load` |
| --- | --- | --- |
| `/` | 988 KB | **1 624 KB** |
| `/termos` (uma página de texto) | 777 KB | **1 622 KB** |

Uma página de termos e condições descarregava 1,6 MB **depois** de estar
pronta. Não era código dela: era **pré-carregamento especulativo** de todas as
ligações visíveis.

### 2.2 O `<Link>` pré-carrega por visibilidade

No App Router, um `<Link>` visível pré-carrega a rota de destino. Numa barra de
navegação com cinco pilares, num rodapé com seis secções e numa grelha com seis
ferramentas, isso são dezassete pedidos que ninguém pediu — a competir por
largura de banda e por CPU com o que a pessoa está mesmo a ler.

**`prefetch={false}` desliga o pré-carregamento por VISIBILIDADE e mantém o de
SOBREVOO** — que é quando a intenção já existe. Aplicado às superfícies de
lista: barra de navegação, rodapé, «Explorar», resultados de pesquisa, planos,
números.

### 2.3 Meio megabyte de guias para desenhar três ligações

```
ExplorarSecao  →  guias-config  →  guias/manifests
               →  guias/expansao/derivar
               →  catalogo (142 KB) + conteudo (127 KB)
                  + dados-motor (115 KB) + fontes (52 KB)
```

`ExplorarSecao` mostra **três** guias por perfil. Para os obter chamava
`guiasPorPerfil()`, e a chamada trazia o catálogo inteiro.

Agora os atalhos são resolvidos no servidor (`lib/guias/atalhos.servidor.ts`) e
atravessam a fronteira como doze objetos pequenos. O ícone vai como **chave** e
não como componente — a mesma convenção que `icon-map.tsx` já documentava para
as ferramentas, e pela mesma razão: uma chave não arrasta a árvore atrás de si.

### 2.4 As cinco leituras vinham todas, sempre

`page.tsx` importava as cinco `Homepage*` estaticamente. Só uma é renderizada
em cada pedido — mas um import estático não sabe disso. Com `next/dynamic` (sem
`ssr: false`, portanto sem perder o HTML servido) cada leitura passou a ser um
pedaço próprio.

### 2.5 O simulador descarregava para toda a gente

`CalculadoraSecao` carregava o simulador quando a secção «se aproximava», com
**800 px** de margem. Numa janela de 900 px de altura, 800 px de margem
significa *no instante em que a página abre*: 547 KB de simulador mais 200 KB
de dados fiscais, para quem nunca desceu.

Agora são 320 px — e **nada** com `Save-Data` ligado ou ligação lenta
declarada. Quem pediu para poupar dados não quer um megabyte especulativo.

### 2.6 A rota é dinâmica, e não havia sinal de espera

`/` lê `?foco=` e por isso é dinâmica: trocar de aba pede um render ao
servidor. Sem `app/loading.tsx` o App Router não tinha fronteira de espera para
mostrar, e a página anterior ficava congelada até a nova chegar — uma interface
que não responde ao toque lê-se como avariada, não como ocupada.

---

## 3. O resultado

| rota | antes | depois | |
| --- | --- | --- | --- |
| `/?foco=…` (as cinco) | 2 610 KB | **1 040 KB** | −60 % |
| `/` | 2 612 KB | **2 056 KB** | −21 % |
| scripts por rota | 43 | **21** | −51 % |
| `/termos`, depois do `load` | 1 622 KB | **52 KB** | −97 % |

Transição entre abas, com 150 ms de latência simulada: **25–62 ms**.

> A medição das transições **sobrevoa antes de clicar**, que é o que uma pessoa
> faz e o que dispara o pré-carregamento. Medir sem isso mede um caso que quase
> não existe. E mede-se **com latência**: no mesmo computador que serve, tudo
> parece instantâneo e a diferença entre pré-carregar e não pré-carregar
> desaparece.

---

## 4. O que falta, com a prova

`npm run fronteira` continua a apontar o que ainda atravessa. Por ordem de
alcance:

| módulo | tamanho | alcançável de |
| --- | --- | --- |
| `lib/fiscal-data.ts` | 371 KB | 91 componentes de cliente |
| `lib/fiscal.ts` | 143 KB | 57 componentes de cliente |
| `lib/negocio/market/bulk/dados/procura-nuts2.json` | 211 KB | 5 |
| `lib/negocio/market/bulk/dados/oferta-concelhos.json` | 101 KB | 6 |

O maior é `fiscal-data.ts`, e dentro dele os dois maiores blocos são
`PARAMETROS_AUDITADOS` (54 KB — o registo da auditoria, que só três superfícies
de servidor leem) e `SOURCES` (786 linhas de citações legais).

`PARAMETROS_AUDITADOS` sai com uma mudança mecânica, desde que
`assertFiscalDataIntegrity()` continue a correr no build — é a **regra 1** do
`CLAUDE.md` e não se toca nela sem substituir a âncora.

`SOURCES` é outra história: cada valor é embrulhado em `sv(valor, SOURCES.x)`,
portanto a citação viaja com o número. Separá-los é uma decisão de desenho, não
uma limpeza.

---

## 5. Como não regredir

1. **Antes de dar por concluída uma alteração que toca em componentes de
   cliente:** `npm run fronteira`. Um módulo pesado novo na lista é uma
   fronteira que se abriu.
2. **Depois de uma alteração de peso:** `npm run desempenho` compara com
   `desempenho.json` e mostra a diferença. Sem base de comparação, uma
   otimização é uma opinião.
3. **Um `<Link>` numa lista leva `prefetch={false}`.** A exceção é uma ligação
   única e óbvia — um CTA principal —, onde o pré-carregamento à entrada compra
   mesmo alguma coisa.
