import { DATA_LAST_REVIEW, FISCAL_YEAR } from "@/lib/fiscal-data";

export function NotaDisclaimer() {
  const dataRevisao = new Date(DATA_LAST_REVIEW).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <p className="mt-8 text-sm text-stone-400 border-t border-stone-100 dark:border-stone-800 pt-4">
      Este conteúdo é informativo e não substitui aconselhamento de um{" "}
      <a
        href="https://www.occ.pt/pt-pt/pesquisar-contabilista/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-stone-600 dark:hover:text-stone-300"
      >
        Contabilista Certificado
      </a>
      . Valores referentes a {FISCAL_YEAR} (OE 2026 — Lei 73-A/2025). Verificados em{" "}
      {dataRevisao}.
    </p>
  );
}
