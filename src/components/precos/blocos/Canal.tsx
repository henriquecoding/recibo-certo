"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Os blocos do canal: comissões, meios de pagamento, devoluções e
//  desconto.
//
//  A regra que estes campos existem para respeitar, e que é a razão de o
//  solver ter `fracaoBruto` e `fracaoLiquido` separados: as comissões de
//  canal incidem sobre o valor COM IVA e um afiliado costuma incidir
//  sobre o valor SEM IVA. 15% do bruto são 18,45% do líquido; somá-las é
//  errado por um fator de (1 + IVA).
// ═══════════════════════════════════════════════════════════════════════

import { CANAIS_COMISSAO, METODOS_PAGAMENTO, REDUCAO_PRECO_30_DIAS } from "@/lib/pricing";
import { CampoEuros, CampoPercentagem, Seletor } from "../atomos";
import type { PropsBloco } from "./tipos";

export function Comissoes({
  contexto,
  atualizar,
  canalNoEssencial = false,
}: PropsBloco & { canalNoEssencial?: boolean }) {
  const canal = CANAIS_COMISSAO.value.find((c) => c.id === (contexto.canal.marketplaceId ?? "nenhum"));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* ── Um estado, um controlo ─────────────────────────────────
          Este seletor e o «Onde vais vender» do bloco essencial
          escreviam ambos em `canal.marketplaceId`. Dois controlos para o
          mesmo valor, em dois sítios do ecrã, é a receita para alguém
          mudar um, não ver o outro mexer-se, e concluir que a ferramenta
          se enganou. Quando o cenário já pergunta o canal em cima, aqui
          fica só a leitura. */}
      {canalNoEssencial ? (
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400 sm:col-span-2">
          Canal escolhido:{" "}
          <strong className="font-semibold text-stone-700 dark:text-stone-200">{canal?.rotulo ?? "Nenhum"}</strong>.
          Muda-o em «Onde vais vender», lá em cima; a comissão aqui ao lado afina o valor.
        </p>
      ) : (
        <Seletor
          id="marketplace"
          rotulo="Canal / marketplace"
          descricao="Cada canal traz a sua comissão típica, com a data em que foi verificada."
          opcoes={CANAIS_COMISSAO.value.map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
          valor={contexto.canal.marketplaceId ?? "nenhum"}
          aoMudar={(v) =>
            atualizar("marketplace", (c) => {
              c.canal.marketplaceId = v;
              c.canal.comissaoPercentagem = undefined;
            })
          }
        />
      )}

      <CampoPercentagem
        id="comissao"
        rotulo="Comissão (afinar)"
        descricao={
          canal && canal.id !== "nenhum"
            ? `Típica entre ${(canal.comissaoMin * 100).toFixed(0)}% e ${(canal.comissaoMax * 100).toFixed(0)}%. Depende da categoria — confirma no teu contrato.`
            : "Depende da categoria do produto — confirma no teu contrato."
        }
        valor={contexto.canal.comissaoPercentagem ?? canal?.comissaoTipica ?? 0}
        aoMudar={(v) => atualizar("comissao", (c) => void (c.canal.comissaoPercentagem = v))}
        max={60}
      />

      {/* Faltava por completo: há canais que cobram uma parcela fixa por
          venda além da percentagem, e o solver já a aceita (`fixosTransacao`).
          Sem campo, ela era sempre zero. */}
      <CampoEuros
        id="comissao-fixa"
        rotulo="Parcela fixa por venda, se houver"
        descricao="Alguns canais cobram uma quantia fixa por transação além da percentagem. Pesa muito mais nos produtos baratos."
        valor={contexto.canal.comissaoFixa ?? 0}
        aoMudar={(v) => atualizar("comissao-fixa", (c) => void (c.canal.comissaoFixa = v))}
        max={500}
      />

      <Seletor
        id="pagamento"
        rotulo="Como recebes"
        descricao="A taxa de processamento sai antes de o dinheiro chegar à conta."
        opcoes={METODOS_PAGAMENTO.value.map((p) => ({ valor: p.id, rotulo: p.rotulo }))}
        valor={contexto.canal.metodoPagamentoId ?? "nenhum"}
        aoMudar={(v) =>
          atualizar("pagamento", (c) => {
            c.canal.metodoPagamentoId = v;
            c.canal.pagamentoPercentagem = undefined;
            c.canal.pagamentoFixa = undefined;
          })
        }
      />

      <CampoPercentagem
        id="afiliado"
        rotulo="Afiliado ou angariador"
        ajuda="É por isto que o solver separa `fracaoBruto` de `fracaoLiquido`: somar as duas é errado por um fator de (1 + IVA)."
        descricao="Ao contrário da comissão do canal, esta costuma ser negociada sobre o valor SEM IVA."
        valor={contexto.canal.afiliadoPercentagem ?? 0}
        aoMudar={(v) => atualizar("afiliado", (c) => void (c.canal.afiliadoPercentagem = v))}
        max={60}
      />
    </div>
  );
}

export function Pagamento({ contexto, atualizar }: PropsBloco) {
  return (
    <Seletor
      id="pagamento-so"
      rotulo="Como recebes"
      descricao="A taxa de processamento sai antes de o dinheiro chegar à conta."
      opcoes={METODOS_PAGAMENTO.value.map((p) => ({ valor: p.id, rotulo: p.rotulo }))}
      valor={contexto.canal.metodoPagamentoId ?? "nenhum"}
      aoMudar={(v) =>
        atualizar("pagamento", (c) => {
          c.canal.metodoPagamentoId = v;
          c.canal.pagamentoPercentagem = undefined;
          c.canal.pagamentoFixa = undefined;
        })
      }
    />
  );
}

export function Devolucoes({ contexto, atualizar }: PropsBloco) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoPercentagem
        id="taxa-devolucao"
        rotulo="Quantas encomendas voltam"
        descricao="Na venda à distância a lei dá 14 dias de livre resolução, e os portes de ida também são reembolsados."
        valor={contexto.custos.taxaDevolucao ?? 0}
        aoMudar={(v) => atualizar("taxa-devolucao", (c) => void (c.custos.taxaDevolucao = v))}
        max={90}
      />
      <CampoEuros
        id="custo-devolucao"
        rotulo="Custo médio de uma devolução"
        descricao="Recolha, reacondicionamento e o que não se recupera. Se o produto fica inutilizável, soma o custo dele."
        valor={contexto.custos.custoDevolucao ?? 0}
        aoMudar={(v) => atualizar("custo-devolucao", (c) => void (c.custos.custoDevolucao = v))}
        max={5000}
      />
    </div>
  );
}

export function Desconto({ contexto, atualizar }: PropsBloco) {
  const tipo = contexto.desconto?.tipo ?? "promocao";
  const anunciado = tipo === "saldos" || tipo === "promocao" || tipo === "cupao";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoPercentagem
        id="desconto"
        rotulo="Desconto que queres dar"
        descricao="O resultado diz-te o máximo que aguentas antes de a margem de contribuição chegar a zero."
        valor={contexto.desconto?.percentagem ?? 0}
        aoMudar={(v) =>
          atualizar("desconto", (c) => {
            c.desconto = { ...(c.desconto ?? { tipo: "promocao" }), tipo: c.desconto?.tipo ?? "promocao", percentagem: v };
          })
        }
        max={90}
      />
      <Seletor
        id="tipo-desconto"
        rotulo="Modalidade"
        descricao="Saldos e liquidações têm de ser comunicados à ASAE com 5 dias úteis de antecedência. Promoções não."
        opcoes={[
          { valor: "promocao", rotulo: "Promoção" },
          { valor: "saldos", rotulo: "Saldos" },
          { valor: "cupao", rotulo: "Cupão" },
          { valor: "lancamento", rotulo: "Preço de lançamento" },
          { valor: "quantidade", rotulo: "Desconto de quantidade" },
        ]}
        valor={tipo}
        aoMudar={(v) =>
          atualizar("tipo-desconto", (c) => {
            c.desconto = { ...(c.desconto ?? { percentagem: 0 }), tipo: v, percentagem: c.desconto?.percentagem ?? 0 };
          })
        }
      />

      {/* ── O preço de referência ─────────────────────────────────────
          `ModeloDesconto.precoAnterior30Dias` existe no tipo desde o
          início e nunca teve campo — apesar de a própria página ensinar
          a regra que o torna obrigatório. Anunciar «antes 40 €, agora
          30 €» sem que os 40 € tenham sido praticados é a infração que a
          ASAE fiscaliza. */}
      {anunciado ? (
        <div className="sm:col-span-2">
          <CampoEuros
            id="preco-anterior-30-dias"
            rotulo="Preço de referência que vais anunciar"
            ajuda={REDUCAO_PRECO_30_DIAS.descricao}
            descricao={`Tem de ser o preço mais baixo que praticaste nos ${REDUCAO_PRECO_30_DIAS.value.dias} dias anteriores, promoções incluídas. Deixa a zero se não anuncias preço anterior.`}
            valor={contexto.desconto?.precoAnterior30Dias ?? 0}
            aoMudar={(v) =>
              atualizar("preco-anterior-30-dias", (c) => {
                c.desconto = {
                  ...(c.desconto ?? { tipo: "promocao", percentagem: 0 }),
                  tipo: c.desconto?.tipo ?? "promocao",
                  percentagem: c.desconto?.percentagem ?? 0,
                  precoAnterior30Dias: v > 0 ? v : undefined,
                };
              })
            }
            max={1_000_000}
          />
        </div>
      ) : null}
    </div>
  );
}
