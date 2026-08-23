"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CHROME INFERIOR — telemóvel e tablet (< lg)
//  ---------------------------------------------------------------------
//  TODO o chrome do telemóvel vive aqui, no fundo do ecrã, em três linhas:
//  o dock de pesquisa (`busca/DockMovel.tsx`), os cinco pilares e — colada
//  ao fundo — a marca com o menu e a acção (`ChromeMobileMarca.tsx`). A
//  última já foi uma barra em fluxo no TOPO da página, e repartia o chrome
//  por duas pontas do ecrã: o polegar trabalha em baixo e a identidade e a
//  acção estavam a um scroll de distância. Nada disto aparece no /dashboard
//  nem no /admin, que têm chrome próprio.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ OS CINCO LUGARES SÃO OS CINCO PILARES — E JÁ NÃO CINCO SECÇÕES       │
//  │                                                                     │
//  │      antes:  Início · Guias · Quiz · Contabilistas · Conta          │
//  │      agora:  Descobrir · Preço · Recibos · Salário · Empresa        │
//  │                                                                     │
//  │ A barra anterior tinha um problema que não dava erro nenhum: NÃO     │
//  │ ERA A BARRA DE SECRETÁRIA. Lá dizia «Simular · Guias · Quiz ·       │
//  │ Planos · Contabilistas», aqui dizia outra coisa, e as duas listas    │
//  │ viviam em ficheiros diferentes sem nada que as obrigasse a           │
//  │ concordar. Havia duas respostas à pergunta «onde posso ir?»,         │
//  │ consoante o ecrã.                                                    │
//  │                                                                     │
//  │ Agora os lugares derivam de `lib/navegacao.ts`, que é a MESMA fonte  │
//  │ que a cápsula do computador lê, e `navegacao.test.ts` reprova        │
//  │ quando uma das superfícies deixa de a refletir. A ordem continua a   │
//  │ ser contrato — quem aprendeu onde está «Recibos» acerta-lhe sem      │
//  │ olhar — e agora é UM contrato, não dois.                             │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ «CONTA» DEIXA DE SER UM DOS CINCO, E A FOLHA SOBE PARA O TOPO        │
//  │                                                                     │
//  │ São cinco lugares e cinco pilares: a conta, os guias, o quiz, os     │
//  │ planos e os contabilistas não cabem cá — e não é por serem menos     │
//  │ importantes, é por serem de outra natureza. Um pilar é um sítio      │
//  │ onde se faz uma tarefa; aquilo é o resto do produto.                 │
//  │                                                                     │
//  │ Passam todos para `MenuCompleto`, a folha que o `ChromeMobileTopo`   │
//  │ abre e que é a MESMA que a cápsula do computador abre. Continuam     │
//  │ também no rodapé (HTML servido, legível sem JavaScript) e no índice  │
//  │ de pesquisa, que tem largura inteira aqui mesmo por cima desta       │
//  │ barra.                                                               │
//  │                                                                     │
//  │ O CUSTO, dito por inteiro: a folha deixa de estar na zona do         │
//  │ polegar. Fica a um gesto — rolar ao topo, ou ao rodapé — em vez de   │
//  │ a um toque. É o preço de os cinco lugares serem cinco destinos de    │
//  │ trabalho em vez de quatro destinos e uma gaveta.                     │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { PILARES } from "@/lib/navegacao";
import { DockMovel } from "@/components/busca/DockMovel";
import ChromeMobileMarca from "@/components/ChromeMobileMarca";
import { medirNavegacao } from "@/lib/busca/medicao";
import { useQuizAJogar } from "@/hooks/useQuizAJogar";

/**
 * Os cinco lugares. A ordem vem da fonte e é fixa; o significado nunca
 * muda com o estado da sessão — mudar o destino de um lugar por baixo do
 * dedo de quem já aprendeu onde ele está é a forma mais rápida de desfazer
 * essa memória.
 *
 * O rótulo é o `curto` de cada pilar, e é medido: a 360 px cada lugar tem
 * ~64,8 px úteis, e o mais comprido aqui é «Descobrir» (9 caracteres em DM
 * Sans 10px/600 com `tracking-tight`, ~42 px). Cabe com folga. Se um dia
 * deixar de caber, encurta-se o `curto` desse pilar em `lib/navegacao.ts`
 * — nunca o tamanho de letra dos cinco, que os deixaria a parecer níveis
 * diferentes de navegação.
 */
const SLOTS = PILARES.map((p) => ({
  tipo: "link" as const,
  id: p.id,
  label: p.curto,
  nomeCompleto: p.label,
  href: p.href,
  icone: p.icone,
}));

export default function ChromeMobile() {
  const pathname = usePathname();
  const reduzMovimento = useReducedMotion();

  // O chrome sai do caminho enquanto há uma pergunta no ecrã — e o de cima
  // lê exactamente a mesma coisa. Ver `hooks/useQuizAJogar.ts`.
  const quizAJogar = useQuizAJogar(pathname.startsWith("/quiz-fiscal"));

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || quizAJogar) return null;

  /**
   * A rota exacta ou um SEGMENTO abaixo dela — e não um `startsWith` cru.
   *
   * Com o prefixo à letra, bastava uma rota nova cair dentro do nome de
   * outra para acender o lugar errado. É a mesma regra que a cápsula de
   * secretária aplica em `destinoAtivo`.
   */
  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Espaço para o conteúdo não ficar tapado pelo chrome inferior — a
          pilha toda (barra + dock) e a área segura do dispositivo. O número
          vive em `globals.css` porque o dock e o botão «voltar ao topo»
          leem o mesmo; escrito à mão nos três, divergia. */}
      <div className="h-[var(--rc-chrome-movel)] lg:hidden" aria-hidden />

      {/* O dock de pesquisa, imediatamente acima da barra. */}
      <DockMovel />

      {/**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ O TABLET DEIXA DE HERDAR O TELEMÓVEL (P2-05)                   │
       * │                                                               │
       * │ De 360 a 1023 px era exactamente a mesma barra de extremo a    │
       * │ extremo. Num ecrã de 900 px isso põe o primeiro e o último     │
       * │ lugar a mais de meio palmo um do outro, com o olhar a          │
       * │ atravessar o ecrã inteiro entre dois alvos que se usam a       │
       * │ seguir um ao outro.                                            │
       * │                                                               │
       * │ A partir de `md` a doca fica centrada, com 40 rem no máximo e  │
       * │ afastada do fundo: os cinco alvos ficam ao alcance do polegar  │
       * │ de quem segura o tablet, e o conteúdo respira por baixo.       │
       * └───────────────────────────────────────────────────────────────┘
       */}
      {/* `md:pb-[max(1rem,…)]` e não `md:pb-4`: é este afastamento que o token
          `--rc-barra-h` descreve a partir de `md`, e um 16 px fixo aqui
          tornava o token uma aproximação num tablet com indicador no fundo. */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden md:px-6 md:pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Uma superfície, DUAS linhas: os cinco pilares e, colada ao fundo,
            a marca com o menu e a acção. Uma só caixa e não duas fixas — o
            fundo, o contorno, o desfoque e a área segura são tratados uma
            vez, e no tablet a coisa toda flutua como um cartão só. */}
        <div className="mx-auto border-t border-stone-100 bg-cream/95 pb-[var(--rc-barra-fundo)] backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95 md:max-w-[40rem] md:rounded-2xl md:border md:shadow-float">
        <nav
          aria-label="Navegação"
          className="flex items-stretch justify-between gap-0.5 px-1 pt-1.5 md:gap-1 md:px-2"
        >
          {SLOTS.map((slot) => {
            const on = ativo(slot.href);
            const Icon = iconeDe(slot.icone);
            /**
             * `min-w-0` e não um mínimo em `rem` — e é o que impede o
             * overflow horizontal por CONSTRUÇÃO.
             *
             * Um item de flex não encolhe abaixo do seu conteúdo mínimo por
             * omissão, e um rótulo sem espaços é indivisível: sem isto, a
             * palavra mais comprida decidia a largura dos cinco lugares e a
             * barra passava a ser mais larga do que o ecrã. Com `flex-1`
             * (base zero) e `min-w-0`, os cinco lugares ficam exactamente
             * iguais seja qual for o rótulo, e o pior caso possível é um
             * rótulo com reticências — nunca uma página a rolar para o lado.
             */
            const classe = `focus-marca flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 no-underline transition-colors ${
              on
                ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
                : // `stone-600` e não `stone-500`: medido sobre o fundo desta
                  // barra (`cream`), o 500 dá 4,42:1 e o rótulo tem 10 px —
                  // texto pequeno, portanto a régua da WCAG AA é 4,5:1 e
                  // falhava por pouco. O 600 dá 6,9:1. No escuro já passava
                  // (7,8:1), por isso o `dark:` fica como está.
                  "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            }`;

            /**
             * ┌───────────────────────────────────────────────────────────┐
             * │ CARREGAR NO SEPARADOR ONDE JÁ SE ESTÁ LEVA AO PRINCÍPIO    │
             * │                                                           │
             * │ Uma `<Link>` para a rota em que já estamos não faz nada —  │
             * │ o Next não navega, e por isso também não repõe o scroll.   │
             * │ Quem estava no fim de uma página e carregava no separador  │
             * │ aceso à espera de voltar ao início ficava exactamente onde │
             * │ estava, sem um sinal de que o toque tinha sido registado.  │
             * │                                                           │
             * │ A rota EXACTA, e não o prefixo que acende o separador: uma │
             * │ sub-rota mantém o lugar aceso e o toque tem de continuar a │
             * │ levar à página do pilar, que é outra página.                │
             * └───────────────────────────────────────────────────────────┘
             */
            const naRotaExacta = pathname === slot.href;

            return (
              <Link
                key={slot.id}
                href={slot.href}
                // O nome acessível é sempre o COMPLETO, mesmo quando o que
                // se vê é o curto — o que um leitor de ecrã anuncia não
                // pode depender da largura do ecrã.
                aria-label={slot.nomeCompleto}
                aria-current={on ? "page" : undefined}
                onClick={(e) => {
                  medirNavegacao(slot.id, window.innerWidth >= 768 ? "tablet" : "movel");
                  if (!naRotaExacta) return;
                  // `⌘/Ctrl/Shift + clique` continuam a pertencer ao browser.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  // `behavior` explícito passa à frente do
                  // `prefers-reduced-motion` do `globals.css` — daí decidir
                  // aqui também, como o `BotaoTopo` já faz.
                  window.scrollTo({ top: 0, behavior: reduzMovimento ? "auto" : "smooth" });
                }}
                className={classe}
              >
                <Icon size={20} />
                {/* O rótulo é o que torna o lugar aprendível. Um ícone
                    isolado obriga a adivinhar; cinco obrigam a adivinhar
                    cinco vezes. */}
                <span
                  aria-hidden
                  className="w-full truncate text-center text-[10px] font-semibold leading-none tracking-tight"
                >
                  {slot.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* A terceira linha. Já foi uma barra em fluxo no topo da página —
            ver o quadro em `ChromeMobileMarca.tsx`. É filha desta caixa e
            não é montada no `layout.tsx`, e é também por isso que já não
            traz guardas de rota próprias: as deste componente valem para
            as três linhas. */}
        <ChromeMobileMarca />
        </div>
      </div>
    </>
  );
}
