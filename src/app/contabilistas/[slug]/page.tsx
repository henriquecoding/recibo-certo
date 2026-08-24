import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { estadoOcc } from "@/lib/contabilistas/diretorio";
import PerfilPublico from "./PerfilPublico";

// O perfil é servido a partir do cliente porque os dados vivem no Supabase e
// o acesso é feito com a chave publicável sob RLS. O invólucro existe para a
// metadata e para o `<h1>` chegar no HTML — o essencial da página é legível
// antes de qualquer JavaScript correr.

const TITULO_NEUTRO = "Contabilista | ReciboCerto";

/**
 * O título diz o estado REAL da verificação.
 *
 * Era «Contabilista certificado» em TODOS os perfis, incluindo os que só
 * têm perfil profissional aprovado, sem OCC confirmada. O corpo da página
 * já distinguia os três estados (`estadoOcc`) — a etiqueta de SEO e de
 * partilha é que os ignorava, e é ela que viaja para fora do site.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return { title: TITULO_NEUTRO };

  try {
    const sb = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb
      .from("contabilistas_publico")
      .select("nome, occ, occ_verificado, titulo_profissional")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return { title: TITULO_NEUTRO };

    const l = data as {
      nome: string;
      occ: string | null;
      occ_verificado: boolean;
      titulo_profissional: string | null;
    };
    const occ = estadoOcc({ occ: l.occ, occVerificado: l.occ_verificado });
    // Só quem tem a inscrição confirmada é «certificado». Os outros dois
    // estados dizem o que são, e não o que gostariam de ser.
    const qualificacao =
      occ.tom === "verificada"
        ? "Contabilista Certificado"
        : l.titulo_profissional?.trim() || "Contabilista";

    return {
      title: `${l.nome} — ${qualificacao} | ReciboCerto`,
      description: "Perfil, áreas de trabalho e marcação de consulta.",
    };
  } catch {
    return { title: TITULO_NEUTRO };
  }
}

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PerfilPublico slug={slug} />;
}
