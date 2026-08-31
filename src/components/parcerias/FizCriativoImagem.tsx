// ═══════════════════════════════════════════════════════════════════════
//  CRIATIVO DA FIZ, RESPONSIVO POR FORMA
//  ---------------------------------------------------------------------
//  O kit traz o mesmo cartaz em três proporções. Não são tamanhos do mesmo
//  ficheiro — são COMPOSIÇÕES diferentes: no 1,91:1 o texto fica à esquerda e
//  o telemóvel à direita; no 9:16 desce tudo para uma coluna, com o título em
//  duas linhas e o botão no fim. Servir só o largo e deixar o CSS encolhê-lo
//  num ecrã de 360px dá uma tira de 190px onde o título fica ilegível.
//
//  Daí um `<picture>` com três fontes e a escolha feita pelo browser antes de
//  descarregar seja o que for — não se transfere o que não se vai usar.
//
//   · ≥ 1024px → 1200 × 628  (1,91:1) — faixa larga, computador
//   · 640–1023 → 1080 × 1080 (1:1)    — tablet
//   · < 640px  → 1080 × 1920 (9:16)   — telemóvel, a composição em coluna
//
//  Os ficheiros são 2× retina e servidos do NOSSO domínio, em AVIF com
//  fallback WebP. Converter formato e comprimir é o que a cl. 15.1 permite;
//  recortar, recolorir ou recompor, não — por isso não há `object-cover` em
//  lado nenhum e as proporções são as originais.
//
//  ⚠️ O cartaz carrega duas afirmações que são DA FIZ: «desde 9,99 €/mês» e
//  «Certificado AT Nº 3041». Servimos o ficheiro deles sem lhe tocar, e é
//  assim que essas afirmações continuam a ser deles. Nenhuma das duas pode
//  ser copiada para copy nossa — `parcerias:copy` verifica-o.
// ═══════════════════════════════════════════════════════════════════════

const ALT =
  "FIZ — faturação e impostos em piloto automático, para freelancers em Portugal";

export default function FizCriativoImagem({
  href,
  className = "",
  prioridade = false,
}: {
  /** Sempre uma rota nossa (`/ir/fiz?…`), nunca o link do parceiro. */
  href: string;
  className?: string;
  /** true só se o criativo estiver acima da dobra. */
  prioridade?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      aria-label={`${ALT} — publicidade`}
      className={`block w-full max-w-full overflow-hidden rounded-2xl border border-fiz-200 transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 focus-visible:ring-offset-2 dark:border-stone-700 ${className}`}
    >
      {/* `block w-full max-w-full` e não só `block`: o cartaz do telemóvel é um
          ficheiro de 1080 px de largura, e bastava o link deixar de ser um
          bloco — dentro de uma secção com `content-visibility`, por exemplo —
          para a imagem assumir a largura intrínseca e pôr 1 088 px de página
          num ecrã de 360. A largura passa a estar presa em três sítios, e
          nenhum deles depende de o `display` ser o que se espera. */}
      {/* `<picture>` em vez de `next/image`: a escolha aqui é de COMPOSIÇÃO,
          não de resolução, e o `next/image` só troca o tamanho do mesmo
          ficheiro. As dimensões explícitas em cada `<source>` reservam o
          espaço antes de a imagem chegar — sem elas, um cartaz numa página de
          conteúdo é CLS garantido. */}
      <picture>
        {/* Computador */}
        <source
          media="(min-width: 1024px)"
          srcSet="/parceiros/fiz/fiz-1200x628-pt.avif"
          type="image/avif"
          width={1200}
          height={628}
        />
        <source
          media="(min-width: 1024px)"
          srcSet="/parceiros/fiz/fiz-1200x628-pt.webp"
          type="image/webp"
          width={1200}
          height={628}
        />
        {/* Tablet */}
        <source
          media="(min-width: 640px)"
          srcSet="/parceiros/fiz/fiz-1080x1080-pt.avif"
          type="image/avif"
          width={1080}
          height={1080}
        />
        <source
          media="(min-width: 640px)"
          srcSet="/parceiros/fiz/fiz-1080x1080-pt.webp"
          type="image/webp"
          width={1080}
          height={1080}
        />
        {/* Telemóvel */}
        <source
          srcSet="/parceiros/fiz/fiz-1080x1920-pt.avif"
          type="image/avif"
          width={1080}
          height={1920}
        />
        <source
          srcSet="/parceiros/fiz/fiz-1080x1920-pt.webp"
          type="image/webp"
          width={1080}
          height={1920}
        />
        {/* Recurso final em WebP, não em PNG: o WebP é universal desde 2020
            (Safari 14, Firefox 65, todo o Chromium) e o PNG original pesa 465 KB
            contra 89 KB. Guardar um ficheiro que nenhum browser vivo vai
            buscar é peso no repositório e nada mais.
            eslint-disable-next-line @next/next/no-img-element */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/parceiros/fiz/fiz-1200x628-pt.webp"
          width={1200}
          height={628}
          alt={ALT}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          className="h-auto w-full max-w-full"
        />
      </picture>
    </a>
  );
}
