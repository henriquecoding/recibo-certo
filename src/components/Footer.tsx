import { Logo } from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-data";

export default function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-stone-200 bg-white">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo small />
        <p className="text-xs text-stone-400 text-center max-w-md">
          Calculadora informativa com base nas taxas fiscais portuguesas de {FISCAL_YEAR}. Não substitui o aconselhamento
          de um contabilista certificado.
        </p>
        <p className="text-xs text-stone-400 whitespace-nowrap">© {FISCAL_YEAR} ReciboCerto</p>
      </div>
    </footer>
  );
}
