"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O BOTÃO DAS NOVIDADES — o que substituiu o popup
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UM BOTÃO, E NÃO UM POPUP (regra 10 do CLAUDE.md)              │
//  │                                                                     │
//  │ «Novidades & Atualizações» abria-se sozinho a cada versão nova. Era  │
//  │ correcto — uma vez por versão, nunca a cada refresh — e mesmo assim  │
//  │ era a única superfície do produto que interrompia o que a pessoa     │
//  │ tinha vindo fazer. Quem chega para calcular um recibo é recebido     │
//  │ por um diálogo modal sobre outra coisa qualquer, com o teclado       │
//  │ preso lá dentro até o fechar.                                        │
//  │                                                                     │
//  │ A informação continua a valer; o que não valia era a interrupção.    │
//  │ Passa a ser um controlo ao lado do tema, com um ponto quando há      │
//  │ versão por ver — o mesmo sinal, a um toque de distância, sem tapar   │
//  │ nada. Quem quer saber, carrega; quem não quer, nunca é interrompido. │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Vive onde vive o seletor de tema — no telemóvel e no computador, pela
//  mesma razão: são os dois controlos do produto que não são destinos.
// ═══════════════════════════════════════════════════════════════════════

import { Sparkle } from "@/components/ui/Icons";
import { abrirNovidades } from "@/components/novidades/abrir";
import { useNovidadesPorVer } from "@/hooks/useNovidadesPorVer";

export default function BotaoNovidades({
  className = "",
  /**
   * Corre ANTES de pedir a abertura. Existe por causa da folha do menu: o
   * painel é `aria-modal` e o coordenador nunca deixa dois no ecrã, por isso
   * a superfície que o abre tem de se arrumar primeiro. Ver
   * `overlays/CoordenadorOverlays.tsx`.
   */
  aoAbrir,
}: {
  className?: string;
  aoAbrir?: () => void;
}) {
  const porVer = useNovidadesPorVer();

  return (
    <button
      type="button"
      data-novidades-gatilho
      aria-haspopup="dialog"
      // O nome acessível diz o estado, porque o ponto é a única pista visual
      // e um ponto não tem nome. Quem ouve o botão ouve a mesma informação
      // que quem o vê.
      aria-label={porVer ? "Novidades e atualizações — há novidades por ver" : "Novidades e atualizações"}
      title="Novidades e atualizações"
      onClick={() => {
        aoAbrir?.();
        abrirNovidades();
      }}
      className={`focus-marca relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 dark:hover:border-stone-600 dark:hover:text-stone-200 ${className}`}
    >
      <Sparkle size={16} />
      {porVer && (
        // Dentro dos limites do botão, e não a transbordar: a pastilha vive
        // em cabeçalhos com fundos diferentes (branco, `cream`, `stone-900`),
        // e um contorno da cor do fundo teria de adivinhar qual. Aqui não há
        // costura para esconder.
        <span
          aria-hidden
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand"
        />
      )}
    </button>
  );
}
