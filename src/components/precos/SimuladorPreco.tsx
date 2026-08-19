"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SIMULADOR DE PREÇO — a composição
//  ---------------------------------------------------------------------
//  Este componente não calcula nada. Guarda o `ContextoPreco`, entrega-o ao
//  motor e desenha o que vem de volta. Toda a matemática vive em
//  `lib/pricing` e é testada lá — a mesma separação que salvou os
//  simuladores de IRS quando os motores foram extraídos dos `.tsx`.
//
//  DUAS DECISÕES DE UX QUE VALEM POR TODAS AS OUTRAS:
//
//  ① Primeiro pergunta-se O QUE a pessoa quer definir, não quanto custa.
//    «Um bolo por encomenda» e «um produto para revender no Amazon» são
//    problemas diferentes; perguntar o custo antes de saber qual deles é
//    obriga a pessoa a traduzir a sua vida para o vocabulário da
//    ferramenta. Aqui é a ferramenta que se adapta.
//
//  ② O resultado aparece SEMPRE, desde o primeiro segundo, e vai-se
//    afinando. Não há botão «calcular»: há um número que reage. É o que
//    transforma o preenchimento de um formulário numa conversa.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  aberturaDe,
  avaliarPreenchimento,
  cenarioDeQuery,
  cenarioPorChave,
  precificar,
  resumoDe,
  type CenarioInicial,
  type ContextoPreco,
  type SeccaoPreco,
} from "@/lib/pricing";
import { gravarContextoPreco, lerEnvelopePreco, limparContextoPreco } from "@/lib/store/preco";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { ArrowLeft, ArrowRight, RotateCcw } from "@/components/ui/Icons";
import CamposEssenciais from "./CamposEssenciais";
import Afinar from "./Afinar";
import ResultadoPreco from "./ResultadoPreco";
import AnuncioResultado from "./AnuncioResultado";
import Pressupostos from "./Pressupostos";
import ResumoPreco from "./ResumoPreco";
import SemPreco from "./SemPreco";
import Caixa from "./Caixa";
import Tesouraria from "./Tesouraria";
import Sociedade from "./Sociedade";
import DescontoResultado from "./DescontoResultado";
import Decidir from "./Decidir";
import ConclusaoPreco from "./ConclusaoPreco";
import ObjetivoInvertido from "./ObjetivoInvertido";
import SeccaoRevelavel from "./SeccaoRevelavel";
import { useMedicaoPreco } from "./medicao";
import { Avisos, MemoriaCalculo } from "./MemoriaCalculo";
import { Cenarios, SliderPreco } from "./EQueSe";
import { CENARIOS_INICIAIS_DEF } from "@/lib/pricing";
import type { SeveridadeAviso } from "@/lib/pricing";

/** O que sobe para junto do número e o que fica em baixo como contexto. */
const GRAVES: readonly SeveridadeAviso[] = ["perigo", "atencao"];
const INFORMATIVOS: readonly SeveridadeAviso[] = ["info"];

export default function SimuladorPreco({ cenarioInicial }: { cenarioInicial?: string | null }) {
  const [cenario, setCenario] = useState<CenarioInicial | null>(() => cenarioDeQuery(cenarioInicial));
  const [contexto, setContexto] = useState<ContextoPreco | null>(null);

  // ── O que a pessoa respondeu MESMO ────────────────────────────────
  //  Não é o mesmo que «o campo tem um valor»: todos têm, desde o
  //  primeiro segundo. Só isto distingue «o custo é 0 porque é um
  //  ficheiro» de «o custo é 0 porque ainda não disse», e é dessa
  //  distinção que sai a confiança do resultado. Ver
  //  `lib/pricing/preenchimento.ts`.
  const [respondidos, setRespondidos] = useState<Set<string>>(() => new Set());
  const retomou = useRef(false);

  // ── O que a pessoa abriu ou fechou À MÃO ──────────────────────────
  //  As camadas de revelação (`lib/pricing/nivel.ts`) decidem o que abre
  //  sozinho conforme o que já foi respondido. Isto guarda as exceções —
  //  e as exceções ganham sempre.
  //
  //  ⚠️ SEM ISTO, A REVELAÇÃO PROGRESSIVA É UMA ARMADILHA. O nível sobe
  //  quando se responde a um campo; se a abertura viesse só do nível,
  //  responder a mais uma pergunta reabria por baixo tudo o que a pessoa
  //  tinha acabado de fechar, e fechava o que ela tinha aberto para
  //  consultar. Um formulário que desfaz o que acabámos de fazer é pior
  //  do que um formulário comprido.
  const [escolhas, setEscolhas] = useState<Partial<Record<SeccaoPreco, boolean>>>({});
  const alternar = (seccao: SeccaoPreco, aberta: boolean) =>
    setEscolhas((a) => ({ ...a, [seccao]: !aberta }));

  // ── Retomar o que ficou por acabar ─────────────────────────────────
  // No cofre local, nunca no servidor: `privacy: "local-only"` no catálogo
  // não é uma etiqueta, é uma promessa que o código tem de cumprir. E é o
  // cofre, não uma chave global — a estrutura de custos de alguém não pode
  // ficar à vista de quem usar o browser a seguir.
  //
  // ⚠️ RETOMA-SE UMA VEZ, À ENTRADA — e nunca mais.
  // Isto já esteve preso a `[cenario]` sem guarda, e o efeito era este: ao
  // carregar em «Mudar», o cenário passava a `null`, o efeito voltava a
  // correr, lia do cofre o contexto que acabara de ser gravado e repunha
  // tudo no mesmo sítio. Para quem lá estava, o botão simplesmente não
  // fazia nada. Retomar é uma decisão de ENTRADA, não uma reação a ficar
  // sem cenário: quem sai de um cenário está a sair dele de propósito.
  useEffect(() => {
    if (retomou.current) return;
    retomou.current = true;
    if (cenario) return;
    const lido = lerEnvelopePreco<ContextoPreco>(1);
    if (lido?.contexto.cenario) {
      setCenario(lido.contexto.cenario);
      setContexto(lido.contexto);
      // O que vem do cofre é trabalho já feito por esta pessoa, não um
      // exemplo nosso. Um cofre da v1 não sabe QUAIS campos foram
      // respondidos — só que houve trabalho —, por isso o resultado
      // apresenta-se como estimativa até a pessoa voltar a tocar neles.
      setRespondidos(new Set(lido.respondidos));
    }
  }, [cenario]);

  // ── O cenário vive na URL ──────────────────────────────────────────
  // Sem isto, escolher um cenário não mexia no histórico — e o «voltar» do
  // telemóvel (botão ou gesto) SAÍA da ferramenta em vez de recuar um
  // passo. A página já aceita `?c=`; passa a escrevê-lo também.
  const irPara = (destino: CenarioInicial | null, empurrar: boolean) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (destino) url.searchParams.set("c", destino);
    else url.searchParams.delete("c");
    const alvo = `${url.pathname}${url.search}${url.hash}`;
    if (empurrar) window.history.pushState({ c: destino }, "", alvo);
    else window.history.replaceState({ c: destino }, "", alvo);
  };

  // O «voltar» do browser passa a recuar dentro da ferramenta.
  useEffect(() => {
    const aoVoltar = () => {
      const daUrl = cenarioDeQuery(new URLSearchParams(window.location.search).get("c"));
      setCenario(daUrl);
      if (!daUrl) setContexto(null);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  /** Escolher um cenário: avança um passo no histórico. */
  const escolherCenario = (c: CenarioInicial) => {
    setCenario(c);
    irPara(c, true);
  };

  /**
   * Voltar ao seletor. Limpa o cofre de propósito: quem carrega em «Mudar»
   * está a abandonar aquele cenário, e reabrir a página não lho pode
   * ressuscitar por baixo.
   */
  const voltarAoSeletor = () => {
    setCenario(null);
    setContexto(null);
    setRespondidos(new Set());
    setEscolhas({});
    limparContextoPreco();
    reiniciar();
    irPara(null, true);
  };

  /**
   * Recomeçar SEM sair do cenário.
   *
   * «Mudar» e «recomeçar» eram a mesma coisa, e não são: quem quer voltar
   * a zero com o mesmo tipo de produto não quer escolher o cenário outra
   * vez — quer o formulário limpo. Ter só o primeiro obrigava a passar
   * pelo seletor para desfazer um engano num campo.
   */
  const recomecar = () => {
    if (!cenario) return;
    setContexto(cenarioPorChave(cenario).contexto());
    setRespondidos(new Set());
    setEscolhas({});
    reiniciar();
  };

  useEffect(() => {
    if (!cenario) return;
    setContexto((atual) => (atual && atual.cenario === cenario ? atual : cenarioPorChave(cenario).contexto()));
  }, [cenario]);

  useEffect(() => {
    // Sem armazenamento a ferramenta continua a funcionar; só não retoma.
    if (contexto) gravarContextoPreco(contexto, [...respondidos]);
  }, [contexto, respondidos]);

  // ── A pessoa já personalizou alguma coisa? ─────────────────────────
  //  Sem isto, a ferramenta anunciava «QUANTO DEVES COBRAR 1,09 €» a quem
  //  acabara de escolher «um produto digital» e mais nada. O número saía
  //  inteiro dos valores por omissão do cenário — custo 0 €, margem 70%,
  //  volume 20 — e era apresentado como recomendação.
  //
  //  É o oposto do que este projeto promete («um vazio honesto vale mais do
  //  que um número plausível»): não é uma estimativa com pouca informação, é
  //  um número que a pessoa nunca introduziu, com a autoridade de um
  //  conselho. Enquanto ninguém tocar em nada, o resultado assume-se como
  //  exemplo — e diz-lo.
  //
  //  ⚠️ ISTO JÁ FOI UM BOOLEANO, e um booleano vira-se com uma tecla:
  //  bastava escrever um dígito no volume para o cartão passar de «Um
  //  exemplo, por enquanto» a «QUANTO DEVES COBRAR», por cima de vinte e
  //  cinco pressupostos por confirmar. Agora regista-se QUAL campo foi
  //  respondido, e a confiança sai da lista do que ainda falta.
  const atualizar = (campo: string, patch: (c: ContextoPreco) => void) => {
    setRespondidos((a) => (a.has(campo) ? a : new Set(a).add(campo)));
    setContexto((atual) => {
      if (!atual) return atual;
      const copia = structuredClone(atual);
      patch(copia);
      return copia;
    });
  };

  /**
   * Adotar um preço redondo. Passa o objetivo para `preco_fixo` — que é
   * o que a escolha significa: «este é o meu preço, diz-me o que dá».
   */
  const adotarPreco = (pvp: number) =>
    atualizar("adotar-preco", (c) => {
      c.objetivo = { ...c.objetivo, modo: "preco_fixo", valor: pvp, valorEhPVP: true };
    });

  /** Do ecrã de «não há preço possível» para um preço que existe. */
  const aceitarMargemMaxima = (margem: number) =>
    atualizar("objetivo-pct", (c) => {
      c.objetivo = { ...c.objetivo, modo: "margem", percentagem: margem };
    });

  const resultado = useMemo(() => (contexto ? precificar(contexto) : null), [contexto]);
  const preenchimento = useMemo(
    () => (contexto ? avaliarPreenchimento(contexto, respondidos) : null),
    [contexto, respondidos],
  );

  // ── Medição ───────────────────────────────────────────────────────
  //  A ferramenta disparava `simulator_start` e mais nada — e por isso
  //  contribuía ZERO para a North Star (DVM = `simulator_complete` +
  //  `result_view`) e não havia dados sobre onde as pessoas desistem.
  //  Nenhum valor sai daqui: mede-se a forma do percurso, nunca o
  //  negócio de quem o percorre.
  const { reiniciar } = useMedicaoPreco({
    cenario,
    estado: preenchimento?.estado ?? "exemplo",
    respondidos,
    temPreco: resultado?.ok ?? false,
  });

  // ── Passo 1: escolher o cenário ────────────────────────────────────
  if (!cenario || !contexto || !resultado) {
    return <SeletorCenario aoEscolher={escolherCenario} />;
  }

  const definicao = cenarioPorChave(cenario);
  const temFiscalidade = resultado.fiscal.aplicavel;
  const estadoPreenchimento = preenchimento?.estado ?? "exemplo";

  /**
   * Uma secção, aberta ou recolhida conforme a camada de revelação.
   *
   * O título é o mesmo por que a pessoa vai reconhecer o cartão lá
   * dentro, e o resumo sai de números reais do resultado — ver
   * `lib/pricing/resumos.ts` para porque é que isso não é opcional.
   */
  const revelavel = (seccao: SeccaoPreco, titulo: string, conteudo: ReactNode) => {
    const aberta = aberturaDe(seccao, estadoPreenchimento, escolhas);
    return (
      <SeccaoRevelavel
        titulo={titulo}
        resumo={resumoDe(seccao, resultado)}
        aberta={aberta}
        aoAlternar={() => alternar(seccao, aberta)}
      >
        {conteudo}
      </SeccaoRevelavel>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Cenário escolhido ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <p className="min-w-0 text-sm">
          <span className="text-stone-500 dark:text-stone-400">Estás a calcular: </span>
          <strong className="text-stone-800 dark:text-stone-100">{definicao.rotulo.toLowerCase()}</strong>
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* «Recomeçar» e «mudar de cenário» eram a mesma coisa, e não
              são: quem se enganou num campo não quer voltar ao seletor —
              quer o formulário limpo, no mesmo cenário. */}
          {respondidos.size > 0 ? (
            <button
              type="button"
              onClick={recomecar}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-brand-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
            >
              <RotateCcw size={12} />
              Recomeçar
            </button>
          ) : null}
          <button
            type="button"
            onClick={voltarAoSeletor}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 dark:text-brand-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft size={13} />
            Mudar
          </button>
        </div>
      </div>

      {/* ── DUAS COLUNAS EM DESKTOP, UMA EM MOBILE ─────────────────
          A ferramenta está declarada como `layout: "wide"` no catálogo
          (max-w-6xl) e desenhava-se numa coluna só: metade do ecrã vazia
          enquanto o número que se está a afinar saía do viewport ao abrir
          o primeiro acordeão.

          A ORDEM DO DOM NÃO MUDA — essencial → resultado → afinar — e é
          ela que manda em mobile, onde a pessoa quer o número antes do
          formulário. Em `lg:` a grelha reposiciona as mesmas caixas em
          duas colunas, sem trocar a leitura por teclado ou leitor de
          ecrã. ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* PRIMEIRO PERSONALIZA-SE, DEPOIS VÊ-SE O NÚMERO.
            O resultado já esteve à frente de tudo, e isso punha uma
            recomendação por cima de campos que ninguém tinha preenchido. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <CamposEssenciais
            contexto={contexto}
            definicao={definicao}
            atualizar={atualizar}
            resultado={resultado}
          />
        </div>

        {/* O preço, e a maneira de lhe mexer, ficam juntos.
            O slider já esteve depois de TODOS os campos: em mobile nascia
            a 3 415 px do topo, quatro ecrãs abaixo do número que serve
            para o afinar. */}
        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* A única coisa fixa da página. O cartão tem ~830 px e não pode
              ser pegajoso; esta barra tem 56 px e pode. */}
          <ResumoPreco resultado={resultado} estado={estadoPreenchimento} />

          {resultado.ok ? (
            <ResultadoPreco
              resultado={resultado}
              temFiscalidade={temFiscalidade}
              estado={estadoPreenchimento}
              faltam={preenchimento?.faltam.length ?? 0}
              aoAdotarPreco={adotarPreco}
            />
          ) : (
            <SemPreco resultado={resultado} aoAceitarMaximo={aceitarMargemMaxima} />
          )}

          <AnuncioResultado resultado={resultado} exemplo={estadoPreenchimento === "exemplo"} />

          {/* Os valores por omissão, ditos em voz alta e com o caminho
              para os corrigir. */}
          {preenchimento ? <Pressupostos preenchimento={preenchimento} /> : null}

          {/* ── Os avisos graves ficam COLADOS ao número ──────────────
              Estavam todos numa secção única, depois dos campos avançados
              e depois da memória de cálculo: um aviso `perigo` («a este
              preço cada venda tira-te dinheiro») nascia quatro ecrãs
              abaixo do preço a que se refere. ────────────────────────── */}
          <Avisos avisos={resultado.avisos} apenas={GRAVES} rotulo="Avisos importantes" />

          {/* ── A PARTIR DAQUI, A PROFUNDIDADE É A PEDIDO ─────────────
              Nenhuma destas secções desapareceu: mudou QUANDO aparecem
              abertas. Com um número que ainda é um exemplo, analisar «o
              que entra na conta» com quatro casas decimais é analisar uma
              ficção — por isso no nível 1 estão recolhidas, cada uma com
              um resumo vivo que diz o que lá está sem ser preciso abrir.
              Ver `lib/pricing/nivel.ts`. ──────────────────────────────── */}
          {resultado.ok
            ? revelavel(
                "slider",
                "Experimentar outro preço",
                <SliderPreco contexto={contexto} resultado={resultado} estado={estadoPreenchimento} />,
              )
            : null}

          {/* O «Nível 4» que o `pricing-ux-flow.md` descreve desde o
              primeiro dia e que nunca existiu: `motores/objetivo.ts` tem
              215 linhas exportadas e testadas que nenhuma interface
              chamava. São as duas perguntas que as pessoas fazem mesmo. */}
          {resultado.ok
            ? revelavel(
                "objetivo_invertido",
                "Quanto preciso de vender",
                <ObjetivoInvertido contexto={contexto} resultado={resultado} aoAdotarPreco={adotarPreco} />,
              )
            : null}

          {/* Secções irmãs, e não mais oito coisas dentro do cartão de
              resultado. Cada uma aparece só quando tem o que dizer. */}
          {resultado.desconto
            ? revelavel("desconto", "O efeito do desconto", <DescontoResultado desconto={resultado.desconto} />)
            : null}
          {resultado.ok
            ? revelavel("caixa", "Do que o cliente paga ao que fica contigo", <Caixa resultado={resultado} />)
            : null}
          {resultado.tesouraria
            ? revelavel("tesouraria", "Quando sai o dinheiro", <Tesouraria t={resultado.tesouraria} />)
            : null}
          {resultado.sociedade
            ? revelavel("sociedade", "O que chega ao dono", <Sociedade s={resultado.sociedade} />)
            : null}
        </div>

        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
          <Afinar contexto={contexto} definicao={definicao} atualizar={atualizar} resultado={resultado} />

          {/* A memória e as notas NUNCA abrem sozinhas, em nível nenhum:
              são prova a pedido. Quem as quer, pede-as — e quem não as
              quer não paga cinco ecrãs por elas. */}
          {revelavel("memoria", "Como se chegou a este número", <MemoriaCalculo linhas={resultado.explicacao} />)}
          {resultado.avisos.some((a) => a.severidade === "info")
            ? revelavel(
                "notas",
                "Notas",
                <Avisos avisos={resultado.avisos} apenas={INFORMATIVOS} rotulo="Notas" />,
              )
            : null}
          {resultado.ok
            ? revelavel("cenarios", "E se mudasses uma coisa", <Cenarios contexto={contexto} estado={estadoPreenchimento} />)
            : null}

          {/* ── DECIDIR ────────────────────────────────────────────────
              A zona que faltava. A ferramenta acabava num parágrafo de
              isenção de responsabilidade: sem guardar, sem exportar, sem
              próximo passo. «Sem transição, é dívida editorial.» ────── */}
          {/* A conclusão: as seis camadas do `ResultadoExplicado`, com as
              ações locais lá dentro. As camadas 2, 3, 5 e 6 — como
              chegámos aqui, o que fazer, fontes e LIMITES, e o próximo
              passo — não existiam em lado nenhum desta ferramenta. */}
          {resultado.ok
            ? revelavel(
                "conclusao",
                "Fontes, limites e próximo passo",
                <ConclusaoPreco
                  contexto={contexto}
                  resultado={resultado}
                  estado={estadoPreenchimento}
                  faltam={preenchimento?.faltam.length ?? 0}
                >
                  <Decidir
                    contexto={contexto}
                    resultado={resultado}
                    respondidos={respondidos}
                    aoGuardar={(n) => atualizar("nome-produto", (c) => void (c.produto.nome = n))}
                  />
                </ConclusaoPreco>,
              )
            : null}
        </div>
      </div>

      <p className="px-1 pt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        Estimativa com base no que introduziste. Não substitui a análise de um contabilista certificado, e a decisão de
        preço é sempre tua — a ferramenta mostra o que as contas aguentam, não o que o mercado aceita.
      </p>
    </div>
  );
}

// ─── Passo 1 ───────────────────────────────────────────────────────────

/**
 * As famílias do seletor.
 *
 * Eram doze cartões numa grelha única, por ordem de ficheiro, com «Ainda
 * não tenho a certeza» em décimo segundo lugar — ou seja, a saída para
 * quem não se reconhecia em nada estava depois de onze coisas em que não
 * se reconheceu. Em telemóvel são três ecrãs de escolhas antes da
 * primeira pergunta.
 *
 * Agrupar não reduz as opções; reduz o número de coisas que é preciso
 * comparar de cada vez. E o exemplo continua a fazer o trabalho pesado:
 * «produto físico» é uma categoria, «bolo de aniversário» é a vida de
 * alguém.
 */
const FAMILIAS: { titulo: string; nota: string; chaves: CenarioInicial[] }[] = [
  {
    titulo: "Vendo uma coisa",
    nota: "Um objeto, um ficheiro, uma peça — com um custo por unidade",
    chaves: ["produto_revenda", "produto_proprio", "produto_digital", "encomenda"],
  },
  {
    titulo: "Vendo o meu tempo",
    nota: "Horas, projetos e trabalhos — onde o custo és tu",
    chaves: ["servico", "servico_hora", "projeto", "ato_isolado"],
  },
  {
    titulo: "Vendo através de um canal",
    nota: "Onde há comissões e taxas pelo meio",
    chaves: ["loja_online", "marketplace"],
  },
  {
    titulo: "Sei o que quero ganhar",
    nota: "O caminho inverso: do objetivo para o preço",
    chaves: ["objetivo"],
  },
];

function SeletorCenario({ aoEscolher }: { aoEscolher: (c: CenarioInicial) => void }) {
  const porChave = new Map(CENARIOS_INICIAIS_DEF.map((c) => [c.chave, c]));
  const indeciso = porChave.get("nao_sei");

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Escolher o que queres definir"
    >
      <h2 className="font-display mb-1 text-xl font-semibold text-stone-800 dark:text-stone-100">
        O que queres definir?
      </h2>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        Escolhe o que se parece mais com o teu caso. As perguntas seguintes adaptam-se — não vais preencher campos que
        não te dizem respeito.
      </p>

      <div className="space-y-6">
        {FAMILIAS.map((familia) => (
          <section key={familia.titulo} aria-labelledby={`familia-${familia.titulo.replace(/\s+/g, "-")}`}>
            <h3
              id={`familia-${familia.titulo.replace(/\s+/g, "-")}`}
              className="text-sm font-semibold text-stone-800 dark:text-stone-100"
            >
              {familia.titulo}
            </h3>
            <p className="mb-3 mt-0.5 text-xs text-stone-500 dark:text-stone-400">{familia.nota}</p>

            <ul className="grid gap-3 sm:grid-cols-2">
              {familia.chaves.map((chave) => {
                const c = porChave.get(chave);
                if (!c) return null;
                return (
                  <li key={c.chave}>
                    <CartaoCenario definicao={c} aoEscolher={aoEscolher} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* A saída para quem não se reconhece em nada fica em último lugar,
          mas visível e explicada — e não como décimo segundo cartão de
          uma grelha indiferenciada. */}
      {indeciso ? (
        <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
          <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
            Nenhum destes é o teu caso, ou preferes começar pelo mais simples?
          </p>
          <CartaoCenario definicao={indeciso} aoEscolher={aoEscolher} discreto />
        </div>
      ) : null}
    </m.section>
  );
}

function CartaoCenario({
  definicao,
  aoEscolher,
  discreto = false,
}: {
  definicao: (typeof CENARIOS_INICIAIS_DEF)[number];
  aoEscolher: (c: CenarioInicial) => void;
  discreto?: boolean;
}) {
  const Icone = iconeDe(definicao.icone);
  return (
    <button
      type="button"
      onClick={() => aoEscolher(definicao.chave)}
      className={`group flex w-full items-start gap-3 rounded-4xl border p-4 text-left transition-all hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-900 ${
        discreto
          ? "border-dashed border-stone-200 bg-transparent dark:border-stone-700"
          : "border-stone-100 bg-white shadow-card hover:shadow-lift dark:border-stone-800"
      }`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
        <Icone size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{definicao.rotulo}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          {definicao.exemplo}
        </span>
        {/* O que vem a seguir, dito antes de se escolher: é a diferença
            entre um botão e uma decisão informada. */}
        <span className="mt-1.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          {definicao.rapido.length} {definicao.rapido.length === 1 ? "pergunta" : "perguntas"} e já tens um preço
        </span>
      </span>
      <ArrowRight
        size={15}
        className="mt-1 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </button>
  );
}
