// ═══════════════════════════════════════════════════════════════════════
//  SLOT PÚBLICO DE ANÚNCIO — o renderizador que faltava
//  ---------------------------------------------------------------------
//  A tabela `anuncios` tem CRUD completo e pré-visualização desktop/mobile no
//  admin desde a migração 004. Nada no site público a consumia: os únicos
//  ficheiros que a importavam estavam sob `src/app/admin/`. Os anúncios
//  existiam e não apareciam.
//
//  Este componente fecha esse circuito para o tipo `criativo_parceiro`, que é
//  o único com um destino seguro por construção: o link é sempre
//  `/ir/<parceiro>`, validado a cada clique, nunca uma URL escrita à mão no
//  formulário.
//
//  ⚠️ Durante um tempo este cabeçalho dizia isto e o corpo não o fazia: o
//  componente resolvia sempre a parceria FIZ fixa em código e nunca chegava a
//  consultar `anuncios`. Criar, desligar, ordenar ou segmentar um anúncio no
//  admin não tinha efeito nenhum. Agora a tabela é consultada primeiro (ver
//  `anuncioDaSuperficie`), com esta precedência:
//
//   · linha ATIVA para a superfície  → manda ela, incluindo `mostrar_desktop`
//     e `mostrar_mobile`;
//   · linha INATIVA                  → não se mostra nada (decisão explícita);
//   · nenhuma linha                  → piso em código, como antes.
//
//  Regras de desempenho, porque um anúncio não pode custar a página:
//   · dimensões explícitas ou `aspect-ratio` — um 300×600 sem elas numa
//     página de Guia é CLS garantido;
//   · `loading="lazy"` e `decoding="async"`;
//   · servido do NOSSO domínio — nenhum pedido a `fiz.co` a partir do nosso
//     HTML.
// ═══════════════════════════════════════════════════════════════════════

import Image from "next/image";
import FizCriativoTexto, {
  DIMENSAO,
  type FormatoTexto,
} from "./FizCriativoTexto";
import FizDisclosure from "@/components/fiz/FizDisclosure";
import { DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import {
  parceriaAtiva,
  parceriaUtilizavel,
  parceriasAtivas,
  placementDaSuperficie,
} from "@/lib/parcerias/catalogo.server";
import { anuncioDaSuperficie, classesDeDispositivo } from "@/lib/parcerias/anuncios.server";
import type { Superficie } from "@/content/parcerias-destinos";

/**
 * Criativos disponíveis por variante de placement.
 *
 * Os de texto são gerados em código; os que têm captura de ecrã do produto
 * são ficheiros no nosso domínio, já convertidos.
 */
const IMAGEM_POR_VARIANTE: Partial<
  Record<string, { src: string; largura: number; altura: number; alt: string }>
> = {
  // Faixa larga (1,91:1) — a forma da maior parte dos slots do site.
  banner: {
    src: "/parceiros/fiz/fiz-1200x628-pt.avif",
    largura: 1200,
    altura: 628,
    alt: "FIZ — faturação e impostos em piloto automático, para freelancers em Portugal",
  },
  // Coluna estreita e alta. Só serve onde o slot tem essa forma; numa faixa
  // larga deixa uma coluna de vazio ao lado.
  texto: {
    src: "/parceiros/fiz/fiz-300x600-pt.avif",
    largura: 300,
    altura: 600,
    alt: "FIZ — impostos no automático, para freelancers em Portugal",
  },
};

const FORMATO_POR_SUPERFICIE: Partial<Record<Superficie, FormatoTexto>> = {
  "anuncio.dashboard": "leaderboard",
  "anuncio.simulador": "leaderboard",
  "anuncio.comparador": "leaderboard",
  "anuncio.landing_pricing": "billboard",
  "anuncio.landing_hero": "billboard",
  "anuncio.prazos": "retanguloGrande",
  "anuncio.receitas": "retangulo",
  "anuncio.recibos": "retangulo",
};

export default async function AnuncioSlot({
  superficie,
  className = "",
}: {
  superficie: Superficie;
  className?: string;
}) {
  if (!parceriasAtivas()) return null;

  // A configuração do admin vem PRIMEIRO. Se alguém desligou esta superfície,
  // acaba aqui — antes de olhar para o piso em código, que de outra forma a
  // ressuscitava.
  const config = await anuncioDaSuperficie(superficie);
  if (config.estado === "desligado") return null;

  const parceria = await parceriaAtiva("fiz");
  if (!parceriaUtilizavel(parceria)) return null;

  const placement = await placementDaSuperficie(parceria.id, superficie);
  if (!placement) return null;

  // `mostrar_desktop` / `mostrar_mobile` do admin, por CSS.
  const classesDispositivo =
    config.estado === "configurado" ? classesDeDispositivo(config.anuncio) : "";

  const divulgacao =
    placement.divulgacao?.trim() || parceria.divulgacao.trim() || DIVULGACAO_LIGACAO;
  const href = `/ir/fiz?s=${encodeURIComponent(superficie)}&v=${encodeURIComponent(placement.variante)}`;

  const imagem = IMAGEM_POR_VARIANTE[placement.variante];
  const formato = FORMATO_POR_SUPERFICIE[superficie] ?? "retangulo";

  return (
    <aside
      className={`${className} ${classesDispositivo}`.trim()}
      // Um bloco publicitário identifica-se como tal na árvore de
      // acessibilidade, não só no texto por baixo.
      aria-label="Publicidade de parceiro"
    >
      {imagem ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="block overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 focus-visible:ring-offset-2"
        >
          <Image
            src={imagem.src}
            width={imagem.largura}
            height={imagem.altura}
            alt={imagem.alt}
            loading="lazy"
            className="h-auto w-full"
          />
        </a>
      ) : (
        <FizCriativoTexto formato={formato} href={href} />
      )}
      <FizDisclosure texto={divulgacao} className="mt-1.5" />
    </aside>
  );
}

/** Dimensões de cada formato, para a pré-visualização do admin. */
export { DIMENSAO };
