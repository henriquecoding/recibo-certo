// ═══════════════════════════════════════════════════════════════════════
//  A fila de emails de aviso esvazia-se aqui.
//  ---------------------------------------------------------------------
//  Os avisos nascem na base de dados, dentro da transação que os causa
//  (migração 047). O email é uma consequência anotada na própria linha, e
//  não uma promessa pendurada num pedido que já respondeu — que era o que
//  fazia um email perder-se em silêncio quando o Resend estava em baixo.
//
//  Esta rota só reclama o que está por enviar, envia, e diz o que correu
//  bem. Quem decide o que merece email é a base de dados
//  (`aviso_merece_email`), num sítio só.
//
//  Protegida por `CRON_SECRET`: reclamar avisos devolve endereços de email,
//  e isso não pode estar aberto à internet.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email/send";
import { emailAvisoPlataforma } from "@/lib/email/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Quantos por passagem. O suficiente para não acumular, pouco para caber no tempo. */
const LOTE = 50;

interface Reclamado {
  id: string;
  para: string;
  titulo: string;
  corpo: string | null;
  url: string | null;
}

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/avisos-email] CRON_SECRET não configurado — recusado.");
    return NextResponse.json({ erro: "Não configurado." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 503 });
  }

  const sb = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sem Resend não se reclama nada: reclamar e falhar gastava tentativas
  // de linhas que ficariam marcadas como perdidas sem nunca terem saído.
  //
  // ⚠️ MAS NÃO EM SILÊNCIO. Isto respondia `{ ok: true, motivo: "sem_resend" }`
  // e a execução do cron aparecia VERDE: o canal de email podia estar
  // desligado durante semanas sem ninguém dar por isso, enquanto clientes
  // que não voltassem ao site nunca soubessem que o contabilista respondeu.
  // Um 503 com a fila contada põe a execução a vermelho, que é o alerta.
  if (!process.env.RESEND_API_KEY) {
    const { count } = await sb
      .from("notificacoes")
      .select("id", { count: "exact", head: true })
      .in("email_estado", ["por_enviar", "a_enviar"]);

    console.error(
      "[cron/avisos-email] RESEND_API_KEY não configurada — nenhum email sai.",
      { porEnviar: count ?? 0 },
    );
    return NextResponse.json(
      { erro: "Canal de email desligado.", motivo: "sem_resend", porEnviar: count ?? 0 },
      { status: 503 },
    );
  }

  const { data, error } = await sb.rpc("avisos_email_reclamar", { p_limite: LOTE });
  if (error) {
    console.error("[cron/avisos-email] reclamar:", error.message);
    return NextResponse.json({ erro: "Falha ao reclamar." }, { status: 500 });
  }

  const fila = (data ?? []) as Reclamado[];
  if (fila.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.recibocerto.pt";
  const enviados: string[] = [];
  const falhados: string[] = [];

  // Em série, de propósito: um lote de cinquenta em paralelo é a maneira
  // mais rápida de levar com o limite de envio do lado de lá.
  for (const aviso of fila) {
    try {
      const { subject, html } = emailAvisoPlataforma(
        aviso.titulo,
        aviso.corpo ?? undefined,
        `${site}${aviso.url ?? "/dashboard"}`
      );
      const r = await enviarEmail({ to: aviso.para, subject, html });
      if (r.erro) falhados.push(aviso.id);
      else enviados.push(aviso.id);
    } catch (e) {
      console.error("[cron/avisos-email] envio:", (e as Error).message);
      falhados.push(aviso.id);
    }
  }

  const { error: erroFecho } = await sb.rpc("avisos_email_concluir", {
    p_enviados: enviados,
    p_falhados: falhados,
  });
  if (erroFecho) console.error("[cron/avisos-email] concluir:", erroFecho.message);

  // Contagens, nunca destinatários: este registo fica nos logs.
  console.info("[cron/avisos-email]", { enviados: enviados.length, falhados: falhados.length });
  return NextResponse.json({ ok: true, enviados: enviados.length, falhados: falhados.length });
}
