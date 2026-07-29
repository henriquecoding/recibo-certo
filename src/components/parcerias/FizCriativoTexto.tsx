// ═══════════════════════════════════════════════════════════════════════
//  CRIATIVOS DE TEXTO — gerados em código, não servidos como imagem
//  ---------------------------------------------------------------------
//  Metade do kit da FIZ é literalmente uma frase, um logótipo e um botão
//  sobre fundo creme. Servir isso como PNG de 2× retina custa:
//
//   · peso (o leaderboard são ~250 KB para 90 px de altura);
//   · CLS, se as dimensões não forem explícitas;
//   · texto que um leitor de ecrã não lê e que o utilizador não pode ampliar;
//   · um banner que não sabe se a página está em modo escuro.
//
//  Em código, o mesmo criativo é uma âncora com texto real, respeita o
//  `prefers-color-scheme`, escala com o zoom e pesa zero bytes de imagem.
//  Os formatos com captura de ecrã do produto (300×600) continuam a ser
//  imagem — esses não se reproduzem com CSS.
//
//  LIMITE CONTRATUAL (cl. 15.1): a licença de marca permite converter e
//  comprimir, não recompor. Por isso a copy aqui é a APROVADA PELA FIZ, tal
//  como vem no kit — «Faturação e impostos, em piloto automático.»,
//  «Para freelancers em Portugal», «Experimentar» — e o logótipo é o
//  `FizLogo` oficial. Não se inventa uma frase nova sobre o produto deles.
//
//  O preço não aparece em lado nenhum: muda do lado deles sem nos avisarem,
//  e um preço errado num bloco comercial é uma afirmação enganadora (cl. 12.1).
// ═══════════════════════════════════════════════════════════════════════

import FizLogo from "@/components/fiz/FizLogo";
import { ArrowRight } from "@/components/ui/Icons";

/** Formatos que se reproduzem em código, com a proporção do kit original. */
export type FormatoTexto =
  | "leaderboard" //  728 × 90   — faixa larga e baixa
  | "billboard" //    970 × 250  — faixa larga e alta
  | "retangulo" //    300 × 250  — bloco lateral
  | "retanguloGrande" // 336 × 280
  | "movel"; //       320 × 100  — faixa de telemóvel

interface Dimensao {
  largura: number;
  altura: number;
}

export const DIMENSAO: Record<FormatoTexto, Dimensao> = {
  leaderboard: { largura: 728, altura: 90 },
  billboard: { largura: 970, altura: 250 },
  retangulo: { largura: 300, altura: 250 },
  retanguloGrande: { largura: 336, altura: 280 },
  movel: { largura: 320, altura: 100 },
};

/** Copy do kit da FIZ, verbatim. Não editar sem autorização escrita. */
const SOBRETITULO = "Para freelancers em Portugal";
const TITULO = "Faturação e impostos, em piloto automático.";
const CTA = "Experimentar";

/** true quando o formato é largo e baixo — o logótipo fica ao lado do texto. */
function ehFaixa(f: FormatoTexto): boolean {
  return f === "leaderboard" || f === "movel";
}

export default function FizCriativoTexto({
  formato,
  href,
  className = "",
}: {
  formato: FormatoTexto;
  /** Sempre uma rota nossa (`/ir/fiz?…`), nunca o link do parceiro. */
  href: string;
  className?: string;
}) {
  const { largura, altura } = DIMENSAO[formato];
  const faixa = ehFaixa(formato);
  const compacto = formato === "movel";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      // A proporção fixa reserva o espaço antes de qualquer coisa pintar —
      // é o que um `<img width height>` faria, sem o `<img>`.
      style={{ aspectRatio: `${largura} / ${altura}`, maxWidth: largura }}
      aria-label={`${TITULO} ${CTA} — publicidade da FIZ`}
      className={`group flex w-full overflow-hidden rounded-2xl border border-fiz-200 bg-fiz-50 transition-all hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 ${
        faixa ? "items-center gap-3 px-4" : "flex-col justify-center gap-2 p-5"
      } ${className}`}
    >
      <FizLogo
        size={faixa ? (compacto ? 22 : 28) : 32}
        className="flex-shrink-0 rounded-lg"
        decorativo
      />

      <span className={`min-w-0 flex-1 ${faixa ? "" : "space-y-1"}`}>
        {!faixa && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
            {SOBRETITULO}
          </span>
        )}
        <span
          className={`block font-display font-semibold leading-tight text-ink ${
            compacto ? "text-[13px]" : faixa ? "text-base" : "text-lg"
          }`}
        >
          {TITULO}
        </span>
      </span>

      <span
        className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-fiz-ink px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:translate-x-0.5 dark:bg-white dark:text-stone-900 ${
          faixa ? "" : "self-start"
        }`}
      >
        {CTA}
        <ArrowRight size={13} />
      </span>
    </a>
  );
}
