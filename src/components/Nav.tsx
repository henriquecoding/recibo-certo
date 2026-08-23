"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { LancadorBusca } from "@/components/busca/LancadorBusca";
import { MenuConta } from "@/components/header/MenuConta";
import { Logo, ArrowRight } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import BarraSecoes from "@/components/navegacao/BarraSecoes";
import CapsulaNav from "@/components/navegacao/CapsulaNav";
import MenuCompleto from "@/components/navegacao/MenuCompleto";

/**
 * O cabeçalho de secretária — duas linhas no topo, uma ao rolar.
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
export default function Nav() {
  const { disponivel, user } = useAuth();
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ O QUE ENCOLHE É A PRIMEIRA LINHA, E SÓ ELA                           │
   * │                                                                     │
   * │ Este estado já dependeu de mais duas coisas, e as duas razões        │
   * │ desapareceram com a passagem a três linhas:                          │
   * │                                                                     │
   * │  · da PESQUISA, porque a navegação vivia na linha que encolhia e o   │
   * │    painel (44 rem) abria por cima da faixa onde ela devia estar.     │
   * │    Agora a cápsula está ACIMA da barra e o painel abre para baixo:   │
   * │    não há como tapá-la;                                              │
   * │  · do MENU, porque o gatilho vivia nessa mesma linha e desmontava    │
   * │    ao compactar, deixando o foco no `<body>` ao fechar. O gatilho    │
   * │    está na cápsula, que não encolhe.                                 │
   * │                                                                     │
   * │ Sobra o scroll — que é a única coisa que isto sempre quis responder. │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const compacto = rolado;

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
          mostramos este header (evita o «duplo header» no telemóvel). */}
      <div aria-hidden className="relative hidden h-[var(--rc-header-alto)] lg:block">
        <div ref={sentinela} className="absolute inset-x-0 top-0 h-10" />
      </div>

      {/* `<header>` e já não `<nav>`: o marco de navegação passou a ser a
          cápsula, que é quem tem os destinos. Dois `<nav aria-label="Principal">`
          aninhados no mesmo documento dariam dois marcos com o mesmo nome a um
          leitor de ecrã — e o de fora não tem destino nenhum, só geometria. */}
      <header
        data-compacto={compacto}
        className={`group fixed inset-x-0 top-0 z-50 hidden border-b transition-[height,background-color,border-color,box-shadow] duration-300 lg:block ${
          compacto ? "h-[var(--rc-header-compacto)]" : "h-[var(--rc-header-compacto)] lg:h-[var(--rc-header-alto)]"
        } ${
          opaco
            ? /**
               * Rolado é o estado em que passa conteúdo por baixo — e é por
               * isso que aqui não há `backdrop-blur`. Desfocar obriga o
               * compositor a reprocessar toda a faixa por trás do cabeçalho em
               * cada frame, e a 100% de opacidade não se distingue de um fundo
               * sólido: trocava-se um efeito que não se vê por um custo que se
               * sente.
               */
              "border-stone-200/70 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950"
            : "border-transparent bg-white/70 backdrop-blur-xl dark:bg-stone-950/70"
        }`}
      >
        {/**
         * ┌───────────────────────────────────────────────────────────────────┐
         * │ TRÊS LINHAS, UMA COLUNA, E CADA LINHA COM UM TRABALHO SÓ           │
         * │                                                                   │
         * │   1  marca · secções · conta e acção   (as pontas)                │
         * │   2  a cápsula dos cinco pilares       (centrada)                  │
         * │   3  a barra de pesquisa               (centrada)                  │
         * │                                                                   │
         * │ Houve uma versão de duas linhas em que a marca, a navegação e as   │
         * │ acções disputavam a primeira. Com seis lugares na cápsula isso     │
         * │ partiu-se: a 1920 px ficava a 3 px do logótipo e o seu centro      │
         * │ caía em 886 px enquanto a barra logo por baixo estava centrada em  │
         * │ 960. Dois elementos centrados, empilhados, em eixos diferentes —   │
         * │ porque a cápsula vivia na coluna do meio de uma grelha cujas       │
         * │ colunas laterais têm larguras diferentes, e centrava-se no espaço  │
         * │ que SOBRAVA.                                                       │
         * │                                                                   │
         * │ Com UMA coluna o problema deixa de poder existir: as linhas 2 e 3  │
         * │ centram-se na página, e não umas nas outras.                        │
         * │                                                                   │
         * │ A BARRA DE PESQUISA NÃO MUDA DE LINHA. Chegou a subir para o meio  │
         * │ da primeira ao compactar, e ficava encravada entre a marca e a     │
         * │ conta — um objecto a saltar de sítio ao fim de 40 px de scroll.    │
         * │ Fica na terceira, sempre. O que recolhe é a PRIMEIRA, que é a      │
         * │ única cujo conteúdo está todo noutro lado: as secções, a conta e   │
         * │ o «Começar» vivem também na folha do «Menu», e a marca leva a      │
         * │ casa a partir do cabeçalho dessa folha. Nada fica inalcançável.    │
         * └───────────────────────────────────────────────────────────────────┘
         */}
        <div className="mx-auto grid h-full max-w-5xl grid-cols-1 grid-rows-[var(--rc-header-linha)_var(--rc-linha-nav)_var(--rc-linha-busca)] items-center px-6 group-data-[compacto=true]:grid-rows-[0px_var(--rc-linha-nav)_var(--rc-linha-busca)] xl:max-w-6xl">
          {/* ── Linha 1 — marca · secções | conta · acção ────────────────
              Recolhe ao rolar. `invisible` e não `hidden`: a linha passa a
              ter altura zero pela grelha, e esconder por visibilidade evita
              que o conteúdo desapareça e reapareça do DOM em cada limiar de
              scroll — o `MenuConta` é um menu com estado e não pode ser
              desmontado por causa de 40 px de rolagem. */}
          <div className="row-start-1 flex min-w-0 items-center justify-between gap-4 overflow-hidden group-data-[compacto=true]:invisible">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" aria-label="ReciboCerto — início" className="focus-marca flex-shrink-0 rounded-xl">
                <Logo />
              </Link>
              <span aria-hidden className="h-5 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />
              <BarraSecoes />
            </div>

            {/* Uma entrada de conta/ajuda e UMA acção. O tema vive dentro do
                menu — ver o quadro em `MenuConta.tsx`. O feedback passou para
                a barra de secções, ao lado dos destinos que também são «o
                resto do produto». */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <MenuConta avatarUrl={avatarUrl} />

              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                {user ? (
                  <Link
                    href="/dashboard"
                    className="btn-shine focus-marca inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
                  >
                    Painel
                    <ArrowRight size={13} aria-hidden />
                  </Link>
                ) : disponivel ? (
                  <CTAComecar />
                ) : (
                  <Link
                    href="/dashboard"
                    className="btn-shine focus-marca inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
                  >
                    Começar<span className="hidden xl:inline">&nbsp;Grátis</span>
                    <ArrowRight size={13} aria-hidden />
                  </Link>
                )}
              </m.div>
            </div>
          </div>

          {/* ── Linha 2 — a cápsula dos cinco pilares ────────────────────
              NÃO recolhe ao rolar: é a espinha do produto, e perdê-la aos
              primeiros 40 px de scroll obrigava a voltar ao topo da página
              só para mudar de sítio. */}
          <div className="row-start-2 flex min-w-0 justify-center">
            <CapsulaNav aoAbrirMenu={() => setMenuAberto(true)} menuAberto={menuAberto} />
          </div>

          {/* ── Linha 3 — a barra de pesquisa ────────────────────────────
              Na mesma largura e no mesmo eixo da cápsula: as duas leem
              `--rc-dock-larga`. Não muda de linha nem de largura em estado
              nenhum. Chegou a subir para o meio da primeira ao compactar, e
              ficava encravada entre a marca e a conta — um objecto a saltar
              de sítio ao fim de 40 px de scroll. É o elemento central; não
              tem de ser procurado duas vezes. */}
          <div className="row-start-3 flex w-full justify-center">
            <div className="w-full max-w-[var(--rc-dock-larga)]">
              <LancadorBusca inputId="rc-header-busca" />
            </div>
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
    <button
      type="button"
      onClick={() => abrirModal("criar")}
      className="btn-shine focus-marca inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
    >
      Começar<span className="hidden xl:inline">&nbsp;Grátis</span>
      <ArrowRight size={13} aria-hidden />
    </button>
  );
}
