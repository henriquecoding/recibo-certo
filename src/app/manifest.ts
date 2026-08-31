import type { MetadataRoute } from "next";
import { ORIGEM_CANONICA } from "@/lib/origem";

// ═══════════════════════════════════════════════════════════════════════
//  O MANIFESTO DA APLICAÇÃO — RC-MARCA-002
//  ---------------------------------------------------------------------
//  Não existia. Sem ele, quem adicionava o site ao ecrã principal ficava
//  com uma coisa sem nome, sem cor e com um ícone genérico — e o
//  `apple-touch-icon` apontava para SVG, formato que o iOS não lê.
//
//  Para um produto que pede para ser consultado ao balcão, a meio de um
//  trabalho, o atalho no telemóvel não é um extra: é o sítio de onde
//  vêm as visitas seguintes.
// ═══════════════════════════════════════════════════════════════════════

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recibo Certo — copiloto financeiro para recibos verdes",
    short_name: "Recibo Certo",
    description:
      "Quanto é teu, quanto reservar e quando pagar. Calculadora, simulador de IRS e comparador de regimes, com os dados fiscais de 2026.",
    lang: "pt-PT",
    dir: "ltr",
    // O painel, não a landing: quem instala já decidiu.
    start_url: "/dashboard",
    scope: "/",
    id: ORIGEM_CANONICA,
    display: "standalone",
    orientation: "portrait-primary",
    // O papel e o verde da marca. A cor de tema pinta a barra do sistema:
    // esteve em `#1D9E75` — o verde antigo — mesmo depois de a marca mudar.
    background_color: "#EDEAE0",
    theme_color: "#177E5E",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/marca/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/marca/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // `maskable` é o que evita que o Android recorte o desenho dentro do
      // seu próprio contorno. O 512 já tem margem para isso.
      { src: "/marca/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
