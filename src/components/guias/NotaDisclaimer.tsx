import Link from "next/link";
import { manifesto } from "@/lib/guias/manifests";
import { LEITURAS_COMPLEMENTARES } from "@/lib/guias/legal-sources";

// ─────────────────────────────────────────────────────────────────────────
//  Aviso editorial por Guia.
//
//  O aviso global anterior afirmava que TODOS os valores vinham do OE 2026
//  (Lei 73-A/2025). Era falso: a maior parte das regras vem do CIRS, CIVA,
//  CIRC, Código Contributivo, Código do Trabalho, leis autónomas ou
//  despachos (falha 4.3 da auditoria).
//
//  Agora cada Guia declara o período a que se aplica e a data da sua
//  revisão; as fontes concretas ficam no bloco de fontes, logo acima.
//
//  ⚠️ ACHADO A1b DA AUDITORIA DOS GUIAS — o único caminho para um
//  contabilista que existia nos 169 guias era esta frase, e mandava a
//  pessoa para FORA: «contabilista certificado» ligava ao registo público
//  da Ordem, em `occ.pt`. A frase mais repetida do corpus sobre
//  contabilistas mandava o leitor procurar um desconhecido noutro sítio,
//  enquanto a casa tinha diretório verificado contra a OCC, casos,
//  propostas e agenda a funcionar.
//
//  A referência à Ordem MANTÉM-SE — é o registo oficial, e é lá que se
//  confirma uma inscrição. O que muda é deixar de ser o único destino: ao
//  lado dela fica o caminho de casa, que é gratuito e não exige plano
//  nenhum.
// ─────────────────────────────────────────────────────────────────────────

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });

export function NotaDisclaimer({ slug }: { slug: string }) {
  const m = manifesto(slug);
  if (!m) return null;

  const anoDe = new Date(m.effectiveFrom).getFullYear();
  const periodo = m.effectiveTo
    ? `ao ano fiscal de ${anoDe}`
    : `a situações a partir de ${dataLonga(m.effectiveFrom)}`;

  return (
    <p className="mt-8 border-t border-stone-100 pt-4 text-sm leading-relaxed text-stone-400 dark:border-stone-800">
      Este conteúdo é informativo e não substitui aconselhamento de um contabilista
      certificado. Podes{" "}
      <Link
        href="/contabilistas"
        className="underline hover:text-stone-600 dark:hover:text-stone-300"
      >
        falar com um contabilista certificado aqui
      </Link>{" "}
      ou confirmar qualquer inscrição no{" "}
      <a
        href={LEITURAS_COMPLEMENTARES.occRegisto.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-stone-600 dark:hover:text-stone-300"
      >
        registo público da Ordem
      </a>
      . Aplica-se {periodo}. Revisto em {dataLonga(m.lastReviewedAt)} por {m.owner}
      {m.reviewer !== m.owner ? ` · revisão fiscal: ${m.reviewer}` : ""}.
    </p>
  );
}

export default NotaDisclaimer;
