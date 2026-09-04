import type { Metadata } from "next";
import DossiePublico from "./DossiePublico";

// ═══════════════════════════════════════════════════════════════════════
//  A rota pública de um dossiê de guia (D3).
//  ---------------------------------------------------------------------
//  `noindex, nofollow`, e não por hábito: o conteúdo é o caso de uma
//  pessoa, e o endereço só faz sentido para quem o recebeu. Indexá-lo era
//  publicar o que foi partilhado em privado.
//
//  A página é uma casca: o conteúdo vem depois de montar, porque o token
//  está no FRAGMENTO do endereço e o fragmento nunca chega ao servidor.
//  É essa a propriedade que se está a comprar — nem o nosso servidor, nem
//  a CDN, nem qualquer log intermédio vê a chave.
// ═══════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dossiê de guia",
  description: "Um dossiê partilhado a partir de um guia do Recibo Certo.",
  robots: { index: false, follow: false },
};

export default async function PaginaDossie({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DossiePublico id={id} />;
}
