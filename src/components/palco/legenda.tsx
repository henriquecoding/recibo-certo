// ═══════════════════════════════════════════════════════════════════════
//  A LEGENDA DO ATO — e porque é que ela reserva o seu pior caso
//  ---------------------------------------------------------------------
//  O cabeçalho de um palco diz o que o ato em curso está a fazer. A
//  legenda muda a cada ato, e a 390 px de largura umas quebram em duas
//  linhas e outras em uma. O cabeçalho mudava de altura a cada mudança
//  de ato, e com ele o palco inteiro e tudo o que vem por baixo.
//
//  Medido em `mobile-fast4g`: CLS de 0,08 (p50) e 0,18 (p95) na carga de
//  `/` e na troca fria para `/inicio/empresa`, contra um budget de 0,049.
//  O maior salto acontece a ~2,5 s — quando a cena rebobina e passa da
//  legenda «Demonstração concluída», que o HTML servido traz, para a do
//  primeiro ato. Ou seja: com a pessoa já a ler.
//
//  ── Porque é que não se corta o texto ────────────────────────────────
//
//  Já se tentou `truncate`, e a auditoria de acessibilidade tem razão em
//  o recusar: a 320 px «Eliminar padrões incompatíveis a…» não diz o que
//  o ato faz. A legenda quebra — o que não pode é a caixa mudar.
//
//  ── Como se reserva o pior caso sem o adivinhar ──────────────────────
//
//  A legenda mais longa de todas fica lá, invisível, a definir a altura;
//  a legenda em curso é desenhada por cima. Vale para qualquer largura,
//  qualquer tipo de letra e qualquer conjunto de atos — não há número
//  mágico para envelhecer quando alguém escrever um ato novo.
//
//  `visibility: hidden` e não `display: none`: o que não é desenhado
//  também não ocupa espaço, e é espaço que se quer.
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param texto      a legenda a mostrar agora
 * @param candidatas TODAS as legendas que este cabeçalho pode mostrar,
 *                   incluindo as de estado («em pausa», «concluída»)
 */
export default function LegendaDoAto({
  texto,
  candidatas,
  className = "",
}: {
  texto: string;
  candidatas: readonly string[];
  className?: string;
}) {
  const maisLonga = candidatas.reduce(
    (maior, candidata) => (candidata.length > maior.length ? candidata : maior),
    texto,
  );
  return (
    <p className={`relative ${className}`}>
      <span aria-hidden className="invisible block">
        {maisLonga}
      </span>
      <span className="absolute inset-x-0 top-0">{texto}</span>
    </p>
  );
}
