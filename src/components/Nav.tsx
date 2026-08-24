"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { LancadorBusca } from "@/components/busca/LancadorBusca";
import { MenuConta } from "@/components/header/MenuConta";
import { Logo, ArrowRight, Menu as MenuIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import BarraSecoes from "@/components/navegacao/BarraSecoes";
import CapsulaNav from "@/components/navegacao/CapsulaNav";
import MenuCompleto from "@/components/navegacao/MenuCompleto";

/**
 * O cabeçalho de secretária — três linhas, sempre as mesmas.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ A PESQUISA É O ELEMENTO CENTRAL, E UM ELEMENTO CENTRAL PRECISA DE ESPAÇO │
 * │                                                                         │
 * │ Estava espremida entre os links e os botões, com 200 px e um rótulo      │
 * │ «Pesquisar…» — do tamanho de um detalhe, num produto onde encontrar a    │
 * │ ferramenta certa É a tarefa. Agora tem uma linha só para si, com largura │
 * │ a sério, e a navegação por cima diz onde se está.                        │
 * │                                                                         │
 * │ A partir dos primeiros 40 px de scroll a atenção é do conteúdo: a        │
 * │ navegação recolhe, a barra encolhe para junto da marca e o cabeçalho     │
 * │ fica numa linha. Continua no mesmo eixo e à mesma distância do topo do   │
 * │ ecrã. Muda de tamanho; nunca muda de sítio.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE HÁ UM ESPAÇADOR EM FLUXO COM ALTURA CONSTANTE                     │
 * │                                                                         │
 * │ Um cabeçalho que encolhe E ocupa espaço no fluxo é uma realimentação,    │
 * │ não um efeito: encolher tira altura ao documento, o documento fica mais  │
 * │ curto, o browser reajusta a posição de scroll, o reajuste atravessa o    │
 * │ limiar ao contrário, e ele volta a crescer.                              │
 * │                                                                         │
 * │ Fora do fluxo — `fixed`, com um espaçador que reserva SEMPRE a altura    │
 * │ máxima — o problema deixa de poder existir.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const ACAO =
  "btn-shine focus-marca inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float";

export default function Nav() {
  const { disponivel, user } = useAuth();
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ESTE CABEÇALHO NÃO ENCOLHE, E CUSTOU DUAS TENTATIVAS PERCEBER PORQUÊ │
   * │                                                                     │
   * │ A primeira recolhia a LINHA DE CIMA: sumiam a marca, as secções, a   │
   * │ conta e o «Começar» ao mesmo gesto. Um cabeçalho que fica no ecrã e  │
   * │ se despe às peças ao fim de 40 px de scroll lê-se como avaria, não   │
   * │ como densidade.                                                      │
   * │                                                                     │
   * │ A segunda recolhia só a LINHA DA PESQUISA — uma peça, com atalho de  │
   * │ teclado e página própria. Parecia inofensiva e partia o teclado: com │
   * │ o campo em `display:none`, fechar o painel com Escape deixava o foco │
   * │ no `<body>` (o efeito que o devolve chama `focus()` num elemento que │
   * │ já não é focável). Quem navega assim recomeçava a tabulação no topo  │
   * │ do documento. O `verificar-cabecalho.mjs` apanhou-o.                  │
   * │                                                                     │
   * │ Portanto: uma altura só. As três linhas estão apertadas de propósito │
   * │ (64 + 52 + 56) para 172 px serem suportáveis, e em troca o cabeçalho │
   * │ é a única coisa da página que nunca muda.                             │
   * └─────────────────────────────────────────────────────────────────────┘
   */

  /**
   * O FUNDO não segue a densidade — segue o scroll, e só ele.
   *
   * Estiveram presas à mesma variável e são decisões diferentes. O fundo
   * depende apenas de haver conteúdo a passar por baixo — e com a página
   * rolada há, com ou sem painel de pesquisa aberto. Sem isto, o texto da
   * página lê-se através do cabeçalho, por trás do painel.
   */
  const opaco = rolado;

  const [avatarUrl, setAvatarUrl] = useState("");
  const sentinela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      return;
    }
    let ativo = true;
    // Carrega o leitor de perfil (que importa o SDK do Supabase) só quando há
    // sessão — mantém o SDK fora do bundle inicial das páginas públicas.
    import("@/lib/supabase/profile").then(({ obterPerfil }) =>
      obterPerfil(user.id).then((p) => {
        if (ativo) setAvatarUrl(p.avatarUrl);
      }),
    );
    return () => {
      ativo = false;
    };
  }, [user]);

  /**
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ UMA SENTINELA, E NÃO UM OUVINTE DE SCROLL                                │
   * │                                                                         │
   * │ O ouvinte corria em cada evento de scroll, na thread principal, durante  │
   * │ toda a leitura da página — para responder a uma pergunta que muda duas   │
   * │ ou três vezes por sessão. A sentinela é um elemento de 40 px no topo do  │
   * │ documento: o `IntersectionObserver` avisa quando ele sai do ecrã, e o    │
   * │ limiar passa a ser geometria em vez de aritmética repetida a 60 Hz.      │
   * └─────────────────────────────────────────────────────────────────────────┘
   */
  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo) return;
    const observador = new IntersectionObserver(([entrada]) => setRolado(!entrada?.isIntersecting), {
      threshold: 0,
    });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <>
      {/* Espaçador em fluxo — só no desktop. No telemóvel o cabeçalho vive em
          baixo (ChromeMobile), por isso aqui não reservamos espaço nem
          mostramos este header (evita o «duplo header» no telemóvel).
          A sentinela de 40 px continua a existir, mas já só decide a sombra:
          a altura é uma só. */}
      <div aria-hidden className="relative hidden h-[var(--rc-header-alto)] lg:block">
        <div ref={sentinela} className="absolute inset-x-0 top-0 h-10" />
      </div>

      {/**
       * ┌───────────────────────────────────────────────────────────────────┐
       * │ UM CARTÃO A FLUTUAR, E TRÊS LINHAS LÁ DENTRO                       │
       * │                                                                   │
       * │   1  marca · secções   |   conta · começar · menu                 │
       * │   2  a bandeja dos cinco pilares                                   │
       * │   3  a barra de pesquisa                                           │
       * │                                                                   │
       * │ Foi uma faixa de extremo a extremo com uma régua por baixo, e isso │
       * │ punha o cabeçalho num sistema diferente do da página — que é uma   │
       * │ pilha de cartões brancos sobre papel quente. Agora é o primeiro    │
       * │ desses cartões.                                                    │
       * │                                                                   │
       * │ As três linhas partilham as arestas do cartão por construção: é    │
       * │ uma coluna só, e nenhuma delas leva largura própria. Houve uma     │
       * │ versão em que a bandeja e a barra tinham 704 px e a primeira linha │
       * │ ocupava tudo — num ecrã largo dava um «T», e o desequilíbrio não   │
       * │ era de espaçamento: era duas das três não pertencerem à mesma      │
       * │ grelha.                                                            │
       * │                                                                   │
       * │ NADA RECOLHE AO ROLAR. Já se tentou recolher a primeira linha      │
       * │ (sumiam a marca, as secções, a conta e o «Começar» de uma vez) e   │
       * │ recolher a da pesquisa (o campo ficava em `display:none` e o       │
       * │ Escape deixava o foco no `<body>`). O que muda com o scroll é a    │
       * │ sombra do cartão, e mais nada.                                     │
       * └───────────────────────────────────────────────────────────────────┘
       */}
      <header className="fixed inset-x-0 top-0 z-50 hidden px-6 pt-[var(--rc-header-margem)] lg:block">
        <div
          data-opaco={opaco}
          className={`mx-auto w-full max-w-[92rem] rounded-4xl border bg-white p-[var(--rc-cartao-p)] transition-shadow duration-300 dark:bg-stone-900 ${
            opaco
              ? "border-stone-200/70 shadow-float dark:border-stone-800"
              : "border-stone-100 shadow-card dark:border-stone-800/80"
          }`}
        >
          {/* ── Linha 1 — marca · secções | conta · começar · menu ─────── */}
          <div className="flex h-[var(--rc-header-linha)] min-w-0 items-center justify-between gap-4 px-2">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" aria-label="ReciboCerto — início" className="focus-marca flex-shrink-0 rounded-xl">
                <Logo />
              </Link>
              <BarraSecoes />
            </div>

            {/* Uma entrada de conta, UMA acção, e o «Menu». O tema vive dentro
                da folha — ver o quadro em `MenuConta.tsx`. O feedback está na
                barra de secções, ao lado dos destinos que também são «o resto
                do produto». */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <MenuConta avatarUrl={avatarUrl} />

              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                {user ? (
                  <Link href="/dashboard" className={ACAO}>
                    Painel
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                ) : disponivel ? (
                  <CTAComecar />
                ) : (
                  <Link href="/dashboard" className={ACAO}>
                    Começar Grátis
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </m.div>

              {/* «Menu» não é o sexto pilar: vive nesta linha, com a forma de
                  um controlo com contorno, e não dentro da bandeja. Esteve lá
                  separado por uma régua, e uma régua é sinal fraco de mais
                  para dizer «isto é de outra natureza». */}
              <button
                type="button"
                data-menu-gatilho="secretaria"
                aria-haspopup="dialog"
                aria-expanded={menuAberto}
                onClick={() => setMenuAberto(true)}
                className="focus-marca inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-brand"
              >
                <MenuIcon size={17} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
                Menu
              </button>
            </div>
          </div>

          {/* ── Linha 2 — a bandeja dos cinco pilares ──────────────────── */}
          <div className="mt-[var(--rc-cartao-gap)] flex h-[var(--rc-linha-nav)] items-center">
            <CapsulaNav />
          </div>

          {/* ── Linha 3 — a barra de pesquisa ──────────────────────────── */}
          <div className="mt-[var(--rc-cartao-gap)] w-full">
            <LancadorBusca inputId="rc-header-busca" />
          </div>
        </div>
      </header>

      {/* A folha é a MESMA do telemóvel — um componente, duas geometrias.
          Ver o quadro em `MenuCompleto.tsx`. */}
      <MenuCompleto aberto={menuAberto} aoFechar={() => setMenuAberto(false)} superficie="secretaria" />
    </>
  );
}

function CTAComecar() {
  const { abrirModal } = useAuth();
  return (
    <button type="button" onClick={() => abrirModal("criar")} className={ACAO}>
      Começar Grátis
      <ArrowRight size={14} aria-hidden />
    </button>
  );
}
