"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { DockPesquisa } from "@/components/busca/DockPesquisa";
import { Logo, ArrowRight, User, Megaphone } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { NAV_AMBITOS, ambitoAtivo } from "@/components/nav-config";
import { useBuscaAberta } from "@/components/busca/motor";
import { abrirFeedback } from "@/components/feedback/abrir";

/**
 * O cabeçalho de secretária — duas linhas no topo, uma ao rolar.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ A PESQUISA É O ELEMENTO CENTRAL, E UM ELEMENTO CENTRAL PRECISA DE ESPAÇO │
 * │                                                                         │
 * │ Estava espremida entre os links e os botões, com 200 px e um rótulo      │
 * │ «Pesquisar…» — do tamanho de um detalhe, num produto onde encontrar a    │
 * │ ferramenta certa É a tarefa. Agora tem uma linha só para si, com largura │
 * │ a sério, e os âmbitos por cima dizem o que ela vai procurar.             │
 * │                                                                         │
 * │ A partir dos primeiros 40 px de scroll a atenção é do conteúdo: os       │
 * │ âmbitos recolhem, a barra encolhe para junto da marca e o cabeçalho fica │
 * │ numa linha. Continua no mesmo eixo e à mesma distância do topo do ecrã.  │
 * │ Muda de tamanho; nunca muda de sítio.                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE HÁ UM ESPAÇADOR EM FLUXO COM ALTURA CONSTANTE                     │
 * │                                                                         │
 * │ Um cabeçalho que encolhe E ocupa espaço no fluxo é uma realimentação,    │
 * │ não um efeito: encolher tira altura ao documento, o documento fica mais  │
 * │ curto, o browser reajusta a posição de scroll, o reajuste atravessa o    │
 * │ limiar ao contrário, e ele volta a crescer. O resultado é o cabeçalho a  │
 * │ piscar e o texto a saltar debaixo do cursor.                             │
 * │                                                                         │
 * │ Fora do fluxo — `fixed`, com um espaçador que reserva SEMPRE a altura    │
 * │ máxima — o problema deixa de poder existir. No topo o cabeçalho          │
 * │ preenche o espaçador exactamente; quando encolhe é o conteúdo que passa  │
 * │ por baixo, como em qualquer cabeçalho fixo. Nenhum pixel se mexe.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export default function Nav() {
  const { abrirModal, disponivel, user } = useAuth();
  const [rolado, setRolado] = useState(false);
  const buscaAberta = useBuscaAberta();

  /**
   * Enquanto a pesquisa está aberta o cabeçalho não encolhe.
   *
   * O painel está ancorado ao invólucro da barra, e encolher move o invólucro
   * de linha — o painel iria com ele, para cima da marca. Congelar é grátis
   * aqui: o cabeçalho é `fixed` com espaçador de altura constante, portanto a
   * sua altura não participa no fluxo do documento.
   */
  const compacto = rolado && !buscaAberta;

  /**
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ A GEOMETRIA CONGELA COM A PESQUISA ABERTA; A SUPERFÍCIE NÃO              │
   * │                                                                         │
   * │ São duas decisões diferentes e estavam presas à mesma variável:          │
   * │                                                                         │
   * │  · a ALTURA (duas linhas ou uma) tem de ficar quieta enquanto o painel   │
   * │    está aberto, senão ele muda de linha por baixo de quem está a ler;    │
   * │  · o FUNDO depende só de haver conteúdo a passar por baixo. E com a      │
   * │    pesquisa aberta e a página rolada há — portanto o cabeçalho tem de    │
   * │    ficar opaco na mesma.                                                 │
   * │                                                                         │
   * │ Enquanto foram a mesma variável, esse caso ficava com o fundo a 70% e o  │
   * │ texto da página a ler-se através do cabeçalho, por trás do painel.       │
   * │                                                                         │
   * │ O desfoque acompanha a translucidez, e por isso continua a existir só no │
   * │ topo — onde nada passa por baixo e recompor a faixa não custa nada.      │
   * └─────────────────────────────────────────────────────────────────────────┘
   */
  const opaco = rolado;
  const [avatarUrl, setAvatarUrl] = useState("");
  const pathname = usePathname();
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
   * │                                                                         │
   * │ O limiar VIVE na altura da sentinela. Mudá-lo é mudar um número no       │
   * │ `className` — não há segunda cópia dele em JavaScript para divergir.     │
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

  // Um só item aceso, decidido de uma vez — ver o quadro em `nav-config.tsx`.
  const aceso = ambitoAtivo(pathname);

  return (
    <>
      {/* Espaçador em fluxo — só no desktop. No telemóvel o cabeçalho vive em
          baixo (ChromeMobile), por isso aqui não reservamos espaço nem
          mostramos este header (evita o «duplo header» no telemóvel). */}
      <div aria-hidden className="relative hidden h-[var(--rc-header-alto)] lg:block">
        <div ref={sentinela} className="absolute inset-x-0 top-0 h-10" />
      </div>

      <nav
        data-compacto={compacto}
        aria-label="Principal"
        className={`group fixed inset-x-0 top-0 z-50 hidden border-b transition-[height,background-color,border-color,box-shadow] duration-300 lg:block ${
          compacto ? "h-[var(--rc-header-linha)]" : "h-[var(--rc-header-linha)] lg:h-[var(--rc-header-alto)]"
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
         * │ UMA GRELHA DE DUAS LINHAS, E A BARRA MUDA DE CÉLULA                │
         * │                                                                   │
         * │ Linha 1: marca · âmbitos · ações. Linha 2: a barra, a atravessar   │
         * │ as três colunas. Quando o cabeçalho encolhe, a linha 2 fica vazia  │
         * │ (`1fr` do que sobra de zero é zero) e a barra passa para a coluna  │
         * │ do meio da linha 1, no lugar dos âmbitos.                          │
         * │                                                                   │
         * │ A CONSEQUÊNCIA QUE ISTO EXISTE PARA GARANTIR: nos dois estados a   │
         * │ barra fica centrada no MESMO eixo. Expandida centra-se nas três    │
         * │ colunas juntas; encolhida centra-se na do meio — e como as         │
         * │ laterais têm o mesmo mínimo, o centro da coluna do meio é o centro │
         * │ do cabeçalho. A barra muda de largura e de linha; nunca desliza    │
         * │ para o lado.                                                       │
         * │                                                                   │
         * │ Os mínimos laterais são iguais por isso mesmo, e não por os dois   │
         * │ lados precisarem do mesmo: o direito precisa de ~15 rem (feedback, │
         * │ tema e Dashboard numa linha), o esquerdo precisa de menos. É o     │
         * │ CENTRO que cede quando o ecrã aperta, em vez de espremer os        │
         * │ vizinhos até partirem em duas linhas.                              │
         * └───────────────────────────────────────────────────────────────────┘
         */}
        <div className="mx-auto grid h-full max-w-5xl grid-cols-[minmax(18.5rem,1fr)_minmax(0,26rem)_minmax(18.5rem,1fr)] grid-rows-[var(--rc-header-linha)_1fr] items-center gap-x-4 px-6 xl:max-w-6xl xl:grid-cols-[minmax(22rem,1fr)_minmax(0,26rem)_minmax(22rem,1fr)]">
          <Link
            href="/"
            aria-label="ReciboCerto — início"
            className="col-start-1 row-start-1 flex-shrink-0 justify-self-start rounded-xl"
          >
            <Logo />
          </Link>

          {/* Recolhe ao rolar — ver o quadro em `nav-config.tsx`. */}
          <nav
            aria-label="Âmbitos"
            className="col-start-2 row-start-1 justify-self-center group-data-[compacto=true]:hidden"
          >
            <ul className="flex items-center gap-0.5">
              {NAV_AMBITOS.map((item) => {
                const ativo = aceso?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      // `page` e não `true`: o item aceso É a página onde se
                      // está, e é isso que um leitor de ecrã tem de anunciar.
                      aria-current={ativo ? "page" : undefined}
                      className={`relative flex min-h-[40px] items-center whitespace-nowrap rounded-xl px-3 text-sm font-medium no-underline transition-colors ${
                        ativo
                          ? "text-stone-900 dark:text-stone-100"
                          : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      }`}
                    >
                      {item.label}
                      {/* O traço marca a ROTA; o rato marca com fundo. Dois
                          sinais de natureza diferente para não haver dois
                          itens a parecerem activos ao mesmo tempo. */}
                      {ativo && (
                        <span
                          aria-hidden
                          className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/**
           * A barra: linha 2 a atravessar a grelha quando o cabeçalho está
           * alto; coluna do meio da linha 1 quando encolhe. Sem transição de
           * largura — `grid-row` não é interpolável, portanto a mudança de
           * linha é instantânea, e animar só a largura deixaria a caixa a
           * arrastar-se depois de já ter aterrado.
           */}
          <div className="col-span-3 col-start-1 row-start-2 w-full justify-self-center group-data-[compacto=true]:col-span-1 group-data-[compacto=true]:col-start-2 group-data-[compacto=true]:row-start-1 group-data-[compacto=true]:max-w-[22rem] lg:max-w-[var(--rc-dock-larga)]">
            <DockPesquisa inputId="rc-header-busca" />
          </div>

          <div className="col-start-3 row-start-1 flex items-center justify-self-end gap-2">
            <button
              type="button"
              onClick={() => abrirFeedback()}
              aria-label="Sugestões, erros e dúvidas"
              title="Sugestões, erros e dúvidas"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <Megaphone size={17} />
            </button>

            <div className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-700" aria-hidden />

            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="group/cta relative inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand/10 py-1.5 pl-2 pr-3.5 text-sm font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white"
              >
                <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-brand/15 transition-colors group-hover/cta:bg-white/20">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" fill className="rounded-lg object-cover" sizes="28px" unoptimized />
                  ) : (
                    <User size={14} />
                  )}
                </span>
                Dashboard
              </Link>
            ) : disponivel ? (
              <>
                <button
                  type="button"
                  onClick={() => abrirModal("entrar")}
                  className="min-h-[40px] rounded-xl px-3 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                >
                  Entrar
                </button>
                <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                  <button
                    type="button"
                    onClick={() => abrirModal("criar")}
                    className="btn-shine inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
                  >
                    Começar<span className="hidden xl:inline">&nbsp;Grátis</span>
                    <ArrowRight size={13} />
                  </button>
                </m.div>
              </>
            ) : (
              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="btn-shine inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
                >
                  Começar<span className="hidden xl:inline">&nbsp;Grátis</span>
                  <ArrowRight size={13} />
                </Link>
              </m.div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
