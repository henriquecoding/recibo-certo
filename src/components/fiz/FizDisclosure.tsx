import { Info } from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Divulgação da relação comercial com a FIZ.
//  Ponto 5.4 da arquitetura: "qualquer relação comercial é declarada".
//  Aparece SEMPRE que existe uma ação FIZ — nunca é opcional nem escondida
//  atrás de um toggle.
// ─────────────────────────────────────────────────────────────────────────

export default function FizDisclosure({ texto, className = "" }: { texto: string; className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400 ${className}`}>
      <Info size={12} className="mt-0.5 flex-shrink-0 text-fiz-700" />
      <span>{texto}</span>
    </p>
  );
}
