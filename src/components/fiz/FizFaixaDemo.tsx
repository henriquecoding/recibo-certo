// ═══════════════════════════════════════════════════════════════════════
//  FAIXA ESTÁTICA POR BAIXO DE UMA DEMONSTRAÇÃO — o piso
//  ---------------------------------------------------------------------
//  Um botão que só existe durante 3 segundos a cada ciclo é um botão hostil.
//  Quatro cenários partem-no, e três deles não se resolvem com trancas:
//
//   · `prefers-reduced-motion` — as duas demos repousam no ato do RESULTADO,
//     não no da parceria. O ato FIZ NUNCA aparece a quem pediu menos
//     movimento, e essa é precisamente parte do público que mais beneficia
//     de um caminho estático.
//   · toque — `onMouseEnter` não dispara de forma fiável num ecrã tátil;
//   · sem JavaScript ou antes da hidratação — as demos são `"use client"` e
//     antes de hidratar não há link nenhum no DOM.
//
//  Esta faixa é um componente de SERVIDOR, fora do palco. Está no HTML
//  inicial, não se move, não desaparece, e é a única superfície das demos que
//  os motores de pesquisa veem — com `rel="sponsored nofollow"`, portanto sem
//  transmitir autoridade.
//
//  O botão dentro do ato é o extra. Isto é o piso.
// ═══════════════════════════════════════════════════════════════════════

import FizLogo from "./FizLogo";
import FizActionButton from "./FizActionButton";
import FizDisclosure from "./FizDisclosure";
import { copyDaSuperficie, DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import {
  parceriaAtiva,
  parceriaUtilizavel,
  parceriasAtivas,
  placementDaSuperficie,
} from "@/lib/parcerias/catalogo.server";
import type { Superficie } from "@/content/parcerias-destinos";

export default async function FizFaixaDemo({
  superficie,
  className = "",
}: {
  superficie: Extract<Superficie, "demo.hero.faixa" | "demo.irs.faixa">;
  className?: string;
}) {
  // Sem parceria ativa não há faixa — e a demo continua exatamente igual.
  if (!parceriasAtivas()) return null;
  const parceria = await parceriaAtiva("fiz");
  if (!parceriaUtilizavel(parceria)) return null;
  if (parceria.modo !== "LIGACAO") return null;

  const placement = await placementDaSuperficie(parceria.id, superficie);
  if (!placement) return null;

  const recurso = copyDaSuperficie(superficie);
  const titulo = placement.copyTitulo?.trim() || recurso.titulo;
  const sub = placement.copySub?.trim() || recurso.sub;
  const cta = placement.copyCta?.trim() || recurso.cta;
  const divulgacao =
    placement.divulgacao?.trim() || parceria.divulgacao.trim() || DIVULGACAO_LIGACAO;

  // Destino de alta intenção: quem chega ao fim de uma demonstração já viu o
  // número e a conclusão.
  const href = `/ir/fiz?s=${encodeURIComponent(superficie)}&v=faixa&d=registo`;

  return (
    <div className={className}>
      <aside className="flex flex-wrap items-center gap-3 rounded-2xl border border-fiz-200 bg-fiz-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
        <FizLogo size={24} className="flex-shrink-0 rounded-lg" decorativo />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{sub}</p>
        </div>
        <FizActionButton href={href}>{cta}</FizActionButton>
      </aside>
      <FizDisclosure texto={divulgacao} className="mt-1.5" />
    </div>
  );
}
