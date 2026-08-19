"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Os blocos de custo: fixos, variáveis, escalões, produção e aquisição.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { CampoEuros, CampoNumero, CampoPercentagem, Segmentado } from "../atomos";
import ListaCustos from "../ListaCustos";
import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import { Plus, Close } from "@/components/ui/Icons";
import type { PropsBloco } from "./tipos";

export function CustosFixos({ contexto, atualizar }: PropsBloco) {
  const total = contexto.custos.fixos.reduce((s, f) => s + f.mensal, 0);
  return (
    <div>
      <ListaCustos
        nomeLista="Custo fixo"
        itens={contexto.custos.fixos.map((f) => ({ id: f.id, rotulo: f.rotulo, valor: f.mensal }))}
        sufixo="/mês"
        sugestoes={["Renda", "Contabilidade", "Software", "Seguros", "Telecomunicações", "Marketing"]}
        aoMudar={(itens) =>
          atualizar("custos-fixos", (c) => {
            c.custos.fixos = itens.map((i) => ({ id: i.id, rotulo: i.rotulo, mensal: i.valor }));
          })
        }
      />
      {contexto.custos.fixos.length > 0 ? (
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Total: <strong className="tabular-nums">{fmt(total)}</strong> por mês
          {contexto.volume.unidadesMes > 0 ? (
            <>
              {" "}
              — <strong className="tabular-nums">{fmt(total / contexto.volume.unidadesMes)}</strong> por unidade, às{" "}
              {contexto.volume.unidadesMes} vendas que esperas
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function CustosVariaveis({ contexto, atualizar }: PropsBloco) {
  return (
    <div>
      <ListaCustos
        nomeLista="Custo variável"
        itens={contexto.custos.variaveis.map((v) => ({ id: v.id, rotulo: v.rotulo, valor: v.porUnidade }))}
        sufixo="/un."
        sugestoes={["Embalagem", "Etiqueta", "Consumíveis", "Cartão de agradecimento"]}
        aoMudar={(itens) =>
          atualizar("custos-variaveis", (c) => {
            c.custos.variaveis = itens.map((i) => ({ id: i.id, rotulo: i.rotulo, porUnidade: i.valor }));
          })
        }
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CampoEuros
          id="portes"
          rotulo="Portes que pagas tu"
          descricao="Envio grátis para o cliente não é grátis para ti. Entra aqui o custo médio por encomenda."
          valor={contexto.custos.portesAbsorvidos ?? 0}
          aoMudar={(v) => atualizar("portes", (c) => void (c.custos.portesAbsorvidos = v))}
          max={500}
        />
        <CampoPercentagem
          id="desperdicio"
          rotulo="Desperdício ou quebra"
          ajuda="O desperdício divide, não multiplica: 10% de quebra é custo ÷ 0,9, e não custo × 1,1."
          descricao="Se 10% do que produzes ou compras se perde, cada unidade vendida carrega o custo de 1,11 unidades — não de 1,10."
          valor={contexto.custos.desperdicio ?? 0}
          aoMudar={(v) => atualizar("desperdicio", (c) => void (c.custos.desperdicio = v))}
          max={90}
        />
      </div>
    </div>
  );
}

/**
 * Escalões de quantidade.
 *
 * O tipo `EscalaoQuantidade` existe desde o primeiro dia, `motores/custos.ts`
 * sabe resolvê-los, e `perguntas.ts` declarava-os no cenário «produto para
 * revender» — mas não havia interface nenhuma para os introduzir. Um bloco
 * declarado que não existe é pior do que um bloco em falta: promete uma
 * capacidade que a ferramenta não tem.
 */
export function Escaloes({ contexto, atualizar }: PropsBloco) {
  const escaloes = contexto.custos.escaloes ?? [];

  const mudar = (i: number, patch: Partial<{ quantidade: number; custoUnitario: number }>) =>
    atualizar("escaloes", (c) => {
      const lista = [...(c.custos.escaloes ?? [])];
      lista[i] = { ...lista[i], ...patch };
      c.custos.escaloes = lista;
    });

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        A partir de cada quantidade, o custo unitário passa a ser o que indicares. É uma escada, não uma rampa: 60
        unidades com escalões a 50 e a 100 pagam o preço do escalão de 50 — interpolar inventaria um desconto que o
        fornecedor não deu.
      </p>

      {escaloes.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {escaloes.map((e, i) => (
            <li key={`${i}-${e.quantidade}`} className="flex items-center gap-2">
              <div className="relative w-28 flex-shrink-0">
                <LocalizedNumberInput
                  value={e.quantidade}
                  onValueChange={(v) => mudar(i, { quantidade: v })}
                  min={1}
                  max={1_000_000}
                  maxDecimals={0}
                  inputMode="numeric"
                  aria-label={`Escalão ${i + 1} — a partir de quantas unidades`}
                  className="min-h-[38px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 pr-10 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 dark:text-stone-400"
                >
                  un.
                </span>
              </div>
              <span className="flex-shrink-0 text-xs text-stone-500 dark:text-stone-400">custam</span>
              <div className="relative min-w-0 flex-1">
                <LocalizedNumberInput
                  value={e.custoUnitario}
                  onValueChange={(v) => mudar(i, { custoUnitario: v })}
                  min={0}
                  max={1_000_000}
                  inputMode="decimal"
                  aria-label={`Escalão ${i + 1} — custo por unidade`}
                  className="min-h-[38px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 pr-14 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 dark:text-stone-400"
                >
                  €/un.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  atualizar("escaloes", (c) => {
                    c.custos.escaloes = (c.custos.escaloes ?? []).filter((_, j) => j !== i);
                  })
                }
                aria-label={`Remover o escalão a partir de ${e.quantidade} unidades`}
                className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-red-300 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
              >
                <Close size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() =>
          atualizar("escaloes", (c) => {
            const lista = [...(c.custos.escaloes ?? [])];
            const ultimo = lista[lista.length - 1];
            lista.push({
              quantidade: ultimo ? ultimo.quantidade * 2 : Math.max(10, c.volume.unidadesMes),
              custoUnitario: ultimo ? ultimo.custoUnitario : c.custos.direto.valor,
            });
            c.custos.escaloes = lista;
          })
        }
        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
      >
        <Plus size={11} />
        Acrescentar escalão
      </button>
    </div>
  );
}

/**
 * Produção própria.
 *
 * `ComponenteMateria[]` é uma lista desde sempre e a interface só deixava
 * editar a primeira — quem faz um bolo com farinha, ovos e cobertura não
 * conseguia dizê-lo. Agora a lista é uma lista.
 */
export function Producao({ contexto, atualizar }: PropsBloco) {
  const materias = contexto.producao?.materias ?? [];

  const mudarMateria = (i: number, patch: (m: NonNullable<typeof contexto.producao>["materias"][number]) => void) =>
    atualizar("materias", (c) => {
      if (c.producao?.materias[i]) patch(c.producao.materias[i]);
    });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
          Matérias-primas
          <span className="ml-1.5 font-normal text-stone-500 dark:text-stone-400">
            — o custo do lote e quantas unidades saem dele
          </span>
        </p>

        <ul className="space-y-2">
          {materias.map((mat, i) => (
            <li key={mat.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mat.rotulo}
                  onChange={(e) => mudarMateria(i, (m) => void (m.rotulo = e.target.value))}
                  aria-label={`Nome da matéria ${i + 1}`}
                  placeholder="Nome"
                  className="min-h-[38px] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
                {materias.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      atualizar("materias", (c) => {
                        if (c.producao) c.producao.materias = c.producao.materias.filter((_, j) => j !== i);
                      })
                    }
                    aria-label={`Remover ${mat.rotulo.trim() || `matéria ${i + 1}`}`}
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-red-300 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
                  >
                    <Close size={13} />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <CampoEuros
                  id={`materia-lote-${i}`}
                  rotulo="Custo do lote"
                  valor={mat.custoLote.valor}
                  aoMudar={(v) => mudarMateria(i, (m) => void (m.custoLote.valor = v))}
                />
                <CampoNumero
                  id={`materia-unidades-${i}`}
                  rotulo="Unidades por lote"
                  valor={mat.unidadesPorLote}
                  aoMudar={(v) => mudarMateria(i, (m) => void (m.unidadesPorLote = Math.max(1, v)))}
                  sufixo="un."
                />
                <Segmentado
                  rotulo="Inclui IVA?"
                  colunas={2}
                  opcoes={[
                    { valor: "sim", rotulo: "Com" },
                    { valor: "nao", rotulo: "Sem" },
                  ]}
                  valor={mat.custoLote.incluiIVA ? "sim" : "nao"}
                  aoMudar={(v) => mudarMateria(i, (m) => void (m.custoLote.incluiIVA = v === "sim"))}
                />
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            atualizar("materias", (c) => {
              if (!c.producao) return;
              c.producao.materias = [
                ...c.producao.materias,
                {
                  id: `m${Date.now()}`,
                  rotulo: "",
                  custoLote: { valor: 0, incluiIVA: true, escalao: "normal" },
                  unidadesPorLote: 1,
                },
              ];
            })
          }
          className="mt-3 inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
        >
          <Plus size={11} />
          Acrescentar matéria
        </button>
      </div>

      <div className="grid gap-4 border-t border-stone-100 pt-4 dark:border-stone-800 sm:grid-cols-2">
        <CampoEuros
          id="custo-hora-mo"
          rotulo="Quanto vale a tua hora de produção"
          descricao="O que pagarias a alguém para fazer isto por ti."
          valor={contexto.producao?.custoHoraMaoObra ?? 0}
          aoMudar={(v) => atualizar("custo-hora-mo", (c) => void (c.producao && (c.producao.custoHoraMaoObra = v)))}
          max={500}
        />
        <CampoNumero
          id="horas-producao"
          rotulo="Horas por unidade"
          valor={contexto.producao?.horasPorUnidade ?? 0}
          aoMudar={(v) => atualizar("horas-producao", (c) => void (c.producao && (c.producao.horasPorUnidade = v)))}
          sufixo="h"
          decimais={2}
          max={1000}
        />
        <CampoEuros
          id="energia"
          rotulo="Energia e consumíveis por unidade"
          valor={contexto.producao?.energiaPorUnidade ?? 0}
          aoMudar={(v) => atualizar("energia", (c) => void (c.producao && (c.producao.energiaPorUnidade = v)))}
          max={1000}
        />
        <CampoEuros
          id="depreciacao"
          rotulo="Depreciação do equipamento"
          descricao="A máquina que custou 3 000 € e dura 5 anos são 50 € por mês — existem, produzas ou não."
          valor={contexto.producao?.depreciacaoMensal ?? 0}
          aoMudar={(v) =>
            atualizar("depreciacao", (c) => {
              if (c.producao) {
                c.producao.depreciacaoMensal = v;
                c.producao.unidadesMes = c.producao.unidadesMes || c.volume.unidadesMes;
              }
            })
          }
          max={50_000}
        />
      </div>
    </div>
  );
}

export function Cac({ contexto, atualizar }: PropsBloco) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoEuros
        id="cac"
        rotulo="Custo de adquirir um cliente"
        descricao="O investimento em publicidade a dividir pelos clientes que ele trouxe."
        valor={contexto.custos.cac ?? 0}
        aoMudar={(v) => atualizar("cac", (c) => void (c.custos.cac = v))}
        max={10_000}
      />
      <CampoPercentagem
        id="clientes-novos"
        rotulo="Percentagem de vendas a clientes novos"
        descricao="Se metade das vendas são a clientes que já tinhas, só metade carrega o custo de aquisição."
        valor={contexto.custos.fracaoClientesNovos ?? 1}
        aoMudar={(v) => atualizar("clientes-novos", (c) => void (c.custos.fracaoClientesNovos = v))}
        max={100}
      />
    </div>
  );
}

export function Desperdicio({ contexto, atualizar }: PropsBloco) {
  return (
    <CampoPercentagem
      id="desperdicio-so"
      rotulo="Desperdício ou quebra"
      ajuda="O desperdício divide, não multiplica: 10% de quebra é custo ÷ 0,9, e não custo × 1,1."
      descricao="Se 10% do que produzes ou compras se perde, cada unidade vendida carrega o custo de 1,11 unidades."
      valor={contexto.custos.desperdicio ?? 0}
      aoMudar={(v) => atualizar("desperdicio", (c) => void (c.custos.desperdicio = v))}
      max={90}
    />
  );
}
