// ═══════════════════════════════════════════════════════════════════════
//  LEVAR OS MEUS DADOS ANTES DE OS APAGAR
//  ---------------------------------------------------------------------
//  A zona de risco dizia, e diz desde que existe: «exporta antes o que
//  quiseres guardar». Não havia para onde. Havia três exportações de
//  documentos — mapa de recibos, relatório de vencimento, declaração de
//  IRS — e mais nada: quem quisesse levar as conversas, os casos, as
//  consultas, os alertas ou o cartão de fidelidade não tinha por onde, e a
//  frase era um conselho impossível de seguir logo acima de um botão que
//  apaga tudo.
//
//  Isto lê o catálogo — o mesmo que a zona de risco usa para apagar — e
//  devolve um ficheiro só. O que se apaga e o que se leva passam a vir da
//  mesma lista, que é a única forma de não divergirem.
//
//  A leitura é feita COM A SESSÃO DA PESSOA, nunca com a chave de serviço.
//  Duas razões, e a segunda é a que importa: a chave de serviço passa por
//  cima do RLS, e uma rota que devolve JSON ao cliente com o RLS desligado
//  é uma fuga à espera de um `.eq()` mal escrito. Aqui, se o RLS não deixa
//  ler, não sai — a rota não tem poder nenhum que a pessoa já não tenha.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CONJUNTOS } from "@/lib/conta/catalogo";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Um teto por tabela. Um export não pode ser uma forma de esgotar memória. */
const MAX_LINHAS = 5000;

async function obterUtilizador(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const sb = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getUser();
  return data.user ? { user: data.user, sb } : null;
}

interface Seccao {
  conjunto: string;
  titulo: string;
  descricao: string;
  /** Preenchido quando o conjunto é retido — o ficheiro diz porquê. */
  retido?: string;
  tabelas: Record<string, unknown[]>;
  /** O que não se conseguiu ler, e não silêncio. */
  falhas?: string[];
  truncado?: string[];
}

export async function GET(req: NextRequest) {
  const sessao = await obterUtilizador(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }
  const { user, sb } = sessao;

  const seccoes: Seccao[] = [];
  for (const c of CONJUNTOS) {
    const seccao: Seccao = {
      conjunto: c.id,
      titulo: c.titulo,
      descricao: c.descricao,
      ...(c.retido ? { retido: c.retido } : {}),
      tabelas: {},
    };

    for (const t of c.tabelas) {
      // Só as tabelas com coluna de dono: as que pendem de outra saem
      // dentro da linha-mãe pela leitura dela, e uma leitura direta a uma
      // tabela filha devolveria linhas sem o contexto que as explica.
      if (t.posse.por !== "coluna" && t.posse.por !== "campo") continue;
      const linhas = await lerTabela(sb, t.nome, t.posse.coluna, user.id, t.posse.por);
      if (linhas === null) {
        (seccao.falhas ??= []).push(t.nome);
        continue;
      }
      if (linhas.length >= MAX_LINHAS) (seccao.truncado ??= []).push(t.nome);
      seccao.tabelas[t.nome] = linhas;
    }

    // Um conjunto sem nada não entra: um ficheiro com trinta secções vazias
    // esconde as três que têm alguma coisa.
    const temAlgo = Object.values(seccao.tabelas).some((v) => v.length > 0);
    if (temAlgo || seccao.falhas) seccoes.push(seccao);
  }

  const agora = new Date();
  const corpo = {
    formato: "recibo-certo/exportacao-de-dados",
    versaoFormato: 1,
    versaoAplicacao: APP_VERSION,
    geradoEm: agora.toISOString(),
    conta: { id: user.id, email: user.email ?? null, criadaEm: user.created_at ?? null },
    aviso:
      "Este ficheiro tem o que está guardado na tua conta. O que escreveste nas calculadoras sem ter sessão iniciada vive só no teu dispositivo e não passa por aqui — descarrega-o na zona de risco, em «Neste dispositivo».",
    seccoes,
  };

  const nome = `recibo-certo-os-meus-dados-${agora.toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      // Um export não se guarda em lado nenhum, nem em cache partilhada.
      "Cache-Control": "no-store, private",
    },
  });
}

async function lerTabela(
  sb: SupabaseClient,
  tabela: string,
  coluna: string,
  userId: string,
  modo: "coluna" | "campo",
): Promise<unknown[] | null> {
  // `campo` é uma coluna dentro de uma linha que não é toda da pessoa —
  // `profiles.preferencias_fiscais`. Sai só o campo, e não a linha.
  const colunas = modo === "campo" ? coluna : "*";
  const chave = modo === "campo" ? "id" : coluna;
  const { data, error } = await sb
    .from(tabela)
    .select(colunas)
    .eq(chave, userId)
    .limit(MAX_LINHAS);
  if (error) {
    // Uma tabela sem política de leitura para o dono não é um erro do
    // pedido — é uma tabela que a pessoa nunca pôde ler. Fica registada
    // como falha no ficheiro, e não como um 500 que esconde as outras.
    console.warn("[conta/exportar]", tabela, error.message);
    return null;
  }
  return (data ?? []) as unknown[];
}
