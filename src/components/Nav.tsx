"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { LancadorBusca } from "@/components/busca/LancadorBusca";
import { MenuConta } from "@/components/header/MenuConta";
import { Logo, ArrowRight } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import { NAV_PRINCIPAL, navAtivo } from "@/components/nav-config";
import { medirNavegacao } from "@/lib/busca/medicao";
import { useBuscaAberta } from "@/components/busca/motor";

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
  const buscaAberta = useBuscaAberta();

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ A DENSIDADE É DO SCROLL. ABRIR A PESQUISA NÃO LHE TOCA (P1-03)       │
   * │                                                                     │
   * │ Era `rolado && !buscaAberta`: com a página rolada, clicar na barra   │
   * │ voltava a expandir o cabeçalho de 72 px para 136 px. O documento não │
   * │ sofria salto — o espaçador trata disso — mas a superfície fixa       │
   * │ crescia 64 px e tapava mais conteúdo exactamente no momento em que a │
   * │ pessoa estava a decidir o que procurar.                              │
   * │                                                                     │
   * │ Densidade e overlay são duas perguntas diferentes e passam a ter     │
   * │ duas respostas. O que continua a ser verdade é o INVERSO: rolar com  │
   * │ o painel aberto não pode mudar a densidade, porque o painel está     │
   * │ ancorado ao invólucro da barra e ele muda de linha da grelha. Por    │
   * │ isso o observador ignora as mudanças enquanto a pesquisa está        │
   * │ aberta: a densidade fica onde estava, sem NUNCA depender do acto de  │
   * │ abrir. É a invariante do §9.7: «abrir busca não muda `density`».     │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const compacto = rolado;
  const opaco = rolado;

  const [avatarUrl, setAvatarUrl] = useState("");
  const pathname = usePathname();
  const sentinela = useRef<HTMLDivElement>(null);

  const buscaAbertaRef = useRef(buscaAberta);
  useEffect(() => {
    buscaAbertaRef.current = buscaAberta;
  }, [buscaAberta]);

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
    const observador = new IntersectionObserver(
      ([entrada]) => {
        // Ver o quadro sobre densidade: com o painel aberto, a geometria fica
        // congelada onde está — senão o painel saltaria de linha por baixo de
        // quem está a ler.
        if (buscaAbertaRef.current) return;
        setRolado(!entrada?.isIntersecting);
      },
      { threshold: 0 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  // Um só item aceso, decidido de uma vez — ver o quadro em `nav-config.tsx`.
  const aceso = navAtivo(pathname);

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
         * │ Linha 1: marca · navegação · acções. Linha 2: a barra, a           │
         * │ atravessar as três colunas. Quando o cabeçalho encolhe, a linha 2  │
         * │ fica vazia e a barra passa para a coluna do meio da linha 1.       │
         * │                                                                   │
         * │ A CONSEQUÊNCIA QUE ISTO EXISTE PARA GARANTIR: nos dois estados a   │
         * │ barra fica centrada no MESMO eixo. A barra muda de largura e de    │
         * │ linha; nunca desliza para o lado.                                  │
         * └───────────────────────────────────────────────────────────────────┘
         */}
        <div className="mx-auto grid h-full max-w-5xl grid-cols-[minmax(14rem,1fr)_minmax(0,26rem)_minmax(14rem,1fr)] grid-rows-[var(--rc-header-linha)_1fr] items-center gap-x-4 px-6 xl:max-w-6xl xl:grid-cols-[minmax(16rem,1fr)_minmax(0,26rem)_minmax(16rem,1fr)]">
          <Link
            href="/"
            aria-label="ReciboCerto — início"
            className="focus-marca col-start-1 row-start-1 flex-shrink-0 justify-self-start rounded-xl"
          >
            <Logo />
          </Link>

          {/* Recolhe ao rolar — ver o quadro em `nav-config.tsx`. */}
          <ul className="col-start-2 row-start-1 flex items-center gap-0.5 justify-self-center group-data-[compacto=true]:hidden">
            {NAV_PRINCIPAL.map((item) => {
              const ativo = aceso?.href === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    // `page` e não `true`: o item aceso É a página onde se
                    // está, e é isso que um leitor de ecrã tem de anunciar.
                    aria-current={ativo ? "page" : undefined}
                    onClick={() => medirNavegacao(item.href, "secretaria")}
                    className={`focus-marca relative flex min-h-[40px] items-center whitespace-nowrap rounded-xl px-3 text-sm font-medium no-underline transition-colors ${
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
                      <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/**
           * A barra: linha 2 a atravessar a grelha quando o cabeçalho está
           * alto; coluna do meio da linha 1 quando encolhe. Sem transição de
           * largura — `grid-row` não é interpolável, portanto a mudança de
           * linha é instantânea, e animar só a largura deixaria a caixa a
           * arrastar-se depois de já ter aterrado.
           */}
          <div className="col-span-3 col-start-1 row-start-2 w-full justify-self-center group-data-[compacto=true]:col-span-1 group-data-[compacto=true]:col-start-2 group-data-[compacto=true]:row-start-1 group-data-[compacto=true]:max-w-[22rem] lg:max-w-[var(--rc-dock-larga)]">
            <LancadorBusca inputId="rc-header-busca" />
          </div>

          {/* Uma entrada de conta/ajuda e UMA acção. O tema e o feedback
              vivem dentro do menu — ver o quadro em `MenuConta.tsx`. */}
          <div className="col-start-3 row-start-1 flex items-center justify-self-end gap-2">
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
      </nav>
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
