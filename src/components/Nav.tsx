"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { LancadorBusca } from "@/components/busca/LancadorBusca";
import { MenuConta } from "@/components/header/MenuConta";
import { Logo, ArrowRight } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import CapsulaNav from "@/components/navegacao/CapsulaNav";
import MenuCompleto from "@/components/navegacao/MenuCompleto";
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
  const [menuAberto, setMenuAberto] = useState(false);
  const buscaAberta = useBuscaAberta();

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ABRIR A PESQUISA REEXPANDE O CABEÇALHO — E ISSO É DE PROPÓSITO       │
   * │                                                                     │
   * │ Houve uma tentativa de tornar a densidade independente do overlay    │
   * │ (P1-03 da auditoria: «abrir busca não muda density»). Em abstracto   │
   * │ faz sentido; neste cabeçalho estava errado, e o erro foi meu.        │
   * │                                                                     │
   * │ A razão é que a navegação VIVE na linha que desaparece ao compactar  │
   * │ (`group-data-[compacto=true]:hidden`). Com o cabeçalho compacto e o  │
   * │ painel aberto, o resultado era: os pilares sumiam da cápsula, e o    │
   * │ painel — que tem 44 rem, muito mais largo do que a barra             │
   * │ encolhida — ficava por cima da faixa onde elas deviam estar. Quem    │
   * │ abria a pesquisa perdia a navegação do site enquanto pesquisava.     │
   * │                                                                     │
   * │ Congelar a densidade só é neutro num cabeçalho onde a navegação não  │
   * │ depende dela. Aqui depende. Portanto: abrir a pesquisa devolve o     │
   * │ cabeçalho ao estado alto, as abas voltam, e o painel abre na segunda │
   * │ linha — POR BAIXO delas, não em cima.                                │
   * │                                                                     │
   * │ O efeito secundário que a auditoria temia (a superfície fixa crescer │
   * │ 64 px no momento da intenção) é real e é o preço menor: 64 px de     │
   * │ conteúdo tapado contra a navegação inteira inacessível.              │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  /**
   * O MENU já não entra nesta conta, e a razão de ter entrado desapareceu.
   *
   * Enquanto a cápsula recolhia ao compactar, abrir o menu com o cabeçalho
   * encolhido desmontava o próprio gatilho — e a `SuperficieModal` devolve
   * o foco ao elemento que estava activo à abertura, portanto fechar
   * deixava o foco no `<body>`. Agora a cápsula fica, o gatilho fica, e o
   * estado do menu não tem de mexer na densidade do cabeçalho.
   */
  const compacto = rolado && !buscaAberta;

  /**
   * O FUNDO não segue a densidade — segue o scroll, e só ele.
   *
   * São duas decisões diferentes e já estiveram presas à mesma variável: a
   * ALTURA tem de ficar quieta enquanto o painel está aberto, mas o fundo
   * depende apenas de haver conteúdo a passar por baixo. Com a pesquisa
   * aberta e a página rolada há — e o cabeçalho tem de ficar opaco na
   * mesma, senão o texto da página lê-se através dele, por trás do painel.
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
         * │ TRÊS LINHAS, E CADA UMA COM UM TRABALHO SÓ                         │
         * │                                                                   │
         * │   1  marca · acções          (as pontas, nada no meio)            │
         * │   2  a cápsula               (atravessa a grelha, centrada)        │
         * │   3  a barra de pesquisa     (atravessa a grelha, centrada)        │
         * │                                                                   │
         * │ Eram DUAS, com a marca, a navegação e as acções a disputarem a     │
         * │ primeira, e isso partiu-se quando a navegação passou a ter seis    │
         * │ lugares. A 1920 px a cápsula ficava a 3 px do logótipo e a 2 px    │
         * │ de «Conta» — e, pior, o seu centro caía a 886 px enquanto a barra  │
         * │ por baixo estava centrada a 960. Dois elementos centrados,         │
         * │ empilhados, em eixos diferentes.                                   │
         * │                                                                   │
         * │ A causa era estrutural, não de espaçamento: a cápsula vivia na     │
         * │ coluna do meio de uma grelha cujas colunas laterais têm larguras   │
         * │ diferentes (marca ~136 px, acções ~233 px), portanto centrava-se   │
         * │ no ESPAÇO QUE SOBRAVA. Numa linha inteira, o eixo é o da página —  │
         * │ e a linha 2 e a linha 3 partilham-no por construção.                │
         * │                                                                   │
         * │ AO ENCOLHER, as linhas 2 e 3 esvaziam-se: a cápsula recolhe e a    │
         * │ barra sobe para a coluna do meio da linha 1. É a MESMA instância   │
         * │ da barra a mudar de célula — nunca uma segunda montada noutro      │
         * │ sítio, que perderia o texto escrito e o foco no gesto.             │
         * └───────────────────────────────────────────────────────────────────┘
         */}
        <div className="mx-auto grid h-full max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[var(--rc-header-linha)_var(--rc-linha-nav)_var(--rc-linha-busca)] items-center gap-x-4 px-6 group-data-[compacto=true]:grid-rows-[var(--rc-header-linha)_var(--rc-linha-nav)_0px] xl:max-w-6xl">
          <Link
            href="/"
            aria-label="ReciboCerto — início"
            className="focus-marca col-start-1 row-start-1 flex-shrink-0 justify-self-start rounded-xl"
          >
            <Logo />
          </Link>

          {/* Linha 2 — a cápsula, a atravessar a grelha toda para ficar no
              eixo da página. NÃO recolhe ao rolar: é a espinha do produto, e
              perdê-la aos primeiros 40 px de scroll obrigava a voltar ao topo
              só para mudar de sítio. O que recolhe é a linha da pesquisa, e a
              barra sobe para o meio da primeira. */}
          <div className="col-span-3 col-start-1 row-start-2 flex min-w-0 justify-center">
            <CapsulaNav aoAbrirMenu={() => setMenuAberto(true)} menuAberto={menuAberto} />
          </div>

          {/**
           * Linha 3 — a barra. Atravessa a grelha quando o cabeçalho está
           * alto; sobe para a coluna do meio da linha 1 quando encolhe. Sem
           * transição de largura — `grid-row` não é interpolável, portanto a
           * mudança de linha é instantânea, e animar só a largura deixaria a
           * caixa a arrastar-se depois de já ter aterrado.
           */}
          <div className="col-span-3 col-start-1 row-start-3 w-full justify-self-center group-data-[compacto=true]:col-span-1 group-data-[compacto=true]:col-start-2 group-data-[compacto=true]:row-start-1 group-data-[compacto=true]:max-w-[22rem] lg:max-w-[var(--rc-dock-larga)]">
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
