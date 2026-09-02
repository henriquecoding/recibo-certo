import type { Metadata } from "next";
import type { ReactNode } from "react";

// A página desta rota é um Client Component e um Client Component não
// pode exportar `metadata`. O título vive aqui, no segmento, para o
// separador do browser dizer o que é — em vez do «Painel» genérico
// herdado do layout de cima.
// ⚠️ `default` + `template`, e não um título solto.
//
// Um `title: "…"` num layout de segmento resolve o título DESTE
// segmento e leva o `template` do layout de cima à frente: as rotas
// filhas passavam a sair sem a marca. Foi o que aconteceu a
// `/dashboard/precos/novo`, que ficou «Calcular um preço» enquanto
// todas as outras diziam «… | Recibo Certo».
//
// Repor o template aqui devolve o sufixo a quem está por baixo, e o
// `default` continua a dar nome a esta rota — que é um Client
// Component e por isso não pode exportar `metadata` sozinha.
export const metadata: Metadata = {
  title: { default: "O meu trabalho", template: "%s | Recibo Certo" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
