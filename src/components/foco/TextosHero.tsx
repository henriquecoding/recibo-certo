// ═══════════════════════════════════════════════════════════════════════
//  O TÍTULO E O SUBTÍTULO DE UM HERO DE FOCO
//  ---------------------------------------------------------------------
//  Dois componentes minúsculos, e existem por uma razão que não é
//  poupar linhas: **os cinco heros passam a ler a mesma tabela.**
//
//  `HeroFoco` já unificara a GEOMETRIA dos três palcos novos, mas o
//  «Descobrir» e o «Preço» continuavam a escrever o seu próprio `<h1>` à
//  mão — com as mesmas classes copiadas, que é a receita conhecida para
//  divergirem sem ninguém saber apontar quando. E o texto vivia dentro de
//  cada ficheiro, escrito no dia em que aquele palco nasceu.
//
//  Agora o texto vem de `copy-heros.ts` (que documenta a forma e é
//  verificado por um teste) e a marcação vem daqui. Um título novo
//  escreve-se num sítio; um título fora da forma não compila o teste.
// ═══════════════════════════════════════════════════════════════════════

import type { FocoHomepage } from "@/lib/foco-homepage";
import { COPY_HEROS, tituloEmDuasLinhas } from "./copy-heros";

// ── A ESCALA, E PORQUE ENCOLHEU ────────────────────────────────────────
//  Era `clamp(2.45rem, 6.7vw, 5.65rem)`, herdada de títulos de trinta
//  caracteres («O preço não nasce de um palpite»). Com títulos de
//  cinquenta e tal — que é o que é preciso para caber a pergunta pela
//  qual alguém chega aqui — a 5,65 rem cada linha levava vinte
//  caracteres e o título partia-se em QUATRO. Um título em escada não é
//  um título grande: é um parágrafo em corpo de título.
//
//  A 3,75 rem cabem ~30 caracteres por linha dentro de `max-w-4xl`, que
//  é exatamente o que a quebra declarada em `copy-heros.ts` pede.
//
//  ── E o `text-balance` só até `sm:` ───────────────────────────────────
//  Acima disso a quebra é DECLARADA, e `balance` a decidir por cima de
//  uma quebra manual reparte cada metade por sua conta — o que dá
//  sub-quebras que ninguém pediu. Em baixo não há quebra manual e é o
//  `balance` que manda, porque só ele sabe a largura real.
const ESCALA_H1 = {
  normal: "text-[clamp(2rem,4.6vw,3.75rem)]",
  editorial: "text-[clamp(2.25rem,5.1vw,4.25rem)]",
} as const;

export function TituloHero({
  foco,
  className,
  escala = "normal",
}: {
  foco: FocoHomepage;
  className?: string;
  escala?: keyof typeof ESCALA_H1;
}) {
  const [antes, depois] = tituloEmDuasLinhas(COPY_HEROS[foco]);
  return (
    <h1
      className={`text-balance font-display font-semibold leading-[1.04] tracking-[-.035em] text-ink sm:[text-wrap:pretty] ${ESCALA_H1[escala]} ${className ?? ""}`}
    >
      {antes}
      {depois ? (
        <>
          {/* A quebra só a partir de `sm:`. No telemóvel uma quebra fixa
              dava linhas de três palavras e um bloco em escada; lá quem
              parte é o `text-balance`, que sabe a largura real. */}
          <br className="hidden sm:block" />{" "}
          {depois}
        </>
      ) : null}
    </h1>
  );
}

export function SubtituloHero({
  foco,
  alinhamento = "centro",
  className,
}: {
  foco: FocoHomepage;
  alinhamento?: "centro" | "inicio";
  className?: string;
}) {
  const geometria =
    alinhamento === "centro"
      ? "mx-auto mt-6 max-w-2xl text-center"
      : "mx-0 mt-3 max-w-none text-left";

  return (
    <p
      className={`${geometria} text-balance text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400 ${className ?? ""}`}
    >
      {COPY_HEROS[foco].subtitulo}
    </p>
  );
}
