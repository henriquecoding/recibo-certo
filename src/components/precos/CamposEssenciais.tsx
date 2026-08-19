"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O ESSENCIAL — no máximo cinco perguntas até ao primeiro resultado
//  ---------------------------------------------------------------------
//  Não é uma preferência estética: é a diferença entre uma ferramenta que
//  se usa e um formulário que se abandona. Tudo o que não couber nas
//  cinco tem valor por omissão DECLARADO — e agora declarado mesmo, no
//  bloco «estamos a assumir» que vive junto ao resultado.
//
//  Que campos aparecem em cada cenário vem de `pricing/perguntas.ts` —
//  dados, não `if`. Um cenário novo entra lá e a interface segue-o.
//
//  Cada campo leva `descricao` visível e ligada por `aria-describedby`,
//  além do `InfoTip` para o detalhe legal. A ajuda que evita o erro não
//  pode viver atrás de um clique.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco, DefinicaoCenarioInicial, ResultadoPreco } from "@/lib/pricing";
import { CANAIS_COMISSAO } from "@/lib/pricing";
import { CampoEuros, CampoNumero, CampoPercentagem, Segmentado, Seletor } from "./atomos";
import { fmt } from "@/lib/format";

type Atualizar = (campo: string, patch: (c: ContextoPreco) => void) => void;

export default function CamposEssenciais({
  contexto,
  definicao,
  atualizar,
  resultado,
}: {
  contexto: ContextoPreco;
  definicao: DefinicaoCenarioInicial;
  atualizar: Atualizar;
  /** Só para traduzir a escolha margem/markup em euros reais. */
  resultado?: ResultadoPreco | null;
}) {
  const rapidos = new Set(definicao.rapido);

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <p className="eyebrow mb-4 text-stone-500 dark:text-stone-400">O essencial</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rapidos.has("custo_compra") ? (
          <>
            <CampoEuros
              id="custo-direto"
              rotulo="Quanto te custa uma unidade"
              ajuda="Se produzes tu, deixa este campo a zero e usa antes o bloco «Como produzes», mais abaixo — lá somam-se matérias, mão de obra e energia."
              descricao="O que pagas por cada unidade que vendes."
              valor={contexto.custos.direto.valor}
              aoMudar={(v) => atualizar("custo-direto", (c) => void (c.custos.direto.valor = v))}
            />
            <Segmentado
              id="custo-inclui-iva"
              rotulo="Esse valor inclui IVA?"
              ajuda="Art. 53.º, n.º 3 do CIVA: quem está isento não liquida IVA e também não o deduz. Os dois efeitos contam ao mesmo tempo, e é por isso que a isenção nem sempre baixa o preço."
              descricao="É a pergunta que mais muda o resultado. Estando isento, o teu custo real é o valor COM IVA — porque não o deduzes."
              opcoes={[
                { valor: "sim", rotulo: "Com IVA" },
                { valor: "nao", rotulo: "Sem IVA" },
              ]}
              valor={contexto.custos.direto.incluiIVA ? "sim" : "nao"}
              aoMudar={(v) => atualizar("custo-inclui-iva", (c) => void (c.custos.direto.incluiIVA = v === "sim"))}
            />
          </>
        ) : null}

        {rapidos.has("custo_producao") ? (
          <CampoEuros
            id="custo-producao"
            rotulo="Custo por unidade (se existir)"
            descricao="Num produto digital costuma ser zero ou quase. Custos de entrega ou de plataforma por venda entram nos custos variáveis, mais abaixo."
            valor={contexto.custos.direto.valor}
            aoMudar={(v) => atualizar("custo-producao", (c) => void (c.custos.direto.valor = v))}
          />
        ) : null}

        {rapidos.has("materiais") && contexto.producao ? (
          <>
            <CampoEuros
              id="materia-lote"
              rotulo="Quanto custa o material que compras"
              descricao="O valor do lote, embalagem ou pacote que compras de cada vez."
              valor={contexto.producao.materias[0]?.custoLote.valor ?? 0}
              aoMudar={(v) =>
                atualizar("materia-lote", (c) => {
                  if (c.producao?.materias[0]) c.producao.materias[0].custoLote.valor = v;
                })
              }
            />
            <CampoNumero
              id="materia-unidades"
              rotulo="Quantas unidades saem daí"
              descricao="Quantos produtos consegues fazer com esse lote."
              valor={contexto.producao.materias[0]?.unidadesPorLote ?? 1}
              aoMudar={(v) =>
                atualizar("materia-unidades", (c) => {
                  if (c.producao?.materias[0]) c.producao.materias[0].unidadesPorLote = Math.max(1, v);
                })
              }
              sufixo="un."
            />
          </>
        ) : null}

        {rapidos.has("horas") && contexto.tempo ? (
          <CampoNumero
            id="horas-unidade"
            rotulo={contexto.cenario === "servico_hora" ? "Horas por sessão" : "Horas de trabalho por unidade"}
            descricao="Conta o tempo todo: preparação, execução, acabamento e limpeza."
            valor={contexto.tempo.horasPorUnidade}
            aoMudar={(v) => atualizar("horas-unidade", (c) => void (c.tempo && (c.tempo.horasPorUnidade = v)))}
            sufixo="h"
            decimais={1}
            max={2000}
          />
        ) : null}

        {rapidos.has("valor_hora") && contexto.tempo ? (
          <CampoEuros
            id="rendimento-ano"
            rotulo="Quanto queres ganhar por ano"
            ajuda="A repartição não é por 160 horas por mês: tiram-se férias, feriados, semanas sem clientes e a fatia de horas não faturáveis. O bloco «As tuas horas a sério» deixa-te afinar todas."
            descricao="Líquido, na mão. A ferramenta reparte-o pelas horas que consegues mesmo faturar e repõe o que sai em impostos."
            valor={contexto.tempo.rendimentoAnualPretendido ?? 0}
            aoMudar={(v) => atualizar("rendimento-ano", (c) => void (c.tempo && (c.tempo.rendimentoAnualPretendido = v)))}
            max={500_000}
          />
        ) : null}

        {rapidos.has("objetivo_ganho") ? (
          <CampoEuros
            id="ganho-mensal"
            rotulo="Quanto queres ganhar por mês"
            descricao="O que queres que sobre, já depois de impostos. A ferramenta acrescenta o que sai em Segurança Social e IRS para lá chegar."
            valor={contexto.objetivo.valor ?? 0}
            aoMudar={(v) =>
              atualizar("ganho-mensal", (c) => {
                c.objetivo.modo = "lucro_mensal";
                c.objetivo.valor = v;
              })
            }
            max={100_000}
          />
        ) : null}

        {rapidos.has("canal") ? (
          <Seletor
            id="canal-venda"
            rotulo="Onde vais vender"
            ajuda="Os valores por omissão saem dos preçários publicados de cada canal, com data de verificação. A comissão real depende da categoria — confirma no teu contrato."
            descricao="A comissão incide sobre o total da encomenda, com IVA. Uma comissão de 15% custa 18,45% do valor sem IVA."
            opcoes={CANAIS_COMISSAO.value.map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
            valor={contexto.canal.marketplaceId ?? "nenhum"}
            aoMudar={(v) =>
              atualizar("canal-venda", (c) => {
                c.canal.marketplaceId = v;
                c.canal.comissaoPercentagem = undefined;
              })
            }
          />
        ) : null}

        {rapidos.has("margem") && contexto.objetivo.modo !== "lucro_mensal" ? (
          <div className="sm:col-span-2">
            <Segmentado
              id="objetivo-modo"
              rotulo="Como queres definir o teu ganho"
              ajuda="As duas medem o mesmo: o que te fica. O que muda é o denominador — a margem divide pelo PREÇO, o markup divide pelo CUSTO. Por isso o markup é sempre o número maior: 50% de markup são 33,3% de margem. Aqui as duas contam o que te fica depois dos impostos, não o que acrescentas à etiqueta."
              opcoes={[
                { valor: "margem", rotulo: "Margem", sub: "÷ pelo preço" },
                { valor: "markup", rotulo: "Markup", sub: "÷ pelo custo" },
              ]}
              valor={contexto.objetivo.modo === "markup" ? "markup" : "margem"}
              aoMudar={(v) =>
                atualizar("objetivo-modo", (c) => {
                  const anterior = c.objetivo.percentagem ?? 0.35;
                  c.objetivo.modo = v as "margem" | "markup";
                  // Converter em vez de manter o número: 40% de margem e
                  // 40% de markup são preços diferentes, e trocar o rótulo
                  // sem converter mudava o preço em silêncio.
                  c.objetivo.percentagem =
                    v === "markup" ? anterior / (1 - anterior) : anterior / (1 + anterior);
                })
              }
            />
            <div className="mt-3">
              <CampoPercentagem
                id="objetivo-pct"
                rotulo={contexto.objetivo.modo === "markup" ? "Markup pretendido" : "Margem pretendida"}
                valor={contexto.objetivo.percentagem ?? 0.35}
                aoMudar={(v) => atualizar("objetivo-pct", (c) => void (c.objetivo.percentagem = v))}
                max={contexto.objetivo.modo === "markup" ? 900 : 95}
              />
            </div>
            <TraducaoMargemMarkup resultado={resultado} />
          </div>
        ) : null}

        {rapidos.has("volume") ? (
          <CampoNumero
            id="volume"
            rotulo="Quantas contas vender por mês"
            descricao="Reparte as contas fixas e dá o ponto de equilíbrio. Uma estimativa conservadora vale mais do que uma otimista."
            valor={contexto.volume.unidadesMes}
            aoMudar={(v) => atualizar("volume", (c) => void (c.volume.unidadesMes = v))}
            sufixo="/mês"
          />
        ) : null}

        {rapidos.has("iva") ? (
          <Seletor
            id="regime-iva"
            rotulo="O teu regime de IVA"
            ajuda="A isenção do Art. 53.º depende da faturação do ano anterior. Se preencheres a faturação anual prevista no bloco fiscal, a ferramenta avisa-te quando este preço e este volume te fazem passar o limiar."
            descricao="Isento pelo Art. 53.º são duas coisas ao mesmo tempo: não cobras IVA e não deduzes o que pagas. As duas mudam o preço."
            opcoes={[
              { valor: "nao_sei", rotulo: "Não tenho a certeza" },
              { valor: "normal", rotulo: "Regime normal — cobro IVA" },
              { valor: "isento_art53", rotulo: "Isento (Art. 53.º) — até 15 000 €" },
              { valor: "isento_art9", rotulo: "Isento pela atividade (Art. 9.º)" },
              { valor: "margem", rotulo: "Regime da margem (2.ª mão)" },
            ]}
            valor={contexto.vendedor.regimeIVA}
            aoMudar={(v) => atualizar("regime-iva", (c) => void (c.vendedor.regimeIVA = v))}
          />
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Assim que preencheres isto, o preço aparece já a seguir. Os blocos mais abaixo tornam-no mais preciso — cada um
        que preencheres muda o número.
      </p>
    </div>
  );
}

/**
 * A mesma escolha, dita nas duas unidades e em euros.
 *
 * Margem e markup são a confusão mais cara da precificação, e a ajuda em
 * texto não chegava: quem lê «50%» não sabe se é do preço ou do custo até
 * ver o número. Aqui a escolha traduz-se sozinha, com os valores da própria
 * pessoa — e diz que o que se mede é o que FICA depois dos impostos, que é
 * o que separa esta ferramenta da conta de manual.
 */
function TraducaoMargemMarkup({ resultado }: { resultado?: ResultadoPreco | null }) {
  if (!resultado?.ok) return null;

  const fica = resultado.margem.lucroUnidade;
  const base = resultado.custo.direto + resultado.custo.variavelFixoPorUnidade + resultado.custo.fixosPorUnidade;
  if (fica <= 0 || base <= 0) return null;

  const pctTexto = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;

  return (
    <p className="mt-2.5 rounded-xl bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/40 dark:text-stone-400">
      A este preço ficam-te <strong className="font-semibold text-stone-800 dark:text-stone-100">{fmt(fica)}</strong> por
      venda, já depois de impostos. São{" "}
      <strong className="font-semibold text-stone-800 dark:text-stone-100">{pctTexto(resultado.margem.markup)}</strong>{" "}
      do teu custo ({fmt(base)}) — o markup — e{" "}
      <strong className="font-semibold text-stone-800 dark:text-stone-100">{pctTexto(resultado.margem.margem)}</strong>{" "}
      do preço sem IVA — a margem. O mesmo euro, dois denominadores.
    </p>
  );
}
