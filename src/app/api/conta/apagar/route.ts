// ═══════════════════════════════════════════════════════════════════════
//  APAGAR OS MEUS DADOS — e, se for o caso, a minha conta
//  ---------------------------------------------------------------------
//  A regra que governa tudo aqui: o `user_id` NUNCA vem do corpo do pedido.
//  Vem do token. Aceitar um id do cliente numa rota que apaga seria dar a
//  qualquer pessoa autenticada a capacidade de apagar os dados de outra —
//  e uma rota destas não tem segunda oportunidade.
//
//  A `service_role` é usada porque apagar a conta em `auth.users` exige-a;
//  todas as escritas são filtradas por `eq("user_id", user.id)` com o id
//  que saiu do token.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { alvoPorId, confirmacaoValida, type AlvoApagar } from "@/lib/conta/apagar";

export const dynamic = "force-dynamic";

async function obterUtilizador(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const sb = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getUser();
  return data.user;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** O que cada alvo apaga. `conta` inclui tudo, mais o utilizador. */
const TABELAS: Record<Exclude<AlvoApagar, "perfil-fiscal">, string[]> = {
  recibos: ["recibos"],
  vencimentos: ["recibos_vencimento"],
  cenarios: ["cenarios"],
  tudo: ["recibos", "recibos_vencimento", "cenarios"],
  conta: ["recibos", "recibos_vencimento", "cenarios", "prazos_cumpridos"],
};

export async function POST(req: NextRequest) {
  const user = await obterUtilizador(req);
  if (!user) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }

  const corpo = await req.json().catch(() => ({}));
  const alvo = alvoPorId(String(corpo?.alvo ?? ""));
  if (!alvo) {
    return NextResponse.json({ erro: "Alvo desconhecido." }, { status: 400 });
  }

  // A frase é validada AQUI também, e não só na interface. Um pedido feito
  // fora do browser passaria por cima de qualquer confirmação visual.
  if (!confirmacaoValida(alvo, String(corpo?.confirmacao ?? ""))) {
    return NextResponse.json(
      { erro: "A confirmação não corresponde ao que foi pedido." },
      { status: 400 },
    );
  }

  const sb = admin();
  if (!sb) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const apagadas: string[] = [];

  if (alvo.id !== "perfil-fiscal") {
    for (const tabela of TABELAS[alvo.id]) {
      const { error } = await sb.from(tabela).delete().eq("user_id", user.id);
      if (error) {
        console.error(`[conta/apagar] Falha em ${tabela}:`, error.message);
        return NextResponse.json(
          { erro: "Não foi possível apagar tudo. Nada foi perdido — tenta de novo." },
          { status: 500 },
        );
      }
      apagadas.push(tabela);
    }
  }

  if (alvo.id === "perfil-fiscal" || alvo.id === "tudo" || alvo.id === "conta") {
    const { error } = await sb
      .from("profiles")
      .update({ preferencias_fiscais: null })
      .eq("id", user.id);
    if (error) {
      console.error("[conta/apagar] Falha no perfil fiscal:", error.message);
      return NextResponse.json({ erro: "Não foi possível apagar o perfil fiscal." }, { status: 500 });
    }
    apagadas.push("perfil_fiscal");
  }

  if (alvo.id === "conta") {
    // A conta sai por último: se alguma coisa acima falhasse, a pessoa
    // ainda teria conta para tentar outra vez.
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("[conta/apagar] Falha ao apagar a conta:", error.message);
      return NextResponse.json(
        { erro: "Os dados foram apagados, mas a conta não. Contacta-nos para a removermos." },
        { status: 500 },
      );
    }
    apagadas.push("conta");
  }

  // Contagens e nomes de tabela, nunca conteúdo: isto fica nos logs.
  console.info("[conta/apagar] Concluído:", { alvo: alvo.id, apagadas: apagadas.length });
  return NextResponse.json({ ok: true, alvo: alvo.id, apagadas });
}
