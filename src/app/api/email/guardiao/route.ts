// POST /api/email/guardiao
//
// Cron job que percorre todos os utilizadores Pro com recibos na nuvem,
// calcula o faturado do ano corrente, e envia alertas de Guardião Fiscal
// conforme os limiares definidos no plano estratégico:
//
//   80% → Aviso (1 vez)
//   90% → Preparação (1 vez)
//   95% → Crítico (1 vez)
//  100% → Ultrapassado (1 vez)
//
// Para evitar spam, cada nível só é enviado 1 vez por utilizador/ano,
// registado em `alertas_guardiao`. Autorização via CRON_SECRET.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email/send";
import {
  emailGuardiaoFiscal,
  type NivelGuardiao,
} from "@/lib/email/templates";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";

const LIMITE = IVA_ISENCAO_LIMITE.value; // 15 000 €
const ANO = new Date().getFullYear();

// Limiares ordenados do mais grave para o menos grave
// (enviamos apenas o nível mais alto ainda não enviado)
const LIMIARES: { nivel: NivelGuardiao; ratio: number }[] = [
  { nivel: "ultrapassado", ratio: 1.00 },
  { nivel: "critico",      ratio: 0.95 },
  { nivel: "preparacao",   ratio: 0.90 },
  { nivel: "aviso",        ratio: 0.80 },
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  // Autorização: CRON_SECRET (definido na Vercel como variável de ambiente)
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  }

  // 1. Buscar utilizadores Pro ativos
  const { data: subs, error: subErr } = await sb
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (subErr || !subs || subs.length === 0) {
    return NextResponse.json({ msg: "Sem subscritores Pro ativos.", enviados: 0 });
  }

  const userIds = subs.map((s: { user_id: string }) => s.user_id);

  // 2. Para cada utilizador, calcular faturado do ano corrente
  const inicioAno = `${ANO}-01-01`;
  const fimAno    = `${ANO}-12-31`;

  const { data: recibosData } = await sb
    .from("recibos")
    .select("user_id, valor")
    .in("user_id", userIds)
    .gte("data", inicioAno)
    .lte("data", fimAno);

  if (!recibosData || recibosData.length === 0) {
    return NextResponse.json({ msg: "Sem recibos para processar.", enviados: 0 });
  }

  // Agregar faturado por utilizador
  const faturadoPorUser: Record<string, number> = {};
  for (const r of recibosData) {
    const uid = r.user_id as string;
    faturadoPorUser[uid] = (faturadoPorUser[uid] ?? 0) + (r.valor as number);
  }

  // 3. Buscar alertas já enviados este ano
  const { data: alertasEnviados } = await sb
    .from("alertas_guardiao")
    .select("user_id, nivel")
    .in("user_id", userIds)
    .eq("ano", ANO);

  const jaEnviado = new Set<string>(
    (alertasEnviados ?? []).map((a: { user_id: string; nivel: string }) => `${a.user_id}:${a.nivel}`)
  );

  // 4. Buscar emails dos utilizadores
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emailPorUser: Record<string, string> = {};
  for (const p of profiles ?? []) {
    if (p.email) emailPorUser[p.id as string] = p.email as string;
  }

  // 5. Processar cada utilizador
  let enviados = 0;
  const registosNovos: { user_id: string; nivel: string; ano: number; faturado: number }[] = [];

  for (const userId of userIds) {
    const faturado = faturadoPorUser[userId] ?? 0;
    const email = emailPorUser[userId];
    if (!email) continue;

    const ratio = faturado / LIMITE;

    // Encontrar o nível mais alto atingido mas ainda não enviado
    for (const { nivel, ratio: limiar } of LIMIARES) {
      if (ratio >= limiar && !jaEnviado.has(`${userId}:${nivel}`)) {
        const restante = Math.max(0, LIMITE - faturado);
        const tpl = emailGuardiaoFiscal({
          faturado,
          limite: LIMITE,
          restante,
          percentagem: ratio,
          nivel,
        });

        const res = await enviarEmail({ to: email, ...tpl });
        if (!res.erro) {
          enviados++;
          registosNovos.push({ user_id: userId, nivel, ano: ANO, faturado });
          // Só envia o nível mais grave por execução — evita flood de emails
          break;
        }
      }
    }
  }

  // 6. Registar alertas enviados (evitar duplicados)
  if (registosNovos.length > 0) {
    await sb.from("alertas_guardiao").insert(registosNovos);
  }

  return NextResponse.json({
    enviados,
    utilizadoresProcessados: userIds.length,
    ano: ANO,
  });
}
