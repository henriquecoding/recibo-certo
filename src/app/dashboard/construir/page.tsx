import type { Metadata } from "next";
import HubNegocio from "./HubNegocio";

/**
 * O HUB DO NEGÓCIO — o terceiro lugar da barra do telemóvel.
 *
 * No computador as quatro etapas estão expostas na sidebar e este hub não
 * aparece. No telemóvel há cinco lugares e quatro etapas: ou se escondia
 * três delas, ou se lhes dava uma porta comum.
 *
 * É uma ROTA, e não uma folha, porque uma rota é ligável, tem botão
 * «voltar», tem estado vazio e mede-se — e porque quem chega aqui vindo de
 * Descobrir ou de Preços tem de poder voltar ao mesmo sítio.
 *
 * O que ele NÃO é: um segundo catálogo. Mostra quatro cartões, o estado de
 * cada um e a ação seguinte. Nada mais.
 */
export const metadata: Metadata = {
  title: "Construir o negócio",
};

export default function Page() {
  return <HubNegocio />;
}
