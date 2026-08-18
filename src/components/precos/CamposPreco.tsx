"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS CAMPOS — modo rápido e modo preciso
//  ---------------------------------------------------------------------
//  O modo rápido tem no máximo cinco perguntas. Não é uma preferência
//  estética: é a diferença entre uma ferramenta que se usa e um formulário
//  que se abandona. Tudo o resto tem valor por omissão declarado e vive
//  atrás de blocos que a pessoa abre se quiser.
//
//  Que campos aparecem em cada modo vem de `pricing/perguntas.ts` — dados,
//  não `if`. Um cenário novo entra lá e a interface segue-o.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import type { ContextoPreco, DefinicaoCenarioInicial, ResultadoPreco } from "@/lib/pricing";
import { CANAIS_COMISSAO, METODOS_PAGAMENTO } from "@/lib/pricing";
import { Bloco, CampoEuros, CampoNumero, CampoPercentagem, Segmentado, Seletor } from "./atomos";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import { ATIVIDADES } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

type Atualizar = (patch: (c: ContextoPreco) => void) => void;

export default function CamposPreco({
  contexto,
  definicao,
  atualizar,
  resultado,
  parte = "tudo",
}: {
  contexto: ContextoPreco;
  definicao: DefinicaoCenarioInicial;
  atualizar: Atualizar;
  /** Só para traduzir a escolha margem/markup em euros reais. */
  resultado?: ResultadoPreco | null;
  /**
   * Qual metade desenhar. Existe para o RESULTADO poder ficar ENTRE as duas:
   * primeiro personaliza-se o essencial, depois vê-se o número, e só quem
   * quiser afinar mais desce aos blocos avançados.
   *
   * Antes o resultado vinha antes de tudo, e o efeito era este: escolhias
   * «um produto digital» e a ferramenta anunciava «QUANTO DEVES COBRAR
   * 1,09 €» sem que tivesses dito o que quer que fosse — o número saía de um
   * custo por omissão de 0 €, uma margem por omissão de 70% e um volume por
   * omissão de 20. Um número inventado apresentado como recomendação.
   */
  parte?: "essencial" | "avancado" | "tudo";
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const alternar = (id: string) => setAbertos((a) => ({ ...a, [id]: !a[id] }));

  const rapidos = new Set(definicao.rapido);
  const avancados = new Set(definicao.avancado);

  // O catálogo guarda-se pelo `label` (é a chave que o resto do projeto já
  // usa); aqui resolve-se de volta para o objeto que o combobox espera.
  const atividadeEscolhida =
    ATIVIDADES.find((a) => a.label === contexto.vendedor.atividadeLabel) ?? null;

  const mostrarEssencial = parte === "essencial" || parte === "tudo";
  const mostrarAvancado = parte === "avancado" || parte === "tudo";

  return (
    <div className="space-y-4">
      {/* ── Modo rápido ───────────────────────────────────────────── */}
      {mostrarEssencial ? (
      <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <p className="eyebrow mb-4 text-stone-500 dark:text-stone-400">O essencial</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {rapidos.has("custo_compra") ? (
            <>
              <CampoEuros
                id="custo-direto"
                rotulo="Quanto te custa uma unidade"
                ajuda="O que pagas ao fornecedor por cada unidade que vendes. Se produzes tu, usa o bloco «Como produzes» mais abaixo."
                valor={contexto.custos.direto.valor}
                aoMudar={(v) => atualizar((c) => void (c.custos.direto.valor = v))}
              />
              <Segmentado
                rotulo="Esse valor inclui IVA?"
                ajuda="É a pergunta que mais muda o resultado. Se estás isento pelo Art. 53.º, não deduzes o IVA das compras — logo o teu custo real é o valor COM IVA."
                opcoes={[
                  { valor: "sim", rotulo: "Com IVA" },
                  { valor: "nao", rotulo: "Sem IVA" },
                ]}
                valor={contexto.custos.direto.incluiIVA ? "sim" : "nao"}
                aoMudar={(v) => atualizar((c) => void (c.custos.direto.incluiIVA = v === "sim"))}
              />
            </>
          ) : null}

          {rapidos.has("custo_producao") ? (
            <CampoEuros
              id="custo-producao"
              rotulo="Custo por unidade (se existir)"
              ajuda="Num produto digital costuma ser zero ou quase. Se tens custos de entrega ou de plataforma por venda, entram nos custos variáveis."
              valor={contexto.custos.direto.valor}
              aoMudar={(v) => atualizar((c) => void (c.custos.direto.valor = v))}
            />
          ) : null}

          {rapidos.has("materiais") && contexto.producao ? (
            <>
              <CampoEuros
                id="materia-lote"
                rotulo="Quanto custa o material que compras"
                ajuda="O valor do lote, embalagem ou pacote que compras de cada vez."
                valor={contexto.producao.materias[0]?.custoLote.valor ?? 0}
                aoMudar={(v) =>
                  atualizar((c) => {
                    if (c.producao?.materias[0]) c.producao.materias[0].custoLote.valor = v;
                  })
                }
              />
              <CampoNumero
                id="materia-unidades"
                rotulo="Quantas unidades saem daí"
                ajuda="Quantos produtos consegues fazer com esse material."
                valor={contexto.producao.materias[0]?.unidadesPorLote ?? 1}
                aoMudar={(v) =>
                  atualizar((c) => {
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
              ajuda="Conta o tempo todo: preparação, execução e acabamento."
              valor={contexto.tempo.horasPorUnidade}
              aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.horasPorUnidade = v)))}
              sufixo="h"
              decimais={1}
              max={2000}
            />
          ) : null}

          {rapidos.has("valor_hora") && contexto.tempo ? (
            <CampoEuros
              id="rendimento-ano"
              rotulo="Quanto queres ganhar por ano"
              ajuda="Líquido, para ti. A ferramenta reparte-o pelas horas que consegues mesmo faturar e repõe o que sai em impostos."
              valor={contexto.tempo.rendimentoAnualPretendido ?? 0}
              aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.rendimentoAnualPretendido = v)))}
              max={500_000}
            />
          ) : null}

          {rapidos.has("objetivo_ganho") ? (
            <CampoEuros
              id="ganho-mensal"
              rotulo="Quanto queres ganhar por mês"
              ajuda="O lucro que queres que o negócio gere. Se és trabalhador independente, a ferramenta acrescenta o que sai em Segurança Social e IRS."
              valor={contexto.objetivo.valor ?? 0}
              aoMudar={(v) =>
                atualizar((c) => {
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
              ajuda="A comissão do canal incide sobre o valor total da encomenda, com IVA incluído — por isso pesa mais do que a percentagem sugere."
              opcoes={CANAIS_COMISSAO.value.map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
              valor={contexto.canal.marketplaceId ?? "nenhum"}
              aoMudar={(v) =>
                atualizar((c) => {
                  c.canal.marketplaceId = v;
                  c.canal.comissaoPercentagem = undefined;
                })
              }
            />
          ) : null}

          {rapidos.has("margem") && contexto.objetivo.modo !== "lucro_mensal" ? (
            <div className="sm:col-span-2">
              <Segmentado
                rotulo="Como queres definir o teu ganho"
                ajuda="As duas medem o mesmo: o que te fica. O que muda é o denominador — a margem divide pelo PREÇO, o markup divide pelo CUSTO. Por isso o markup é sempre o número maior: 50% de markup são 33,3% de margem. Aqui as duas contam o que te fica depois dos impostos, não o que acrescentas à etiqueta."
                opcoes={[
                  { valor: "margem", rotulo: "Margem", sub: "÷ pelo preço" },
                  { valor: "markup", rotulo: "Markup", sub: "÷ pelo custo" },
                ]}
                valor={contexto.objetivo.modo === "markup" ? "markup" : "margem"}
                aoMudar={(v) =>
                  atualizar((c) => {
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
                  aoMudar={(v) => atualizar((c) => void (c.objetivo.percentagem = v))}
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
              ajuda="Serve para repartir as contas fixas e para calcular o ponto de equilíbrio. Uma estimativa conservadora vale mais do que uma otimista."
              valor={contexto.volume.unidadesMes}
              aoMudar={(v) => atualizar((c) => void (c.volume.unidadesMes = v))}
              sufixo="/mês"
            />
          ) : null}

          {rapidos.has("iva") ? (
            <Seletor
              id="regime-iva"
              rotulo="O teu regime de IVA"
              ajuda="Isento pelo Art. 53.º significa duas coisas ao mesmo tempo: não cobras IVA e não deduzes o IVA que pagas. As duas mudam o preço."
              opcoes={[
                { valor: "nao_sei", rotulo: "Não tenho a certeza" },
                { valor: "normal", rotulo: "Regime normal — cobro IVA" },
                { valor: "isento_art53", rotulo: "Isento (Art. 53.º) — até 15 000 €" },
                { valor: "isento_art9", rotulo: "Isento pela atividade (Art. 9.º)" },
                { valor: "margem", rotulo: "Regime da margem (2.ª mão)" },
              ]}
              valor={contexto.vendedor.regimeIVA}
              aoMudar={(v) => atualizar((c) => void (c.vendedor.regimeIVA = v))}
            />
          ) : null}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Assim que preencheres isto, o preço aparece já a seguir. Os blocos mais abaixo tornam-no mais preciso — cada um
          que preencheres muda o número.
        </p>
      </div>
      ) : null}

      {/* ── Modo preciso ──────────────────────────────────────────── */}
      {mostrarAvancado ? (
      <div className="space-y-3">
        {avancados.has("fiscalidade") ? (
          <Bloco
            titulo="O teu enquadramento fiscal"
            descricao="O que mais muda o preço em Portugal — e o que nenhuma calculadora pergunta"
            aberto={!!abertos.fiscal}
            alternar={() => alternar("fiscal")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Seletor
                id="tipo-vendedor"
                rotulo="Vendes como"
                opcoes={[
                  { valor: "nao_sei", rotulo: "Ainda não sei" },
                  { valor: "ti", rotulo: "Trabalhador independente" },
                  { valor: "empresa", rotulo: "Empresa (Lda./Unipessoal)" },
                  { valor: "particular", rotulo: "Particular / ocasional" },
                ]}
                valor={contexto.vendedor.tipo}
                aoMudar={(v) => atualizar((c) => void (c.vendedor.tipo = v))}
              />
              <Seletor
                id="regiao"
                rotulo="Região"
                ajuda="As taxas de IVA são diferentes: 23% no Continente, 22% na Madeira, 16% nos Açores."
                opcoes={[
                  { valor: "continente", rotulo: "Continente" },
                  { valor: "madeira", rotulo: "Madeira" },
                  { valor: "acores", rotulo: "Açores" },
                ]}
                valor={contexto.vendedor.regiao}
                aoMudar={(v) => atualizar((c) => void (c.vendedor.regiao = v))}
              />

              {contexto.vendedor.tipo === "ti" ? (
                <>
                  {/* O MESMO seletor do simulador de recibos verdes.
                      Era um `select` com quatro tipos canónicos, e o
                      catálogo tem dezenas de atividades — várias com
                      coeficiente, retenção ou base de Segurança Social
                      próprios. A mesma pessoa escolhia a atividade de uma
                      maneira ali e de outra aqui, e obtinha números
                      diferentes para o mesmo caso. */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="atividade-preco"
                      className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
                    >
                      A tua atividade
                    </label>
                    <ActivityCombobox
                      value={atividadeEscolhida}
                      onChange={(a) =>
                        atualizar((c) => {
                          c.vendedor.atividadeLabel = a.label;
                          c.vendedor.atividade = a.tipo;
                        })
                      }
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Decide o coeficiente do regime simplificado, a retenção na fonte e a base da Segurança Social —
                      70% nos serviços, 20% na venda de bens. É a mesma lista do simulador de recibos verdes.
                    </p>
                  </div>
                  <CampoEuros
                    id="faturacao-anual"
                    rotulo="Faturação anual que prevês"
                    ajuda="Sem isto o IRS fica de fora do cálculo: o mesmo euro custa 13% a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €. Também é daqui que sai o teu regime de IVA."
                    valor={contexto.vendedor.faturacaoAnualPrevista ?? 0}
                    aoMudar={(v) => atualizar((c) => void (c.vendedor.faturacaoAnualPrevista = v))}
                    max={500_000}
                  />
                  <Seletor
                    id="regime-contabilidade"
                    rotulo="Como determinas o rendimento"
                    ajuda="No simplificado o coeficiente do Art. 31.º já presume as despesas, e por isso os teus custos não reduzem o IRS. Na contabilidade organizada reduzem — o imposto incide sobre receita menos despesas."
                    opcoes={[
                      { valor: "simplificado", rotulo: "Regime simplificado" },
                      { valor: "organizada", rotulo: "Contabilidade organizada" },
                    ]}
                    valor={contexto.vendedor.regimeContabilidade ?? "simplificado"}
                    aoMudar={(v) => atualizar((c) => void (c.vendedor.regimeContabilidade = v))}
                  />
                  <CampoEuros
                    id="salario-bruto-anual"
                    rotulo="Salário anual bruto, se acumulas"
                    ajuda="Se além dos recibos verdes tens um emprego, o IRS soma os dois: cada euro que faturas entra por cima do salário e leva uma taxa mais alta. Deixa a zero se não acumulas."
                    valor={contexto.vendedor.salarioBrutoAnual ?? 0}
                    aoMudar={(v) => atualizar((c) => void (c.vendedor.salarioBrutoAnual = v))}
                    max={500_000}
                  />
                  <Seletor
                    id="irs-jovem"
                    rotulo="IRS Jovem"
                    ajuda="Art. 12.º-B do CIRS. A isenção reduz a base sujeita a retenção na fonte — e por isso muda o que recebes em cada fatura, não o que ganhas no fim."
                    opcoes={[
                      { valor: "0", rotulo: "Não se aplica" },
                      ...Array.from({ length: 10 }, (_, i) => ({
                        valor: String(i + 1),
                        rotulo: `${i + 1}.º ano de rendimentos`,
                      })),
                    ]}
                    valor={String(contexto.vendedor.irsJovemAno ?? 0)}
                    aoMudar={(v) =>
                      atualizar((c) => void (c.vendedor.irsJovemAno = Number(v) > 0 ? Number(v) : undefined))
                    }
                  />
                  <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={!!contexto.vendedor.dispensaRetencao}
                      onChange={(e) =>
                        atualizar((c) => void (c.vendedor.dispensaRetencao = e.target.checked))
                      }
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                    />
                    <span>
                      Dispensei a retenção na fonte
                      <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">
                        Podes fazê-lo se previres faturar menos de 15 000 € no ano (Art. 101.º-B do CIRS). Recebes o
                        valor inteiro de cada fatura e acertas tudo no IRS — muda quando pagas, não quanto pagas.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={!!contexto.vendedor.isencaoSSPrimeiroAno}
                      onChange={(e) =>
                        atualizar((c) => void (c.vendedor.isencaoSSPrimeiroAno = e.target.checked))
                      }
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                    />
                    <span>
                      Estou nos primeiros 12 meses de atividade (isento de Segurança Social)
                      <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                        Vale a pena ver o preço com e sem: quando a isenção acabar, ~15% de cada euro de serviços passa a
                        sair para a Segurança Social.
                      </span>
                    </span>
                  </label>
                </>
              ) : null}

              <Seletor
                id="cliente"
                rotulo="A quem vendes"
                ajuda="Uma empresa portuguesa retém IRS na fonte — o que afeta a tua tesouraria, não a tua margem. Uma empresa noutro país da UE muda o IVA."
                opcoes={[
                  { valor: "consumidor", rotulo: "Consumidor final" },
                  { valor: "empresa_pt", rotulo: "Empresa portuguesa" },
                  { valor: "empresa_ue", rotulo: "Empresa noutro país da UE" },
                  { valor: "fora_ue", rotulo: "Cliente fora da UE" },
                ]}
                valor={contexto.canal.cliente}
                aoMudar={(v) => atualizar((c) => void (c.canal.cliente = v))}
              />
              <Seletor
                id="escalao-iva"
                rotulo="Taxa de IVA da venda"
                opcoes={[
                  { valor: "normal", rotulo: "Normal" },
                  { valor: "intermedia", rotulo: "Intermédia" },
                  { valor: "reduzida", rotulo: "Reduzida" },
                ]}
                valor={contexto.produto.escalaoVenda}
                aoMudar={(v) => atualizar((c) => void (c.produto.escalaoVenda = v))}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("custos_fixos") ? (
          <Bloco
            titulo="Contas que pagas mesmo sem vender"
            descricao="Renda, contabilidade, software, seguros — repartidas por cada venda"
            aberto={!!abertos.fixos}
            alternar={() => alternar("fixos")}
          >
            <ListaCustos
              itens={contexto.custos.fixos.map((f) => ({ id: f.id, rotulo: f.rotulo, valor: f.mensal }))}
              sufixo="/mês"
              sugestoes={["Renda", "Contabilidade", "Software", "Seguros", "Telecomunicações", "Marketing"]}
              aoMudar={(itens) =>
                atualizar((c) => {
                  c.custos.fixos = itens.map((i) => ({ id: i.id, rotulo: i.rotulo, mensal: i.valor }));
                })
              }
            />
            {contexto.custos.fixos.length > 0 ? (
              <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                Total:{" "}
                <strong className="tabular-nums">
                  {fmt(contexto.custos.fixos.reduce((s, f) => s + f.mensal, 0))}
                </strong>{" "}
                por mês
              </p>
            ) : null}
          </Bloco>
        ) : null}

        {avancados.has("custos_variaveis") ? (
          <Bloco
            titulo="Custos que só existem quando vendes"
            descricao="Embalagem, etiquetas, portes, consumíveis"
            aberto={!!abertos.variaveis}
            alternar={() => alternar("variaveis")}
          >
            <ListaCustos
              itens={contexto.custos.variaveis.map((v) => ({ id: v.id, rotulo: v.rotulo, valor: v.porUnidade }))}
              sufixo="/un."
              sugestoes={["Embalagem", "Etiqueta", "Consumíveis", "Cartão de agradecimento"]}
              aoMudar={(itens) =>
                atualizar((c) => {
                  c.custos.variaveis = itens.map((i) => ({ id: i.id, rotulo: i.rotulo, porUnidade: i.valor }));
                })
              }
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <CampoEuros
                id="portes"
                rotulo="Portes que pagas tu"
                ajuda="Envio grátis para o cliente não é grátis para ti. Entra aqui o custo médio por encomenda."
                valor={contexto.custos.portesAbsorvidos ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.custos.portesAbsorvidos = v))}
                max={500}
              />
              <CampoPercentagem
                id="desperdicio"
                rotulo="Desperdício ou quebra"
                ajuda="Se 10% do que produzes ou compras se perde, cada unidade vendida carrega o custo de 1,11 unidades — não de 1,10."
                valor={contexto.custos.desperdicio ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.custos.desperdicio = v))}
                max={90}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("comissoes") || avancados.has("pagamento") ? (
          <Bloco
            titulo="Comissões e meios de pagamento"
            descricao="Incidem sobre o valor total da encomenda, com IVA"
            aberto={!!abertos.comissoes}
            alternar={() => alternar("comissoes")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Seletor
                id="marketplace"
                rotulo="Canal / marketplace"
                opcoes={CANAIS_COMISSAO.value.map((c) => ({ valor: c.id, rotulo: c.rotulo }))}
                valor={contexto.canal.marketplaceId ?? "nenhum"}
                aoMudar={(v) =>
                  atualizar((c) => {
                    c.canal.marketplaceId = v;
                    c.canal.comissaoPercentagem = undefined;
                  })
                }
              />
              <CampoPercentagem
                id="comissao"
                rotulo="Comissão (afinar)"
                ajuda="O valor típico do canal aparece por omissão. A comissão real depende da categoria do produto — confirma no teu contrato."
                valor={
                  contexto.canal.comissaoPercentagem ??
                  CANAIS_COMISSAO.value.find((c) => c.id === (contexto.canal.marketplaceId ?? "nenhum"))
                    ?.comissaoTipica ??
                  0
                }
                aoMudar={(v) => atualizar((c) => void (c.canal.comissaoPercentagem = v))}
                max={60}
              />
              <Seletor
                id="pagamento"
                rotulo="Como recebes"
                opcoes={METODOS_PAGAMENTO.value.map((p) => ({ valor: p.id, rotulo: p.rotulo }))}
                valor={contexto.canal.metodoPagamentoId ?? "nenhum"}
                aoMudar={(v) =>
                  atualizar((c) => {
                    c.canal.metodoPagamentoId = v;
                    c.canal.pagamentoPercentagem = undefined;
                    c.canal.pagamentoFixa = undefined;
                  })
                }
              />
              <CampoPercentagem
                id="afiliado"
                rotulo="Afiliado ou angariador"
                ajuda="Ao contrário da comissão do canal, esta costuma ser negociada sobre o valor sem IVA."
                valor={contexto.canal.afiliadoPercentagem ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.canal.afiliadoPercentagem = v))}
                max={60}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("devolucoes") ? (
          <Bloco
            titulo="Devoluções"
            descricao="14 dias de livre resolução — e os portes de ida também são reembolsados"
            aberto={!!abertos.devolucoes}
            alternar={() => alternar("devolucoes")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoPercentagem
                id="taxa-devolucao"
                rotulo="Quantas encomendas voltam"
                valor={contexto.custos.taxaDevolucao ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.custos.taxaDevolucao = v))}
                max={90}
              />
              <CampoEuros
                id="custo-devolucao"
                rotulo="Custo médio de uma devolução"
                ajuda="Recolha, reacondicionamento e o que não se recupera. Se o produto fica inutilizável, soma o custo dele."
                valor={contexto.custos.custoDevolucao ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.custos.custoDevolucao = v))}
                max={5000}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("tempo_detalhe") && contexto.tempo ? (
          <Bloco
            titulo="As tuas horas a sério"
            descricao="Ninguém fatura todas as horas que trabalha"
            aberto={!!abertos.tempo}
            alternar={() => alternar("tempo")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoNumero
                id="horas-semana"
                rotulo="Horas de trabalho por semana"
                valor={contexto.tempo.horasSemana}
                aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.horasSemana = v)))}
                sufixo="h"
                max={100}
              />
              <CampoPercentagem
                id="taxa-faturavel"
                rotulo="Percentagem de horas faturáveis"
                ajuda="O resto é proposta, prospeção, administração, deslocação, formação e pós-venda. Entre 50% e 75% é o intervalo defensável."
                valor={contexto.tempo.taxaFaturavel}
                aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.taxaFaturavel = v)))}
                max={100}
              />
              <CampoNumero
                id="semanas-ferias"
                rotulo="Semanas de férias"
                ajuda="Não tens férias pagas: se não trabalhas, não faturas. Por isso as férias entram no preço."
                valor={contexto.tempo.semanasFerias}
                aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.semanasFerias = v)))}
                sufixo="sem."
                decimais={1}
                max={30}
              />
              <CampoNumero
                id="semanas-sem-cliente"
                rotulo="Semanas por ano sem clientes"
                valor={contexto.tempo.semanasSemCliente}
                aoMudar={(v) => atualizar((c) => void (c.tempo && (c.tempo.semanasSemCliente = v)))}
                sufixo="sem."
                decimais={1}
                max={40}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("producao_detalhe") && contexto.producao ? (
          <Bloco
            titulo="Como produzes"
            descricao="Matérias, mão de obra, energia e depreciação do equipamento"
            aberto={!!abertos.producao}
            alternar={() => alternar("producao")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoEuros
                id="custo-hora-mo"
                rotulo="Quanto vale a tua hora de produção"
                valor={contexto.producao.custoHoraMaoObra ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.producao && (c.producao.custoHoraMaoObra = v)))}
                max={500}
              />
              <CampoNumero
                id="horas-producao"
                rotulo="Horas por unidade"
                valor={contexto.producao.horasPorUnidade ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.producao && (c.producao.horasPorUnidade = v)))}
                sufixo="h"
                decimais={2}
                max={1000}
              />
              <CampoEuros
                id="energia"
                rotulo="Energia e consumíveis por unidade"
                valor={contexto.producao.energiaPorUnidade ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.producao && (c.producao.energiaPorUnidade = v)))}
                max={1000}
              />
              <CampoEuros
                id="depreciacao"
                rotulo="Depreciação do equipamento"
                ajuda="A máquina que custou 3 000 € e dura 5 anos são 50 € por mês — existem produzas ou não."
                valor={contexto.producao.depreciacaoMensal ?? 0}
                aoMudar={(v) =>
                  atualizar((c) => {
                    if (c.producao) {
                      c.producao.depreciacaoMensal = v;
                      c.producao.unidadesMes = c.producao.unidadesMes || c.volume.unidadesMes;
                    }
                  })
                }
                max={50_000}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("cac") ? (
          <Bloco
            titulo="Custo de trazer o cliente"
            descricao="Publicidade e aquisição, repartidos pelas vendas que geram"
            aberto={!!abertos.cac}
            alternar={() => alternar("cac")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoEuros
                id="cac"
                rotulo="Custo de adquirir um cliente"
                ajuda="Investimento em publicidade a dividir pelos clientes que ele trouxe."
                valor={contexto.custos.cac ?? 0}
                aoMudar={(v) => atualizar((c) => void (c.custos.cac = v))}
                max={10_000}
              />
              <CampoPercentagem
                id="clientes-novos"
                rotulo="Percentagem de vendas a clientes novos"
                ajuda="Se metade das vendas são a clientes que já tinhas, só metade carrega o custo de aquisição."
                valor={contexto.custos.fracaoClientesNovos ?? 1}
                aoMudar={(v) => atualizar((c) => void (c.custos.fracaoClientesNovos = v))}
                max={100}
              />
            </div>
          </Bloco>
        ) : null}

        {avancados.has("desconto") ? (
          <Bloco
            titulo="Desconto ou promoção"
            descricao="Com a regra legal dos 30 dias e o desconto máximo que aguentas"
            aberto={!!abertos.desconto}
            alternar={() => alternar("desconto")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoPercentagem
                id="desconto"
                rotulo="Desconto que queres dar"
                valor={contexto.desconto?.percentagem ?? 0}
                aoMudar={(v) =>
                  atualizar((c) => {
                    c.desconto = { tipo: c.desconto?.tipo ?? "promocao", percentagem: v };
                  })
                }
                max={90}
              />
              <Seletor
                id="tipo-desconto"
                rotulo="Modalidade"
                ajuda="Saldos e liquidações têm de ser comunicados à ASAE com 5 dias úteis de antecedência. Promoções não."
                opcoes={[
                  { valor: "promocao", rotulo: "Promoção" },
                  { valor: "saldos", rotulo: "Saldos" },
                  { valor: "cupao", rotulo: "Cupão" },
                  { valor: "lancamento", rotulo: "Preço de lançamento" },
                  { valor: "quantidade", rotulo: "Desconto de quantidade" },
                ]}
                valor={contexto.desconto?.tipo ?? "promocao"}
                aoMudar={(v) =>
                  atualizar((c) => {
                    c.desconto = { tipo: v, percentagem: c.desconto?.percentagem ?? 0 };
                  })
                }
              />
            </div>
          </Bloco>
        ) : null}

        {/* ── Comparar com o preço que já tinhas em mente ─────────── */}
        <Bloco
          titulo="Já tinhas um preço em mente?"
          descricao="Diz-nos qual e nós dizemos se fecha as contas"
          aberto={!!abertos.pensado}
          alternar={() => alternar("pensado")}
        >
          <CampoEuros
            id="preco-pensado"
            rotulo="O preço que tinhas pensado (com IVA)"
            valor={contexto.precoPensado ?? 0}
            aoMudar={(v) => atualizar((c) => void (c.precoPensado = v > 0 ? v : undefined))}
            max={1_000_000}
          />
        </Bloco>
      </div>
      ) : null}
    </div>
  );
}

// ─── Lista editável de custos ──────────────────────────────────────────

interface ItemCusto {
  id: string;
  rotulo: string;
  valor: number;
}

function ListaCustos({
  itens,
  sufixo,
  sugestoes,
  aoMudar,
}: {
  itens: ItemCusto[];
  sufixo: string;
  sugestoes: string[];
  aoMudar: (itens: ItemCusto[]) => void;
}) {
  const adicionar = (rotulo: string) =>
    aoMudar([...itens, { id: `c${Date.now()}${itens.length}`, rotulo, valor: 0 }]);

  return (
    <div>
      {itens.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {itens.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                value={item.rotulo}
                onChange={(e) => {
                  const copia = [...itens];
                  copia[i] = { ...item, rotulo: e.target.value };
                  aoMudar(copia);
                }}
                aria-label="Nome do custo"
                className="min-h-[38px] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <div className="relative w-28 flex-shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.valor === 0 ? "" : String(item.valor).replace(".", ",")}
                  onChange={(e) => {
                    const bruto = e.target.value.replace(/[^\d,.]/g, "").replace(",", ".");
                    const n = Number(bruto);
                    const copia = [...itens];
                    copia[i] = { ...item, valor: Number.isFinite(n) ? n : 0 };
                    aoMudar(copia);
                  }}
                  aria-label={`Valor ${sufixo}`}
                  className="min-h-[38px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 pr-12 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 dark:text-stone-400">
                  €{sufixo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => aoMudar(itens.filter((_, j) => j !== i))}
                aria-label={`Remover ${item.rotulo}`}
                className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 dark:text-stone-400 transition-colors hover:border-red-300 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sugestoes
          .filter((s) => !itens.some((i) => i.rotulo === s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="min-h-[36px] rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
            >
              + {s}
            </button>
          ))}
        <button
          type="button"
          onClick={() => adicionar("")}
          className="min-h-[36px] rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
        >
          + Outro
        </button>
      </div>
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
