"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A FOLHA DA NAVEGAÇÃO COMPLETA — uma só, para os dois ecrãs
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE A BARRA DEIXOU DE MOSTRAR TUDO                                │
//  │                                                                     │
//  │ A cápsula leva os cinco pilares e mais nada. «Guias», «Quiz»,        │
//  │ «Planos» e «Contabilistas» eram itens da barra e passam a viver      │
//  │ aqui — e no rodapé, que é HTML servido e legível sem JavaScript.     │
//  │                                                                     │
//  │ Nenhum dos quatro se perde: continuam todos no índice de pesquisa,   │
//  │ que está permanentemente a um clique e — ao contrário de um menu —   │
//  │ é pesquisável, navegável por teclado e alcançável no telemóvel.      │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ UMA FOLHA, DUAS GEOMETRIAS — E NÃO DOIS COMPONENTES                  │
//  │                                                                     │
//  │ A folha de «Conta» do telemóvel e um menu de secretária seriam duas  │
//  │ superfícies com o mesmo conteúdo e duas identidades a divergir — o   │
//  │ defeito que a pesquisa já teve e que custou uma reescrita. Aqui é o  │
//  │ mesmo componente: no telemóvel entra pelo fundo e ocupa a largura;   │
//  │ a partir de `lg` centra-se e ganha colunas. O que muda é geometria.  │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { LogoMark, Close, ArrowRight, LayoutGrid, Megaphone, ChevronRight } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { abrirFeedback } from "@/components/feedback/abrir";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";
import { MENU_GRUPOS, hrefAtivo, type EntradaMenu } from "@/lib/navegacao";
import { medirNavegacao } from "@/lib/busca/medicao";

export default function MenuCompleto({
  aberto,
  aoFechar,
  superficie,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** De onde foi aberta — só para a medição saber distinguir as duas. */
  superficie: "secretaria" | "movel";
}) {
  const pathname = usePathname();
  const { user, disponivel, abrirModal } = useAuth();
  const aceso = hrefAtivo(pathname);

  /**
   * A vaga do coordenador vive AQUI e não em cada gatilho.
   *
   * A folha é `aria-modal`, portanto não pode coexistir com o
   * consentimento, com a pesquisa nem com o modal de conta. Pedir a vaga
   * dentro do componente que a abre — e não em cada uma das duas
   * superfícies que o montam — é o que garante que a regra é a mesma no
   * computador e no telemóvel, sem ninguém ter de se lembrar dela.
   */
  const permitido = useOverlay("menu", aberto, { modal: true, iniciadoPeloUtilizador: true });

  return (
    <SuperficieModal
      aberto={permitido}
      aoFechar={aoFechar}
      rotulo="Navegação completa"
      className="fixed inset-0 z-[80]"
    >
      <AnimatePresence>
        <m.div
          key="veu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
          onClick={aoFechar}
          aria-hidden
        />
        {/* Folha inferior no telemóvel (regra 5b do CLAUDE.md), cartão
            centrado a partir de `lg`. O corpo é que rola — `min-h-0` no
            filho de flex, senão `overflow-y-auto` não tem altura a que se
            agarrar e a folha cresce para fora do ecrã. */}
        <m.div
          key="folha"
          initial={{ y: "100%", opacity: 1 }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 340 }}
          className="rc-menu-folha absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-4xl border-t border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900 lg:rounded-4xl lg:border"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
            <Link
              href="/"
              onClick={aoFechar}
              aria-label="ReciboCerto — início"
              className="focus-marca flex items-center gap-2 text-brand no-underline"
            >
              <LogoMark size={26} />
              <span className="font-display text-sm font-semibold text-stone-800 dark:text-stone-100">
                Recibo<span className="text-brand">Certo</span>
              </span>
            </Link>
            {/* O tema vive AQUI, no cabeçalho da folha, e não no fim dela.
                Estava no topo do telemóvel e saiu de lá para dar lugar ao
                botão que abre esta folha — a 360 px não cabiam os dois. O
                custo tinha de ser um toque, não uma caça: no fim da folha
                obrigava a rolar por quatro grupos de destinos; aqui está
                visível no instante em que a folha abre. */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar"
                className="focus-marca flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Close size={18} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:p-5">
            {/* A conta primeiro: é a pergunta «e eu, aqui?», e estava no
                fim de dois ecrãs de rolagem antes de a folha ser revista. */}
            <div className="mb-4 border-b border-stone-100 pb-4 dark:border-stone-800">
              {user ? (
                <Link
                  href="/dashboard"
                  onClick={aoFechar}
                  className="focus-marca flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white no-underline shadow-glow"
                >
                  <LayoutGrid size={16} /> Ir para o painel
                </Link>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {disponivel && (
                    <button
                      type="button"
                      onClick={() => {
                        aoFechar();
                        abrirModal("entrar");
                      }}
                      className="focus-marca flex w-full items-center justify-center rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-brand/40 dark:border-stone-700 dark:text-stone-300"
                    >
                      Entrar
                    </button>
                  )}
                  <Link
                    href={disponivel ? "#" : "/dashboard"}
                    onClick={(e) => {
                      if (!disponivel) {
                        aoFechar();
                        return;
                      }
                      e.preventDefault();
                      aoFechar();
                      abrirModal("criar");
                    }}
                    className="focus-marca flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white no-underline shadow-glow"
                  >
                    Começar grátis <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            {/* As colunas do menu. A grelha empilha no telemóvel — base é o
                ecrã estreito e `lg:` só amplia. */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-4">
              {MENU_GRUPOS.map((grupo) => (
                <div key={grupo.titulo}>
                  <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 lg:px-2">
                    {grupo.titulo}
                  </p>
                  <div className="space-y-0.5">
                    {grupo.entradas.map((entrada) => (
                      <LinhaMenu
                        key={entrada.href}
                        entrada={entrada}
                        ativo={aceso === entrada.href}
                        aoNavegar={() => {
                          medirNavegacao(entrada.href, superficie);
                          aoFechar();
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  aoFechar();
                  abrirFeedback({ area: pathname });
                }}
                className="focus-marca flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 sm:px-2"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <Megaphone size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                    Sugestões e reportes
                  </span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                    Ideias, erros, dúvidas ou uma mensagem
                  </span>
                </span>
              </button>
            </div>
          </div>
        </m.div>
      </AnimatePresence>
    </SuperficieModal>
  );
}

function LinhaMenu({
  entrada,
  ativo,
  aoNavegar,
}: {
  entrada: EntradaMenu;
  ativo: boolean;
  aoNavegar: () => void;
}) {
  const Icon = entrada.icone ? iconeDe(entrada.icone) : null;
  return (
    <Link
      href={entrada.href}
      onClick={aoNavegar}
      // `page` e não `true`: o item aceso É a página onde se está.
      aria-current={ativo ? "page" : undefined}
      className={`focus-marca flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-2.5 no-underline transition-colors lg:px-2 ${
        ativo ? "bg-brand-light dark:bg-brand/15" : "hover:bg-stone-50 dark:hover:bg-stone-800"
      }`}
    >
      {Icon && (
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
            ativo ? "bg-brand text-white" : "bg-brand-light text-brand"
          }`}
        >
          <Icon size={17} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${
            ativo ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"
          }`}
        >
          {entrada.label}
        </span>
        {entrada.desc && (
          // `line-clamp-2` e não `truncate`: numa coluna de menu, uma linha
          // cortada a meio da primeira palavra útil («16 simuladores,
          // calcul…») não diz nada que a pessoa não soubesse pelo título.
          // Duas linhas chegam para a frase inteira em todas as entradas.
          <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-stone-500 dark:text-stone-400">
            {entrada.desc}
          </span>
        )}
      </span>
      <ChevronRight size={14} className="flex-shrink-0 text-stone-300" />
    </Link>
  );
}
