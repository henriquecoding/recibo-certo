"use client";

import { useEffect, useState } from "react";
import { ATIVOS } from "@/lib/negocio/descoberta/contexto/perguntas";
import type {
  AtivoId,
  DetalheAtivo,
  DetalhesAtivos,
} from "@/lib/negocio/descoberta/contexto/tipos";
import { estadoDaAdequacaoDeclarada } from "@/lib/negocio/descoberta/contexto/adequacao-declarada";
import {
  faixaDaCargaUtil,
  inspecaoJaEAnual,
} from "@/lib/negocio/descoberta/conhecimento/veiculos";
import { Check, ChevronDown } from "@/components/ui/Icons";

const ESTADOS = [
  { id: "por-confirmar", rotulo: "Ainda não confirmei" },
  { id: "adequado", rotulo: "Adequado e funcional" },
  { id: "funcional-com-limitacoes", rotulo: "Funciona com limitações" },
  { id: "precisa-reparacao", rotulo: "Precisa de reparação" },
] as const;

const LIMITACOES = [
  { id: "fiabilidade-incerta", rotulo: "Fiabilidade incerta" },
  { id: "capacidade-reduzida", rotulo: "Capacidade reduzida" },
  { id: "disponibilidade-limitada", rotulo: "Disponibilidade limitada" },
  { id: "uso-partilhado", rotulo: "Uso partilhado" },
  { id: "precisa-adaptacao", rotulo: "Precisa de adaptação" },
] as const;

const VIATURAS: ReadonlySet<AtivoId> = new Set([
  "veiculo-ligeiro",
  "veiculo-carga",
]);

const BASE: DetalheAtivo = {
  estado: "por-confirmar",
  usoProfissional: "por-confirmar",
};

const ANO_ATUAL = new Date().getFullYear();

/** Campo vazio é «não perguntámos», nunca zero. */
function numeroOuIndefinido(
  valor: string,
  minimo: number,
  maximo: number,
): number | undefined {
  if (valor.trim() === "") return undefined;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return undefined;
  return Math.max(minimo, Math.min(maximo, Math.round(numero)));
}

const FAIXA_ROTULO: Readonly<Record<string, string>> = {
  "muito-reduzida": "muito reduzida",
  reduzida: "reduzida",
  media: "média",
  elevada: "elevada",
};

function estadoDo(id: AtivoId, detalhe: DetalheAtivo | undefined) {
  const declarado = estadoDaAdequacaoDeclarada(id, detalhe);
  if (declarado === "por-confirmar") {
    return {
      rotulo: "Por confirmar",
      classe:
        "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    };
  }
  if (declarado === "confirmado") {
    return {
      rotulo: "Confirmado",
      classe:
        "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    };
  }
  if (declarado === "inadequado") {
    return {
      rotulo: "Não utilizável agora",
      classe: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
    };
  }
  return {
    rotulo: "Com limitações",
    classe: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  };
}

const estiloCampo =
  "mt-1 min-h-[42px] w-full rounded-2xl border border-stone-200 bg-white px-3 text-[12px] text-stone-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200";

export default function AdequacaoDosMeios({
  ativos,
  detalhes,
  onChange,
}: {
  ativos: readonly AtivoId[];
  detalhes: DetalhesAtivos | undefined;
  onChange: (proximos: DetalhesAtivos) => void;
}) {
  const [aberto, setAberto] = useState<AtivoId | null>(ativos[0] ?? null);

  useEffect(() => {
    if (aberto && ativos.includes(aberto)) return;
    setAberto(ativos[0] ?? null);
  }, [aberto, ativos]);

  if (ativos.length === 0) return null;

  const alterar = (id: AtivoId, parcial: Partial<DetalheAtivo>) => {
    const atual = detalhes?.[id] ?? BASE;
    onChange({ ...detalhes, [id]: { ...atual, ...parcial } });
  };

  return (
    <div
      data-adequacao-meios
      className="mt-3 rounded-3xl border border-brand/20 bg-brand-light/35 p-3 dark:border-brand/20 dark:bg-brand/5"
    >
      <div className="flex items-start gap-2">
        <Check size={14} className="mt-0.5 flex-none text-brand" />
        <div>
          <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
            Confirma se cada meio serve mesmo
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
            Ter uma viatura, espaço ou ferramenta não prova capacidade, estado
            nem disponibilidade. O que deixares por confirmar pesa menos e nunca
            será apresentado como certeza.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {ativos.map((id) => {
          const meta = ATIVOS.find((item) => item.id === id);
          const detalhe = detalhes?.[id];
          const estado = estadoDo(id, detalhe);
          const expandido = aberto === id;
          const veiculo = VIATURAS.has(id);
          const limitacoes = new Set(detalhe?.limitacoes ?? []);

          return (
            <li
              key={id}
              data-ativo={id}
              className="overflow-hidden rounded-2xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900"
            >
              <button
                type="button"
                aria-expanded={expandido}
                onClick={() => setAberto(expandido ? null : id)}
                className="flex min-h-[48px] w-full items-center gap-2 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              >
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                  {meta?.rotulo ?? id}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${estado.classe}`}
                >
                  {estado.rotulo}
                </span>
                <ChevronDown
                  size={14}
                  className={`flex-none text-stone-400 transition-transform ${expandido ? "rotate-180" : ""}`}
                />
              </button>

              {expandido ? (
                <div className="border-t border-stone-100 p-3 dark:border-stone-800">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                      Estado real
                      <select
                        value={detalhe?.estado ?? "por-confirmar"}
                        onChange={(evento) =>
                          alterar(id, {
                            estado: evento.target
                              .value as DetalheAtivo["estado"],
                          })
                        }
                        className={estiloCampo}
                      >
                        {ESTADOS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.rotulo}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                      Disponibilidade
                      <select
                        value={detalhe?.disponibilidade ?? ""}
                        onChange={(evento) =>
                          alterar(id, {
                            disponibilidade: (evento.target.value ||
                              undefined) as DetalheAtivo["disponibilidade"],
                          })
                        }
                        className={estiloCampo}
                      >
                        <option value="">Por confirmar</option>
                        <option value="sempre">Sempre disponível</option>
                        <option value="parcial">Parte do tempo</option>
                        <option value="ocasional">Só ocasionalmente</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                      Forma de acesso
                      <select
                        value={detalhe?.acesso ?? ""}
                        onChange={(evento) =>
                          alterar(id, {
                            acesso: (evento.target.value ||
                              undefined) as DetalheAtivo["acesso"],
                          })
                        }
                        className={estiloCampo}
                      >
                        <option value="">Por confirmar</option>
                        <option value="proprio">É meu</option>
                        <option value="partilhado">É partilhado</option>
                        <option value="alugado">É alugado</option>
                        <option value="por-reservar">
                          Tenho acesso por reserva
                        </option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                      Pode ser usado profissionalmente?
                      <select
                        value={detalhe?.usoProfissional ?? "por-confirmar"}
                        onChange={(evento) =>
                          alterar(id, {
                            usoProfissional: evento.target
                              .value as DetalheAtivo["usoProfissional"],
                          })
                        }
                        className={estiloCampo}
                      >
                        <option value="por-confirmar">
                          Ainda não confirmei
                        </option>
                        <option value="confirmado">Sim, confirmado</option>
                        <option value="nao">Não</option>
                      </select>
                    </label>
                  </div>

                  {veiculo ? (
                    <fieldset className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                      <legend className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                        Capacidade concreta da viatura
                      </legend>
                      <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
                        Uma carrinha antiga, de dois lugares ou com pouca carga
                        serve algumas rotas e não outras. Os quilos e os
                        centímetros que escreveres mandam sobre a faixa.
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Configuração
                          <select
                            value={
                              detalhe?.veiculo?.configuracao ?? "por-confirmar"
                            }
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  configuracao: evento.target
                                    .value as NonNullable<
                                    DetalheAtivo["veiculo"]
                                  >["configuracao"],
                                },
                              })
                            }
                            className={estiloCampo}
                          >
                            <option value="por-confirmar">Por confirmar</option>
                            <option value="passageiros">Passageiros</option>
                            <option value="misto">Mista</option>
                            <option value="mercadorias">Mercadorias</option>
                          </select>
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Lugares
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={9}
                            value={detalhe?.veiculo?.lugares ?? ""}
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  lugares: evento.target.value
                                    ? Math.max(
                                        1,
                                        Math.min(
                                          9,
                                          Number(evento.target.value),
                                        ),
                                      )
                                    : undefined,
                                },
                              })
                            }
                            placeholder="Por confirmar"
                            className={estiloCampo}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Capacidade de carga útil
                          <select
                            value={detalhe?.veiculo?.capacidadeCarga ?? ""}
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  capacidadeCarga: (evento.target.value ||
                                    undefined) as NonNullable<
                                    DetalheAtivo["veiculo"]
                                  >["capacidadeCarga"],
                                },
                              })
                            }
                            className={estiloCampo}
                          >
                            <option value="">Por confirmar</option>
                            <option value="muito-reduzida">
                              Muito reduzida
                            </option>
                            <option value="reduzida">Reduzida</option>
                            <option value="media">Média</option>
                            <option value="elevada">Elevada</option>
                          </select>
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Inspeção
                          <select
                            value={
                              detalhe?.veiculo?.inspecao ?? "por-confirmar"
                            }
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  inspecao: evento.target.value as NonNullable<
                                    DetalheAtivo["veiculo"]
                                  >["inspecao"],
                                },
                              })
                            }
                            className={estiloCampo}
                          >
                            <option value="por-confirmar">Por confirmar</option>
                            <option value="valida">Válida</option>
                            <option value="nao-valida">Não válida</option>
                          </select>
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Ano da primeira matrícula
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1950}
                            max={ANO_ATUAL}
                            value={detalhe?.veiculo?.anoMatricula ?? ""}
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  anoMatricula: numeroOuIndefinido(
                                    evento.target.value,
                                    1950,
                                    ANO_ATUAL,
                                  ),
                                },
                              })
                            }
                            placeholder="Por confirmar"
                            className={estiloCampo}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          Carga útil, se souberes (kg)
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={3500}
                            value={detalhe?.veiculo?.cargaUtilKg ?? ""}
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  cargaUtilKg: numeroOuIndefinido(
                                    evento.target.value,
                                    0,
                                    3500,
                                  ),
                                },
                              })
                            }
                            placeholder="Prevalece sobre a faixa"
                            className={estiloCampo}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 sm:col-span-2">
                          Circulação
                          <select
                            value={
                              detalhe?.veiculo?.restricoesCirculacao ??
                              "por-confirmar"
                            }
                            onChange={(evento) =>
                              alterar(id, {
                                veiculo: {
                                  ...detalhe?.veiculo,
                                  restricoesCirculacao: evento.target
                                    .value as NonNullable<
                                    DetalheAtivo["veiculo"]
                                  >["restricoesCirculacao"],
                                },
                              })
                            }
                            className={estiloCampo}
                          >
                            <option value="por-confirmar">Por confirmar</option>
                            <option value="sem-restricoes">
                              Circula em qualquer lado
                            </option>
                            <option value="centro-urbano-limitado">
                              Limitada em centro urbano
                            </option>
                          </select>
                        </label>
                      </div>

                      <p className="mt-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                        Zona de carga, em centímetros
                      </p>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {(
                          [
                            ["comprimento", "Comp."],
                            ["largura", "Larg."],
                            ["altura", "Alt."],
                          ] as const
                        ).map(([eixo, rotulo]) => (
                          <label
                            key={eixo}
                            className="text-[10px] font-semibold text-stone-500 dark:text-stone-400"
                          >
                            {rotulo}
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={800}
                              aria-label={`${rotulo === "Comp." ? "Comprimento" : rotulo === "Larg." ? "Largura" : "Altura"} da zona de carga, em centímetros`}
                              value={
                                detalhe?.veiculo?.dimensoesCargaCm?.[eixo] ?? ""
                              }
                              onChange={(evento) =>
                                alterar(id, {
                                  veiculo: {
                                    ...detalhe?.veiculo,
                                    dimensoesCargaCm: {
                                      ...detalhe?.veiculo?.dimensoesCargaCm,
                                      [eixo]: numeroOuIndefinido(
                                        evento.target.value,
                                        0,
                                        800,
                                      ),
                                    },
                                  },
                                })
                              }
                              placeholder="—"
                              className={estiloCampo}
                            />
                          </label>
                        ))}
                      </div>

                      {(() => {
                        const dados = detalhe?.veiculo;
                        const anual = inspecaoJaEAnual(
                          dados?.anoMatricula,
                          dados?.configuracao,
                          ANO_ATUAL,
                        );
                        const kg = dados?.cargaUtilKg;
                        const avisos: string[] = [];
                        if (anual === true) {
                          avisos.push(
                            `Com ${ANO_ATUAL - (dados?.anoMatricula ?? ANO_ATUAL)} anos, a inspeção desta viatura já é anual (DL 144/2017).`,
                          );
                        }
                        if (
                          kg !== undefined &&
                          dados?.capacidadeCarga !== undefined &&
                          faixaDaCargaUtil(kg) !== dados.capacidadeCarga
                        ) {
                          avisos.push(
                            `${kg} kg corresponde a carga ${FAIXA_ROTULO[faixaDaCargaUtil(kg)]} — são os quilos que contam, não a faixa escolhida.`,
                          );
                        }
                        if (avisos.length === 0) return null;
                        return (
                          <p
                            data-leitura-viatura
                            className="mt-2 rounded-2xl bg-stone-50 px-3 py-2 text-[10px] leading-snug text-stone-600 dark:bg-stone-800/60 dark:text-stone-300"
                          >
                            {avisos.join(" ")}
                          </p>
                        );
                      })()}
                    </fieldset>
                  ) : null}

                  <label className="mt-3 block border-t border-stone-100 pt-3 text-[11px] font-semibold text-stone-600 dark:border-stone-800 dark:text-stone-300">
                    Quanto te custa por mês (€)
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={20000}
                      value={detalhe?.custoMensalEur ?? ""}
                      onChange={(evento) =>
                        alterar(id, {
                          custoMensalEur: numeroOuIndefinido(
                            evento.target.value,
                            0,
                            20000,
                          ),
                        })
                      }
                      placeholder="Prestação, aluguer, seguro, manutenção"
                      className={estiloCampo}
                    />
                    <span className="mt-1 block text-[10px] font-normal leading-snug text-stone-500">
                      Deixar em branco não é zero: fica escrito como por
                      orçamentar no cálculo de viabilidade.
                    </span>
                  </label>

                  <fieldset className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                    <legend className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                      Limitações que o motor deve respeitar
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {LIMITACOES.map((item) => {
                        const ativo = limitacoes.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => {
                              const proximas = new Set(limitacoes);
                              if (ativo) proximas.delete(item.id);
                              else proximas.add(item.id);
                              alterar(id, { limitacoes: [...proximas] });
                            }}
                            className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                              ativo
                                ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                                : "border-stone-200 text-stone-500 hover:border-brand/50 dark:border-stone-700 dark:text-stone-400"
                            }`}
                          >
                            {item.rotulo}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
