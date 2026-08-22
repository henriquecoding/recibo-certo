"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FASE A — construir o contexto, antes de qualquer resultado
//  ---------------------------------------------------------------------
//  O defeito que isto corrige está no ponto 1 do pedido: a configuração
//  saía de vista assim que a lista de resultados crescia, e era preciso
//  navegar por cima de cartões para acabar de responder. Configurar e
//  decidir eram a mesma coluna.
//
//  Agora são duas fases. Aqui não há um único cartão de negócio: há o
//  perfil a formar-se, com a leitura do que já sabemos e do que ainda
//  falta. Os resultados só assumem o ecrã quando a pessoa disser que
//  acabou.
//
//  ── PROGRESSIVE DISCLOSURE ─────────────────────────────────────────
//  Três níveis. O essencial são cinco decisões e chega para correr o
//  motor; os outros dois abrem a pedido. Ninguém é obrigado a responder a
//  setenta campos, e quem quiser precisão não fica limitado a cinco.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  ATIVOS,
  DEDICACOES,
  EQUIPAS,
  FAIXAS_CAPITAL,
  MERCADOS,
  NIVEIS,
  PRAZOS_RECEITA,
  PUBLICOS,
  RESTRICOES,
  SETORES_OFERECIDOS,
  COMPETENCIAS_OFERECIDAS,
  type NivelConfiguracao,
} from "@/lib/negocio/descoberta/contexto/perguntas";
import {
  profundidadeDoContexto,
  type Profundidade,
} from "@/lib/negocio/descoberta/contexto/profundidade";
import type {
  AtivoId,
  CompetenciaDeclarada,
  DimensaoRisco,
  NivelCompetencia,
  OpportunityContext,
  PerfilRisco,
  PublicoAlvo,
  RestricaoId,
  TipoExperiencia,
} from "@/lib/negocio/descoberta/contexto/tipos";
import { MARKET_REGIONS, type MarketRegion } from "@/lib/negocio/market/geografia";
import { ROTULO_RISCO } from "@/lib/negocio/descoberta/motor/risco";
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Lock,
  MapPin,
  RotateCcw,
  Scale,
  Search,
  Wallet,
} from "@/components/ui/Icons";
import { BarraProfundidade, Campo, Chip, Opcao, OpcaoMultipla, Seccao } from "./atomos";

const NIVEIS_COMPETENCIA: readonly { id: NivelCompetencia; rotulo: string }[] = [
  { id: "basico", rotulo: "Básico" },
  { id: "intermedio", rotulo: "Intermédio" },
  { id: "avancado", rotulo: "Avançado" },
];

const EXPERIENCIAS: readonly { id: TipoExperiencia; rotulo: string }[] = [
  { id: "interesse", rotulo: "Nunca fiz, tenho interesse" },
  { id: "sei-fazer", rotulo: "Sei fazer" },
  { id: "trabalhei", rotulo: "Já trabalhei nisso" },
  { id: "geri", rotulo: "Já geri isto" },
  { id: "conheco-setor", rotulo: "Conheço o setor" },
  { id: "tenho-contactos", rotulo: "Tenho contactos" },
];

const PERFIS_RISCO: readonly { id: PerfilRisco; rotulo: string }[] = [
  { id: "muito-conservador", rotulo: "Muito conservador" },
  { id: "conservador", rotulo: "Conservador" },
  { id: "moderado", rotulo: "Moderado" },
  { id: "arrojado", rotulo: "Arrojado" },
  { id: "muito-arrojado", rotulo: "Muito arrojado" },
];

const DIMENSOES_RISCO: readonly DimensaoRisco[] = [
  "financeiro",
  "regulatorio",
  "sazonalidade",
  "volatilidade",
];

export interface ConfiguradorProps {
  contexto: OpportunityContext;
  onChange: (proximo: OpportunityContext) => void;
  onDescobrir: () => void;
  onRepor: () => void;
  /** Já houve uma análise? Muda o texto do botão, não o comportamento. */
  jaAnalisou: boolean;
}

export default function Configurador({
  contexto,
  onChange,
  onDescobrir,
  onRepor,
  jaAnalisou,
}: ConfiguradorProps) {
  const [nivel, setNivel] = useState<NivelConfiguracao>("essencial");
  const profundidade = useMemo(() => profundidadeDoContexto(contexto), [contexto]);

  const alterar = (parcial: Partial<OpportunityContext>) => onChange({ ...contexto, ...parcial });

  const alternarCompetencia = (id: string) => {
    const existe = contexto.competencias.some((item) => item.id === id);
    alterar({
      competencias: existe
        ? contexto.competencias.filter((item) => item.id !== id)
        : [...contexto.competencias, { id, nivel: "intermedio" } satisfies CompetenciaDeclarada],
    });
  };

  const atualizarCompetencia = (id: string, parcial: Partial<CompetenciaDeclarada>) =>
    alterar({
      competencias: contexto.competencias.map((item) =>
        item.id === id ? { ...item, ...parcial } : item,
      ),
    });

  const alternarLista = <T,>(lista: readonly T[], valor: T): T[] =>
    lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor];

  const mostrar = (deste: NivelConfiguracao) =>
    deste === "essencial" ||
    (deste === "personalizado" && nivel !== "essencial") ||
    (deste === "avancado" && nivel === "avancado");

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ══ Coluna principal — as perguntas ═══════════════════════ */}
      <div className="space-y-4 lg:col-span-8">
        {/* ── Nível de configuração ───────────────────────────── */}
        <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
          <h2 id="contexto-descoberta" className="font-display text-lg font-semibold text-ink">
            Constrói o teu contexto
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Quanto mais o motor souber, mais diferente é a resposta que te dá. Nada do que escreves
            sai deste dispositivo, e só é guardado se o pedires.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Nível de configuração">
            {NIVEIS.map((item) => (
              <Opcao key={item.id} ativo={nivel === item.id} onClick={() => setNivel(item.id)}>
                {item.rotulo}
              </Opcao>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-stone-500">
            {NIVEIS.find((item) => item.id === nivel)?.nota}
          </p>
        </div>

        {/* ── 1. O que sabes fazer ────────────────────────────── */}
        <Seccao titulo="O que sabes fazer" icone={Briefcase}>
          <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
            É por aqui que o motor começa: sem isto não consegue compor hipótese nenhuma. Escolhe o
            que farias por dinheiro amanhã, não o que gostavas de aprender.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {COMPETENCIAS_OFERECIDAS.map((competencia) => {
              const declarada = contexto.competencias.find((item) => item.id === competencia.id);
              return (
                <div key={competencia.id}>
                  <OpcaoMultipla
                    ativo={Boolean(declarada)}
                    onClick={() => alternarCompetencia(competencia.id)}
                    titulo={competencia.rotulo}
                    nota={competencia.descricao}
                  />
                  {declarada && mostrar("personalizado") ? (
                    <div className="mt-1 flex flex-wrap gap-1 pl-6">
                      {NIVEIS_COMPETENCIA.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={declarada.nivel === item.id}
                          onClick={() => atualizarCompetencia(competencia.id, { nivel: item.id })}
                          className={`min-h-[36px] rounded-full border px-2.5 text-[11px] font-semibold ${
                            declarada.nivel === item.id
                              ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                              : "border-stone-200 text-stone-500 dark:border-stone-700"
                          }`}
                        >
                          {item.rotulo}
                        </button>
                      ))}
                      {mostrar("avancado") ? (
                        <select
                          aria-label={`Experiência em ${competencia.rotulo}`}
                          value={declarada.experiencia ?? ""}
                          onChange={(evento) =>
                            atualizarCompetencia(competencia.id, {
                              experiencia: (evento.target.value || undefined) as TipoExperiencia | undefined,
                            })
                          }
                          className="h-9 rounded-full border border-stone-200 bg-white px-2 text-[11px] font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
                        >
                          <option value="">Experiência…</option>
                          {EXPERIENCIAS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.rotulo}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Seccao>

        {/* ── 2. Onde estás ───────────────────────────────────── */}
        <Seccao titulo="Onde vais operar" icone={MapPin}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ode-regiao" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Zona
              </label>
              <select
                id="ode-regiao"
                value={contexto.localizacao.regiao}
                onChange={(evento) =>
                  alterar({
                    localizacao: { ...contexto.localizacao, regiao: evento.target.value as MarketRegion },
                  })
                }
                className="h-10 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              >
                {MARKET_REGIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                Decide que leituras oficiais são da tua zona e quais entram como contexto nacional.
              </p>
            </div>
            <Campo rotulo="Alcance">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["concelho", "O meu concelho"],
                    ["regiao", "A minha região"],
                    ["nacional", "Todo o país"],
                    ["online", "Só online"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <Opcao
                    key={valor}
                    ativo={contexto.localizacao.alcance === valor}
                    onClick={() => alterar({ localizacao: { ...contexto.localizacao, alcance: valor } })}
                  >
                    {rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Território">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["urbano", "Urbano"],
                      ["suburbano", "Suburbano"],
                      ["rural", "Rural"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.localizacao.territorio === valor}
                      onClick={() =>
                        alterar({
                          localizacao: {
                            ...contexto.localizacao,
                            territorio: contexto.localizacao.territorio === valor ? undefined : valor,
                          },
                        })
                      }
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Raio que aceitas percorrer" nota="Deixa vazio se não for relevante.">
                <div className="flex flex-wrap gap-1.5">
                  {[10, 25, 40, 80].map((km) => (
                    <Opcao
                      key={km}
                      ativo={contexto.localizacao.raioKm === km}
                      onClick={() =>
                        alterar({
                          localizacao: {
                            ...contexto.localizacao,
                            raioKm: contexto.localizacao.raioKm === km ? undefined : km,
                          },
                        })
                      }
                    >
                      {km} km
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>
          ) : null}
        </Seccao>

        {/* ── 3. O que tens ───────────────────────────────────── */}
        <Seccao titulo="O que já tens" icone={Wallet}>
          <Campo
            rotulo="Capital disponível"
            nota="Elimina modelos que não arrancam com o que tens, em vez de os mostrar em nono lugar."
          >
            <div className="flex flex-wrap gap-1.5">
              {FAIXAS_CAPITAL.map((faixa) => (
                <Opcao
                  key={faixa.rotulo}
                  ativo={contexto.capital.disponivelAgora === faixa.valor}
                  onClick={() =>
                    alterar({
                      capital: {
                        ...contexto.capital,
                        disponivelAgora: faixa.valor,
                        precisaComecarSemCapital: faixa.valor === 200 ? true : undefined,
                      },
                    })
                  }
                >
                  {faixa.rotulo}
                </Opcao>
              ))}
            </div>
          </Campo>

          <div className="mt-4">
            <Campo rotulo="Meios que já tens" nota="Uma carrinha ou um terreno abrem hipóteses que não existem sem eles.">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {ATIVOS.map((ativo) => (
                  <OpcaoMultipla
                    key={ativo.id}
                    ativo={contexto.ativos.includes(ativo.id)}
                    onClick={() => alterar({ ativos: alternarLista(contexto.ativos, ativo.id as AtivoId) })}
                    titulo={ativo.rotulo}
                    nota={ativo.nota}
                  />
                ))}
              </div>
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
              <OpcaoMultipla
                ativo={contexto.capital.aberturaCredito === true}
                onClick={() =>
                  alterar({ capital: { ...contexto.capital, aberturaCredito: !contexto.capital.aberturaCredito } })
                }
                titulo="Aceito recorrer a crédito"
                nota="Alarga o teto de capital de forma declarada — não o torna ilimitado."
              />
              <OpcaoMultipla
                ativo={contexto.capital.aberturaInvestidores === true}
                onClick={() =>
                  alterar({
                    capital: { ...contexto.capital, aberturaInvestidores: !contexto.capital.aberturaInvestidores },
                  })
                }
                titulo="Aceito investidores"
                nota="Muda a ambição possível, e a quem prestas contas."
              />
            </div>
          ) : null}
        </Seccao>

        {/* ── 4. Tempo e equipa ───────────────────────────────── */}
        <Seccao titulo="Tempo e equipa" icone={Clock}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Dedicação">
              <div className="flex flex-wrap gap-1.5">
                {DEDICACOES.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.tempo.dedicacao === item.id}
                    onClick={() => alterar({ tempo: { ...contexto.tempo, dedicacao: item.id, horasSemana: undefined } })}
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
            <Campo rotulo="Com quem">
              <div className="flex flex-wrap gap-1.5">
                {EQUIPAS.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.equipa.forma === item.id}
                    onClick={() => alterar({ equipa: { ...contexto.equipa, forma: item.id, pessoas: undefined } })}
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>
          </div>

          {mostrar("personalizado") ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Prazo até à primeira receita" nota="Descarta o que só paga daqui a um ano quando aguentas três meses.">
                <div className="flex flex-wrap gap-1.5">
                  {PRAZOS_RECEITA.map((item) => (
                    <Opcao
                      key={item.rotulo}
                      ativo={contexto.tempo.prazoMaxPrimeiraReceitaMeses === item.meses}
                      onClick={() =>
                        alterar({ tempo: { ...contexto.tempo, prazoMaxPrimeiraReceitaMeses: item.meses } })
                      }
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <div className="self-end">
                <OpcaoMultipla
                  ativo={contexto.equipa.disponibilidadeContratar === true}
                  onClick={() =>
                    alterar({
                      equipa: { ...contexto.equipa, disponibilidadeContratar: !contexto.equipa.disponibilidadeContratar },
                    })
                  }
                  titulo="Aceito contratar"
                  nota="Abre modelos que uma pessoa sozinha não consegue operar."
                />
              </div>
            </div>
          ) : null}
        </Seccao>

        {/* ── 5. Que negócio aceitas ──────────────────────────── */}
        {mostrar("personalizado") ? (
          <Seccao titulo="Que tipo de negócio aceitas" icone={Search}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Quem compra">
                <div className="flex flex-wrap gap-1.5">
                  {MERCADOS.map((item) => (
                    <Opcao
                      key={item.id}
                      ativo={contexto.preferencias.mercado === item.id}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, mercado: item.id } })}
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Formato">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["fisico", "Presencial"],
                      ["hibrido", "Tanto faz"],
                      ["digital", "À distância"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.preferencias.formato === valor}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, formato: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Receita que preferes">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["indiferente", "Tanto faz"],
                      ["recorrente", "Recorrente"],
                      ["pontual", "Por trabalho"],
                      ["contratos", "Contratos"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.preferencias.receita === valor}
                      onClick={() => alterar({ preferencias: { ...contexto.preferencias, receita: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Com quem gostas de trabalhar">
                <div className="flex flex-wrap gap-1.5">
                  {PUBLICOS.map((item) => (
                    <Opcao
                      key={item.id}
                      ativo={contexto.preferencias.publicosPreferidos.includes(item.id)}
                      onClick={() =>
                        alterar({
                          preferencias: {
                            ...contexto.preferencias,
                            publicosPreferidos: alternarLista(
                              contexto.preferencias.publicosPreferidos,
                              item.id as PublicoAlvo,
                            ),
                          },
                        })
                      }
                    >
                      {item.rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>

            {mostrar("avancado") ? (
              <div className="mt-4">
                <Campo rotulo="Setores que te interessam" nota="Vazio = todos. Escolher restringe a sério.">
                  <div className="flex flex-wrap gap-1.5">
                    {SETORES_OFERECIDOS.map((setor) => (
                      <Opcao
                        key={setor.id}
                        ativo={contexto.preferencias.setoresPreferidos.includes(setor.id)}
                        onClick={() =>
                          alterar({
                            preferencias: {
                              ...contexto.preferencias,
                              setoresPreferidos: alternarLista(contexto.preferencias.setoresPreferidos, setor.id),
                            },
                          })
                        }
                      >
                        {setor.rotulo}
                      </Opcao>
                    ))}
                  </div>
                </Campo>
              </div>
            ) : null}
          </Seccao>
        ) : null}

        {/* ── 6. Restrições ───────────────────────────────────── */}
        {mostrar("personalizado") ? (
          <Seccao titulo="O que não queres ou não podes" icone={Lock}>
            <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
              Estas não são preferências fracas: <strong className="font-semibold text-stone-700 dark:text-stone-200">eliminam</strong>.
              O motor passa a recusar em vez de ordenar, e diz-te o que recusou e porquê.
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {RESTRICOES.map((restricao) => (
                <OpcaoMultipla
                  key={restricao.id}
                  ativo={contexto.restricoes.includes(restricao.id)}
                  onClick={() => alterar({ restricoes: alternarLista(contexto.restricoes, restricao.id as RestricaoId) })}
                  titulo={restricao.rotulo}
                  nota={restricao.nota}
                />
              ))}
            </div>
          </Seccao>
        ) : null}

        {/* ── 7. Risco e rendimento ───────────────────────────── */}
        {mostrar("avancado") ? (
          <Seccao titulo="Risco e rendimento" icone={Scale}>
            <Campo rotulo="Perfil geral de risco">
              <div className="flex flex-wrap gap-1.5">
                {PERFIS_RISCO.map((item) => (
                  <Opcao
                    key={item.id}
                    ativo={contexto.risco.perfil === item.id}
                    onClick={() => alterar({ risco: { ...contexto.risco, perfil: item.id } })}
                  >
                    {item.rotulo}
                  </Opcao>
                ))}
              </div>
            </Campo>

            <div className="mt-4">
              <Campo
                rotulo="Tolerância por dimensão"
                nota="Uma etiqueta só esconde que podes aceitar receita volátil e não aceitar risco regulatório nenhum."
              >
                <div className="space-y-2">
                  {DIMENSOES_RISCO.map((dimensao) => (
                    <div key={dimensao} className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={`risco-${dimensao}`}
                        className="min-w-[9rem] flex-1 text-[12px] text-stone-600 dark:text-stone-300"
                      >
                        {ROTULO_RISCO[dimensao]}
                      </label>
                      <select
                        id={`risco-${dimensao}`}
                        value={contexto.risco.toleranciaPorDimensao?.[dimensao] ?? ""}
                        onChange={(evento) => {
                          const valor = evento.target.value as PerfilRisco | "";
                          const proximo = { ...(contexto.risco.toleranciaPorDimensao ?? {}) };
                          if (valor === "") delete proximo[dimensao];
                          else proximo[dimensao] = valor;
                          alterar({
                            risco: {
                              ...contexto.risco,
                              toleranciaPorDimensao: Object.keys(proximo).length > 0 ? proximo : undefined,
                            },
                          });
                        }}
                        className="h-10 rounded-xl border border-stone-200 bg-white px-2 text-[11px] font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
                      >
                        <option value="">Como o perfil geral</option>
                        {PERFIS_RISCO.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Campo>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo rotulo="O que queres deste negócio">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["complemento", "Complemento"],
                      ["substituir-salario", "Substituir salário"],
                      ["crescer", "Crescer"],
                      ["escalar", "Empresa escalável"],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <Opcao
                      key={valor}
                      ativo={contexto.rendimento.ambicao === valor}
                      onClick={() => alterar({ rendimento: { ...contexto.rendimento, ambicao: valor } })}
                    >
                      {rotulo}
                    </Opcao>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Mínimo mensal que precisas de tirar">
                <div className="flex flex-wrap gap-1.5">
                  {[undefined, 500, 1000, 1500, 2500].map((valor) => (
                    <Opcao
                      key={String(valor)}
                      ativo={contexto.rendimento.minimoMensal === valor}
                      onClick={() => alterar({ rendimento: { ...contexto.rendimento, minimoMensal: valor } })}
                    >
                      {valor === undefined ? "Ainda não sei" : `${valor.toLocaleString("pt-PT")} €`}
                    </Opcao>
                  ))}
                </div>
              </Campo>
            </div>
          </Seccao>
        ) : null}
      </div>

      {/* ══ Coluna lateral — o perfil a formar-se ═════════════════ */}
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <ResumoDoPerfil
            contexto={contexto}
            profundidade={profundidade}
            onDescobrir={onDescobrir}
            onRepor={onRepor}
            jaAnalisou={jaAnalisou}
            onAbrirNivel={() => setNivel(nivel === "essencial" ? "personalizado" : "avancado")}
            nivel={nivel}
          />
        </div>
      </aside>
    </div>
  );
}

/**
 * O perfil a formar-se — e nenhum cartão de negócio à vista.
 *
 * Ponto 7 do pedido: durante a configuração pode mostrar-se o perfil a
 * ganhar forma, mas não começar a despejar resultados. Esta caixa é
 * exatamente isso, e o botão que a fecha é o que inicia o motor.
 */
function ResumoDoPerfil({
  contexto,
  profundidade,
  onDescobrir,
  onRepor,
  jaAnalisou,
  onAbrirNivel,
  nivel,
}: {
  contexto: OpportunityContext;
  profundidade: Profundidade;
  onDescobrir: () => void;
  onRepor: () => void;
  jaAnalisou: boolean;
  onAbrirNivel: () => void;
  nivel: NivelConfiguracao;
}) {
  const zona = MARKET_REGIONS.find((item) => item.id === contexto.localizacao.regiao)?.label ?? "";
  const linhas: readonly [string, string][] = [
    ["Sabes fazer", contexto.competencias.length === 0 ? "por responder" : `${contexto.competencias.length} ${contexto.competencias.length === 1 ? "competência" : "competências"}`],
    ["Zona", zona],
    ["Capital", contexto.capital.disponivelAgora === undefined ? "por declarar" : `até ${contexto.capital.disponivelAgora.toLocaleString("pt-PT")} €`],
    ["Meios", contexto.ativos.length === 0 ? "nenhum declarado" : `${contexto.ativos.length} ${contexto.ativos.length === 1 ? "meio" : "meios"}`],
    ["Tempo", DEDICACOES.find((item) => item.id === contexto.tempo.dedicacao)?.rotulo ?? ""],
    ["Restrições", contexto.restricoes.length === 0 ? "nenhuma" : `${contexto.restricoes.length} declaradas`],
    ["Risco", PERFIS_RISCO.find((item) => item.id === contexto.risco.perfil)?.rotulo ?? ""],
  ];

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <h2 className="font-display text-base font-semibold text-ink">O teu perfil está a formar-se</h2>

      <div className="mt-3">
        <BarraProfundidade percentagem={profundidade.percentagem} />
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex items-baseline justify-between gap-2 text-[12px]">
            <dt className="flex-none text-stone-500">{rotulo}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-stone-700 dark:text-stone-200">{valor}</dd>
          </div>
        ))}
      </dl>

      {profundidade.emFalta.length > 0 ? (
        <div className="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            O que mais mudaria o resultado
          </p>
          <ul className="mt-2 space-y-1.5">
            {profundidade.emFalta.slice(0, 3).map((campo) => (
              <li key={campo.id} className="text-[11px] leading-snug text-stone-500">
                <strong className="font-semibold text-stone-700 dark:text-stone-200">{campo.rotulo}</strong> — {campo.efeito}
              </li>
            ))}
          </ul>
          {nivel !== "avancado" ? (
            <button
              type="button"
              onClick={onAbrirNivel}
              className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[11px] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
            >
              Abrir mais perguntas <ChevronDown size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <button
          type="button"
          onClick={onDescobrir}
          disabled={!profundidade.suficienteParaCorrer}
          className="btn-shine inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card transition-shadow hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          {jaAnalisou ? "Voltar a analisar" : "Descobrir oportunidades"} <ArrowRight size={15} />
        </button>
        {!profundidade.suficienteParaCorrer ? (
          <p className="text-[11px] leading-snug text-stone-500">
            Escolhe pelo menos uma coisa que sabes fazer. Sem isso o motor não tem por onde começar —
            e preferimos dizer isto a devolver uma lista genérica.
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-stone-500">
            <Check size={12} className="mt-0.5 flex-none text-brand" />
            Já dá para correr. Cada resposta que acrescentares muda o que sai — e o que é descartado.
          </p>
        )}
        <button
          type="button"
          onClick={onRepor}
          className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-[11px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
        >
          <RotateCcw size={12} /> Recomeçar
        </button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-500 dark:border-stone-800">
        <Lock size={12} className="mt-0.5 flex-none text-brand" />
        <span>
          <Chip>Local</Chip> Nada disto sai do dispositivo. O perfil só é guardado se carregares em
          «Guardar o meu perfil», depois da análise.
        </span>
      </p>
    </div>
  );
}
