import type { Metadata } from "next";
import PerfilPublico from "./PerfilPublico";

// O perfil é servido a partir do cliente porque os dados vivem no Supabase e
// o acesso é feito com a chave publicável sob RLS. O invólucro existe para a
// metadata e para o `<h1>` chegar no HTML — o essencial da página é legível
// antes de qualquer JavaScript correr.
export const metadata: Metadata = {
  title: "Contabilista certificado | ReciboCerto",
  description: "Perfil, áreas de trabalho e marcação de consulta.",
};

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PerfilPublico slug={slug} />;
}
