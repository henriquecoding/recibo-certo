"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O ESTÚDIO DE VIABILIDADE — a composição
//  ---------------------------------------------------------------------
//  Este componente NÃO calcula nada. Guarda o `ContextoNegocio`,
//  entrega-o a `analisarNegocio()` e desenha o que vem de volta — a mesma
//  separação que `SimuladorPreco` tem com a pricing engine, e pela mesma
//  razão: a matemática é testável, a interface não.
//
//  ── A JORNADA É UMA CONVERSA, NÃO UM WIZARD ────────────────────────
//  §35: «não criar wizard rígido de 12 páginas». Os atos existem, mas
//  são SECÇÕES de um documento só — a pessoa vê onde está, salta para
//  onde quer e volta atrás sem perder nada. O único ecrã que substitui
//  tudo é a calculadora de preço, e só porque é uma ferramenta inteira.
//
//  ── O QUE ABRE, E QUANDO ───────────────────────────────────────────
//  A mesma filosofia da v2.86: mais capacidade total, menos complexidade
//  simultânea. Sensibilidade, caixa, comparação fiscal e próximos passos
//  só aparecem quando há um negócio para analisar — antes disso são
//  perguntas sobre uma coisa que ainda não existe.
//
//  ── PRIVACIDADE ────────────────────────────────────────────────────
//  O rascunho vive no cofre local e não sai de lá. «Guardar este
//  projeto» é uma ação explícita e separada — autosave local nunca é
//  consentimento para a nuvem.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  analisarNegocio,
  contextoNegocioVazio,
  detetarDuplicacoes,
  manterNaOferta,
  moverParaEstrutura,
  novaOferta,
  novoCustoEstrutura,
  novoInvestimento,
  novoTrabalhador,
  type CategoriaCustoEstrutura,
  type CategoriaInvestimento,
  type CaixaNegocio,
  type ContextoNegocio,
  type CustoEstrutura,
  type DuplicacaoCusto,
  type EnquadramentoPretendido,
  type InvestimentoInicial,
  type MaturidadeNegocio,
  type OfertaNegocio,
  type TrabalhadorPlaneado,
  type VolumeOferta,
} from "@/lib/negocio";
import { confirmados } from "@/lib/negocio/pressupostos";
import { agregar } from "@/lib/negocio/agregar";
import { localizacaoDeclarada, regiaoDoNegocio } from "@/lib/negocio/localizacao";
import { migrarNegocioV1ParaV2 } from "@/lib/negocio/migracoes/v1-v2";
import { gravarRascunhoNegocio, lerRascunhoNegocio, limparRascunhoNegocio } from "@/lib/store/negocio";
import { consumirReabertura } from "@/lib/store/cenarios";
import type { CenarioInicial, ContextoPreco } from "@/lib/pricing/tipos";
import { ArrowLeft, RotateCcw } from "@/components/ui/Icons";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SeletorMaturidade from "./SeletorMaturidade";
import BaseNegocioEditor from "./BaseNegocio";
import LocalizacaoNegocioEditor from "./LocalizacaoNegocio";
import ProcuraNegocioEditor from "./ProcuraNegocio";
import PortfolioOfertas from "./PortfolioOfertas";
import EstruturaNegocioEditor from "./EstruturaNegocio";
import CockpitViabilidade from "./CockpitViabilidade";
import ResumoNegocio from "./ResumoNegocio";
import LivroPressupostos from "./LivroPressupostos";
import ProximoPassoNegocio from "./ProximoPassoNegocio";
import GuardarProjeto from "./GuardarProjeto";
import { BotaoTexto } from "./atomos";
import { useMedicaoNegocio } from "./medicao";

// ── Carregamento por proximidade ──────────────────────────────────────
//  A calculadora de preço arrasta a engine inteira; a sensibilidade corre
//  o agregador dezasseis vezes; a caixa projeta 36 meses. Nada disso pesa
//  no primeiro ecrã de quem ainda está a escolher se tem uma ideia ou uma
//  empresa. Cada um é um chunk próprio (§27).
const SimuladorPreco = dynamic(() => import("@/components/precos/SimuladorPreco"), {
  ssr: false,
  loading: () => <Esqueleto altura={520} rotulo="A carregar a calculadora de preço…" />,
});
const SensibilidadeNegocio = dynamic(() => import("./SensibilidadeNegocio"), {
  ssr: false,
  loading: () => <Esqueleto altura={220} rotulo="A carregar a análise de sensibilidade…" />,
});
const ProjecaoCaixa = dynamic(() => import("./ProjecaoCaixa"), {
  ssr: false,
  loading: () => <Esqueleto altura={220} rotulo="A carregar a projeção de caixa…" />,
});
const ComparacaoNegocio = dynamic(() => import("./ComparacaoNegocio"), {
  ssr: false,
  loading: () => <Esqueleto altura={280} rotulo="A carregar a comparação fiscal…" />,
});
// Arrasta `EnviarAoContabilista`, que por sua vez arrasta o cliente
// Supabase. Nada disso pesa em quem nunca chega à conclusão.
const ConclusaoNegocio = dynamic(() => import("./ConclusaoNegocio"), {
  ssr: false,
  loading: () => <Esqueleto altura={320} rotulo="A carregar a conclusão…" />,
});
// §77 — o handoff é transformação de dados, não o motor de empresa. Ainda
// assim carrega à parte: só interessa a quem chega ao fim do percurso.
const ContinuarNaEmpresa = dynamic(() => import("./ContinuarNaEmpresa"), {
  ssr: false,
  loading: () => <Esqueleto altura={180} rotulo="A preparar a continuidade…" />,
});
const SituacaoIVANegocio = dynamic(() => import("./SituacaoIVANegocio"), {
  ssr: false,
  loading: () => <Esqueleto altura={200} rotulo="A carregar a situação de IVA…" />,
});
// §88 — três agregações completas com projeção de caixa. Nada disto pesa
// em quem nunca faz a pergunta.
const DecisaoContratar = dynamic(() => import("./DecisaoContratar"), {
  ssr: false,
  loading: () => <Esqueleto altura={200} rotulo="A carregar a decisão de contratar…" />,
});

function Esqueleto({ altura, rotulo }: { altura: number; rotulo: string }) {
  return (
    <div
      className="animate-pulse rounded-4xl border border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      style={{ minHeight: altura }}
      aria-hidden
    >
      <div className="h-6 w-40 max-w-full rounded-full bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-24 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <span className="sr-only">{rotulo}</span>
    </div>
  );
}

/** Que oferta está a ser editada na calculadora, ou nenhuma. */
type Edicao = { ofertaId: string } | { nova: true } | null;

export default function NegocioStudio() {
  const [contexto, setContexto] = useState<ContextoNegocio | null>(null);
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [mostrarSensibilidade, setMostrarSensibilidade] = useState(false);
  const [caixaAtiva, setCaixaAtiva] = useState(false);
  const retomou = useRef(false);

  // ── O FOCO NÃO PODE CAIR NO CHÃO ──────────────────────────────────
  //  Entrar na calculadora e voltar dela troca o ECRÃ INTEIRO: o
  //  elemento que tinha o foco é desmontado e, sem nada a apanhá-lo, o
  //  foco volta ao `<body>`. Quem navega por teclado carrega em «Tenho
  //  uma ideia», a calculadora aparece — e o Tab seguinte recomeça no
  //  topo do documento, percorrendo a navegação toda outra vez.
  //
  //  ⚠️ MEDIDO, NÃO IMAGINADO: `auditar-teclado-negocio.mjs` apanhou-o
  //  («o foco não cai para o body ao trocar de ecrã») depois de o axe ter
  //  dado zero violações nas 24 combinações. É a mesma falha que
  //  `SeccaoRevelavel` já tinha corrigido para as secções — aqui é para
  //  o ecrã inteiro, e nenhuma ferramenta automática de acessibilidade a
  //  vê.
  //
  //  A primeira montagem NÃO conta: focar um contentor sem ninguém ter
  //  pedido nada rouba o foco a quem acabou de chegar à página.
  const palco = useRef<HTMLDivElement>(null);
  const trocou = useRef(false);
  useEffect(() => {
    if (!trocou.current) {
      trocou.current = true;
      return;
    }
    palco.current?.focus();
  }, [edicao]);

  // ── Retomar, uma vez, à entrada ─────────────────────────────────
  //  Duas origens, e a ORDEM importa: um projeto que a pessoa acabou de
  //  mandar reabrir a partir dos cenários guardados ganha sempre ao
  //  rascunho local, senão carregava-se o trabalho antigo por cima do que
  //  ela pediu — e o botão «reabrir» parecia não fazer nada.
  useEffect(() => {
    if (retomou.current) return;
    retomou.current = true;

    const reaberto = consumirReabertura("negocio");
    // §95 — nunca `as` sobre um instantâneo guardado. Um cenário criado
    // antes da v2 tem trabalhadores no contrato antigo, e o `as` só
    // adiava o erro até ao primeiro acesso a `t.remuneracao`.
    const c = migrarNegocioV1ParaV2(reaberto?.contexto);
    if (c) {
      setContexto(c);
      setCaixaAtiva(Boolean(c.caixa));
      return;
    }

    const lido = lerRascunhoNegocio();
    if (lido) {
      setContexto(lido);
      setCaixaAtiva(Boolean(lido.caixa));
    }
  }, []);

  // ── Autosave LOCAL, e só local ──────────────────────────────────
  useEffect(() => {
    if (contexto) gravarRascunhoNegocio(contexto);
  }, [contexto]);

  /**
   * A mutação central. Devolve sempre um contexto NOVO e carimba
   * `atualizadoEm` — sem isto, dois projetos guardados no mesmo dia eram
   * indistinguíveis na lista de cenários.
   */
  const mudar = useCallback((patch: (c: ContextoNegocio) => ContextoNegocio) => {
    setContexto((atual) => {
      if (!atual) return atual;
      const proximo = patch(atual);
      return { ...proximo, meta: { ...proximo.meta, atualizadoEm: new Date().toISOString() } };
    });
  }, []);

  const negocio = useMemo(
    () =>
      contexto
        ? analisarNegocio(contexto, { comSensibilidade: mostrarSensibilidade, comCaixa: caixaAtiva })
        : null,
    [contexto, mostrarSensibilidade, caixaAtiva],
  );

  const duplicacoes = useMemo(() => (contexto ? detetarDuplicacoes(contexto) : []), [contexto]);
  const jaConfirmados = useMemo(
    () => (contexto ? confirmados(contexto, agregar(contexto)) : []),
    [contexto],
  );

  // ── Medição: a FORMA do percurso, nunca os números ──────────────
  useMedicaoNegocio({
    ativo: contexto !== null,
    confianca: negocio?.confianca ?? "exploratorio",
    numeroOfertas: contexto?.ofertas.length ?? 0,
    temEstrutura: (contexto?.estrutura.overheadMensal.length ?? 0) > 0,
    temResultado: (negocio?.receitaSemIVAMes ?? 0) > 0,
    temCaixa: caixaAtiva,
  });

  // ── ATO 0 ────────────────────────────────────────────────────────
  if (!contexto) {
    return (
      <SeletorMaturidade
        aoEscolher={(maturidade: MaturidadeNegocio) => {
          const novo = contextoNegocioVazio(maturidade);
          setContexto(novo);
          // Quem já tem empresa não quer começar por definir uma oferta:
          // quer a estrutura e a comparação. A porta de entrada decide
          // mesmo o que se vê a seguir — senão era uma pergunta decorativa.
          if (maturidade !== "empresa_existente") setEdicao({ nova: true });
        }}
      />
    );
  }

  // ── ATO 2 — a calculadora de preço, em ecrã inteiro ─────────────
  //  Substitui o resto de propósito: é uma ferramenta completa, com o seu
  //  próprio resultado, os seus próprios avisos e cinco níveis de
  //  profundidade. Metê-la dentro de um acordeão do estúdio seria pedir a
  //  alguém que trabalhasse numa gaveta.
  if (edicao) {
    const ofertaEmEdicao =
      "ofertaId" in edicao ? contexto.ofertas.find((o) => o.id === edicao.ofertaId) : undefined;

    return (
      <m.div
        ref={palco}
        // `-1` para receber o foco por programa sem entrar na ordem do
        // Tab: quem passa por aqui a tabular não leva um passo extra.
        tabIndex={-1}
        aria-label="Definir o preço desta oferta"
        className="focus:outline-none"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-sm text-stone-600 dark:text-stone-300">
            {ofertaEmEdicao ? (
              <>
                A definir o preço de <strong className="text-stone-800 dark:text-stone-100">{ofertaEmEdicao.nome}</strong>
              </>
            ) : (
              "O que vai gerar dinheiro?"
            )}
          </p>
          <BotaoTexto tom="marca" onClick={() => setEdicao(null)}>
            <ArrowLeft size={13} />
            Voltar ao negócio
          </BotaoTexto>
        </div>

        <ErrorBoundary>
          <SimuladorPreco
            superficie="negocio"
            contextoInicial={ofertaEmEdicao?.pricing ?? null}
            respondidosIniciais={ofertaEmEdicao?.respondidos}
            // §4 — a porta de entrada decide a PERGUNTA INICIAL, não só a
            // copy. Quem já vende começa pelo preço que pratica; quem tem
            // uma ideia constrói-o dos custos para cima.
            intencaoInicial={contexto.maturidade === "ja_vendo" ? "validar_atual" : "formar"}
            rotuloConcluir={ofertaEmEdicao ? "Guardar esta oferta" : "Adicionar esta oferta ao negócio"}
            aoCancelar={() => setEdicao(null)}
            aoConcluir={(pricing, respondidos) => {
              if (ofertaEmEdicao) {
                mudar((c) => ({
                  ...c,
                  ofertas: c.ofertas.map((o) =>
                    o.id === ofertaEmEdicao.id ? { ...o, pricing, respondidos } : o,
                  ),
                }));
              } else {
                mudar((c) => ({
                  ...c,
                  ofertas: [...c.ofertas, ofertaDe(pricing, respondidos)],
                }));
              }
              setEdicao(null);
            }}
          />
        </ErrorBoundary>
      </m.div>
    );
  }

  if (!negocio) return null;

  const temNegocio = negocio.ofertas.length > 0;
  const temResultado = negocio.receitaSemIVAMes > 0;

  return (
    <div ref={palco} tabIndex={-1} aria-label="O teu negócio" className="space-y-4 focus:outline-none">
      <ResumoNegocio negocio={negocio} nome={contexto.nome} />

      {/* ── Cabeçalho do projeto ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <div className="min-w-0 flex-1">
          <label htmlFor="nome-negocio" className="sr-only">
            Nome do teu negócio
          </label>
          <input
            id="nome-negocio"
            value={contexto.nome ?? ""}
            placeholder="Dá um nome ao teu negócio"
            onChange={(e) => mudar((c) => ({ ...c, nome: e.target.value }))}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 placeholder:font-normal placeholder:text-stone-400 hover:border-stone-200 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-100 dark:hover:border-stone-700"
          />
        </div>
        <BotaoTexto
          tom="perigo"
          onClick={() => {
            if (typeof window !== "undefined" && !window.confirm("Apagar este projeto e recomeçar do zero?")) return;
            limparRascunhoNegocio();
            setContexto(null);
            setEdicao(null);
            setMostrarSensibilidade(false);
            setCaixaAtiva(false);
          }}
        >
          <RotateCcw size={12} />
          Recomeçar
        </BotaoTexto>
      </div>

      {/* ── ATO 3b — o negócio que já existe (§6) ────────────────────
          Aparece a quem entrou por «Já tenho empresa» e a quem já
          declarou uma base, venha da porta que vier. Nunca substitui as
          ofertas: soma-se-lhes. */}
      {contexto.maturidade === "empresa_existente" || contexto.base ? (
        <BaseNegocioEditor
          base={contexto.base}
          regiao={regiaoDoNegocio(contexto)}
          temOfertas={contexto.ofertas.length > 0}
          aoAdicionarOferta={() => setEdicao({ nova: true })}
          aoMudar={(patch) =>
            mudar((c) => ({
              ...c,
              base: { volumeAnual: 0, custosAtividadeAno: 0, ...c.base, ...patch },
            }))
          }
        />
      ) : null}

      {/* ── ATO 4 — portefólio ───────────────────────────────────── */}
      <PortfolioOfertas
        ofertas={negocio.ofertas}
        concentracao={negocio.concentracao}
        receitaTotal={negocio.receitaSemIVAMes}
        aoAdicionar={() => setEdicao({ nova: true })}
        aoEditarPreco={(id) => setEdicao({ ofertaId: id })}
        aoRemover={(id) => mudar((c) => ({ ...c, ofertas: c.ofertas.filter((o) => o.id !== id) }))}
        aoMudarVolume={(id, v) =>
          mudar((c) => ({ ...c, ofertas: c.ofertas.map((o) => (o.id === id ? { ...o, volume: v } : o)) }))
        }
        aoMudarCapacidade={(id, maximoMes) =>
          mudar((c) => ({
            ...c,
            ofertas: c.ofertas.map((o) =>
              o.id !== id
                ? o
                : maximoMes === null
                  ? { ...o, capacidade: undefined }
                  : {
                      ...o,
                      capacidade: {
                        unidade: o.capacidade?.unidade ?? "unidades",
                        maximoMes,
                        motivo: "limite que declaraste",
                        derivada: false,
                      },
                    },
            ),
          }))
        }
        aoRenomear={(id, nome) =>
          mudar((c) => ({ ...c, ofertas: c.ofertas.map((o) => (o.id === id ? { ...o, nome } : o)) }))
        }
      />

      {/* ── ATO 5 — estrutura ────────────────────────────────────── */}
      {temNegocio || contexto.maturidade === "empresa_existente" ? (
        <EstruturaNegocioEditor
          estrutura={contexto.estrutura}
          duplicacoes={duplicacoes}
          overheadMes={negocio.overheadMes}
          custoTrabalhadoresMes={negocio.custoTrabalhadoresMes}
          declarouSemCustos={contexto.respondidos.includes("estrutura-sem-custos")}
          aoAdicionarCusto={(categoria: CategoriaCustoEstrutura, rotulo: string) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                overheadMensal: [...c.estrutura.overheadMensal, novoCustoEstrutura(categoria, rotulo)],
              },
              respondidos: c.respondidos.filter((r) => r !== "estrutura-sem-custos"),
            }))
          }
          aoMudarCusto={(id: string, patch: Partial<CustoEstrutura>) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                overheadMensal: c.estrutura.overheadMensal.map((x) => (x.id === id ? { ...x, ...patch } : x)),
              },
            }))
          }
          aoRemoverCusto={(id: string) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                overheadMensal: c.estrutura.overheadMensal.filter((x) => x.id !== id),
              },
            }))
          }
          aoAdicionarInvestimento={(categoria: CategoriaInvestimento, rotulo: string) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                investimentosIniciais: [...c.estrutura.investimentosIniciais, novoInvestimento(categoria, rotulo)],
              },
            }))
          }
          aoMudarInvestimento={(id: string, patch: Partial<InvestimentoInicial>) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                investimentosIniciais: c.estrutura.investimentosIniciais.map((x) =>
                  x.id === id ? { ...x, ...patch } : x,
                ),
              },
            }))
          }
          aoRemoverInvestimento={(id: string) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                investimentosIniciais: c.estrutura.investimentosIniciais.filter((x) => x.id !== id),
              },
            }))
          }
          aoAdicionarTrabalhador={() =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                trabalhadores: [...(c.estrutura.trabalhadores ?? []), novoTrabalhador()],
              },
            }))
          }
          aoMudarTrabalhador={(id: string, patch: Partial<TrabalhadorPlaneado>) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                trabalhadores: (c.estrutura.trabalhadores ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
              },
            }))
          }
          aoRemoverTrabalhador={(id: string) =>
            mudar((c) => ({
              ...c,
              estrutura: {
                ...c.estrutura,
                trabalhadores: (c.estrutura.trabalhadores ?? []).filter((x) => x.id !== id),
              },
            }))
          }
          aoDeclararSemCustos={() =>
            mudar((c) => ({ ...c, respondidos: [...c.respondidos, "estrutura-sem-custos"] }))
          }
          aoResolverDuplicacao={(d: DuplicacaoCusto, acao) =>
            mudar((c) => (acao === "empresa" ? moverParaEstrutura(c, d) : manterNaOferta(c, d)))
          }
        />
      ) : null}

      {/* ── §59 — a região, perguntada uma vez ────────────────────
          Aparece quando já há negócio para analisar: antes disso é uma
          pergunta sobre uma coisa que ainda não existe. */}
      {temNegocio || contexto.base ? (
        <LocalizacaoNegocioEditor
          localizacao={contexto.localizacao}
          aoMudar={(localizacao) =>
            mudar((c) => ({
              ...c,
              localizacao,
              // O campo legado acompanha, para os cenários guardados e as
              // pontes que ainda o leem continuarem coerentes.
              fiscal: { ...c.fiscal, regiao: localizacao.regiao },
            }))
          }
        />
      ) : null}

      {/* ── §55-57 — a forma do ano ────────────────────────────────
          Depois da estrutura e antes do cockpit: é aqui que a média
          deixa de chegar e o mês fraco começa a decidir. */}
      {temResultado ? (
        <ProcuraNegocioEditor
          contexto={contexto}
          aoMudar={(patch) => mudar((c) => ({ ...c, procura: { ...c.procura, ...patch } }))}
        />
      ) : null}

      {/* ── ATO 6 — cockpit ──────────────────────────────────────── */}
      <CockpitViabilidade negocio={negocio} aoAdicionarOferta={() => setEdicao({ nova: true })} />

      {/* ── Pressupostos ─────────────────────────────────────────── */}
      {temNegocio ? (
        <LivroPressupostos
          assumidos={negocio.pressupostos}
          confirmados={jaConfirmados}
          aoResolver={(destino) => {
            if (destino === "caixa") setCaixaAtiva(true);
            const alvo = document.getElementById(destino) ?? document.getElementById(`capacidade-${destino}`);
            alvo?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      ) : null}

      {/* ── ATO 7 — sensibilidade, a pedido ──────────────────────── */}
      {temResultado ? (
        mostrarSensibilidade && negocio.sensibilidade ? (
          <ErrorBoundary>
            <SensibilidadeNegocio s={negocio.sensibilidade} />
          </ErrorBoundary>
        ) : (
          <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              E se as coisas não correrem exatamente como esperas?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Testamos o teu cenário com menos vendas, preço mais baixo e custos mais altos — e dizemos qual desses
              fatores é o que mais mexe no resultado.
            </p>
            <button
              type="button"
              onClick={() => setMostrarSensibilidade(true)}
              className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-brand dark:hover:text-brand-mint"
            >
              Testar o cenário
            </button>
          </div>
        )
      ) : null}

      {/* ── ATO 8 — caixa, a pedido ──────────────────────────────── */}
      {temResultado ? (
        <ErrorBoundary>
          <ProjecaoCaixa
            caixa={contexto.caixa}
            resultado={negocio.caixa}
            aoAtivar={() => {
              setCaixaAtiva(true);
              mudar((c) => ({
                ...c,
                caixa: c.caixa ?? { saldoInicial: 0, prazoRecebimentoDias: 30, prazoFornecedorDias: 30 },
              }));
            }}
            aoMudar={(patch: Partial<CaixaNegocio>) =>
              mudar((c) => ({
                ...c,
                caixa: {
                  saldoInicial: 0,
                  prazoRecebimentoDias: 30,
                  prazoFornecedorDias: 30,
                  ...c.caixa,
                  ...patch,
                },
              }))
            }
          />
        </ErrorBoundary>
      ) : null}

      {/* ── §49-50 — a situação de IVA, do motor que a sabe ──────── */}
      {temResultado ? (
        <ErrorBoundary>
          <SituacaoIVANegocio contexto={contexto} negocio={negocio} />
        </ErrorBoundary>
      ) : null}

      {/* ── §88-89 — contratar agora, depois, ou não ─────────────── */}
      {temResultado ? (
        <ErrorBoundary>
          <DecisaoContratar contexto={contexto} />
        </ErrorBoundary>
      ) : null}

      {/* ── ATOS 9-11 — enquadramento ────────────────────────────── */}
      {temResultado ? (
        <>
          <SeletorEnquadramento
            valor={contexto.fiscal.enquadramento}
            // §5 — quem entrou por «Já tenho empresa» já respondeu a isto.
            // A pergunta continua no ecrã (é uma decisão reversível), mas
            // apresentada como resposta dada, não como dúvida por
            // resolver.
            jaRespondido={contexto.respondidos.includes("enquadramento")}
            aoMudar={(enquadramento) =>
              mudar((c) => ({
                ...c,
                fiscal: { ...c.fiscal, enquadramento },
                respondidos: c.respondidos.includes("enquadramento")
                  ? c.respondidos
                  : [...c.respondidos, "enquadramento"],
              }))
            }
          />
          <ErrorBoundary>
            <ComparacaoNegocio negocio={negocio} contexto={contexto} />
          </ErrorBoundary>
        </>
      ) : null}

      {/* ── ATOS 12-13 — execução ────────────────────────────────── */}
      {temResultado ? (
        <>
          {/* §19 — a continuidade tem de ser mais do que um link. O que
              a pessoa acabou de construir viaja com ela, com revisão
              antes de sair e sem nada no URL. */}
          <ErrorBoundary>
            <ContinuarNaEmpresa negocio={negocio} contexto={contexto} />
          </ErrorBoundary>
          <ProximoPassoNegocio negocio={negocio} contexto={contexto} />
          {/* A conclusão fecha o documento: as seis camadas do
              `ResultadoExplicado`, com a hierarquia dos CTAs decidida
              por `escolherRota()` e não por este ecrã. */}
          <ErrorBoundary>
            <ConclusaoNegocio negocio={negocio} contexto={contexto} />
          </ErrorBoundary>
        </>
      ) : null}

      {/* ── Guardar ──────────────────────────────────────────────── */}
      {temNegocio ? <GuardarProjeto contexto={contexto} negocio={negocio} /> : null}

      <p className="px-1 pt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        Estimativa com base no que introduziste. Não substitui a análise de um contabilista certificado — mostra o que
        as contas aguentam, não o que o mercado aceita nem o que a tua situação pessoal exige.
      </p>
    </div>
  );
}

// ─── Auxiliares ────────────────────────────────────────────────────────

/** Uma oferta a partir de um contexto de preço já trabalhado. */
function ofertaDe(pricing: ContextoPreco, respondidos: string[]): OfertaNegocio {
  const base = novaOferta(pricing.cenario as CenarioInicial);
  return {
    ...base,
    // O nome do produto, quando a pessoa lho deu na calculadora, ganha ao
    // rótulo genérico do cenário: «Consultoria UX» é o negócio dela, «um
    // serviço» é a nossa categoria.
    nome: pricing.produto.nome?.trim() || base.nome,
    pricing,
    volume: { esperadoMes: pricing.volume.unidadesMes },
    respondidos,
  };
}

const ENQUADRAMENTOS: { valor: EnquadramentoPretendido; rotulo: string; sub: string }[] = [
  { valor: "nao_sei", rotulo: "Ainda não sei", sub: "Mostra-me as duas" },
  { valor: "independente", rotulo: "Recibos verdes", sub: "Trabalhador independente" },
  { valor: "sociedade", rotulo: "Sociedade", sub: "Unipessoal ou Lda." },
];

function SeletorEnquadramento({
  valor,
  jaRespondido,
  aoMudar,
}: {
  valor: EnquadramentoPretendido;
  jaRespondido?: boolean;
  aoMudar: (v: EnquadramentoPretendido) => void;
}) {
  return (
    <fieldset className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <legend className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">
        {jaRespondido ? "Como operas" : "Como pensas operar?"}
      </legend>
      <p className="mb-3 mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        {jaRespondido
          ? "Já nos disseste isto à entrada. Fica aqui porque é reversível — mas não voltamos a perguntar."
          : "Não é preciso decidir agora — «ainda não sei» é uma resposta legítima, e é a que mostra as duas contas lado a lado."}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ENQUADRAMENTOS.map((e) => {
          const ativo = valor === e.valor;
          return (
            <button
              key={e.valor}
              type="button"
              onClick={() => aoMudar(e.valor)}
              aria-pressed={ativo}
              className={`min-h-[44px] rounded-2xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                ativo
                  ? "border-brand bg-brand-light/60 dark:bg-brand/10"
                  : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                }`}
              >
                {e.rotulo}
              </span>
              <span className="mt-0.5 block text-[11px] text-stone-500 dark:text-stone-400">{e.sub}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
