// ═══════════════════════════════════════════════════════════════════════
//  /api/admin/emails-teste — ver os emails do produto numa caixa a sério
//  ---------------------------------------------------------------------
//  Um molde revisto no browser não é a mesma coisa que um molde aberto no
//  Gmail: o cliente de email reescreve CSS, corta larguras e trata as
//  tabelas à sua maneira. A única forma de saber como ficam é recebê-los.
//
//  ⚠️ ISTO ENVIA EMAIL PARA UM ENDEREÇO ESCOLHIDO POR QUEM CHAMA, e é por
//  isso que está fechado a três chaves:
//
//    1. `adminDoPedido()` — a autorização é verificada no SERVIDOR, contra
//       `profiles.role`, com o token do próprio. Um guarda na interface
//       seria conveniência; isto é a segurança.
//    2. Limite de 3 chamadas por hora por administrador. Cada chamada são
//       24 emails: sem teto, isto era um relay de spam com autenticação.
//    3. Cada envio fica em `admin_auditoria`, com o destinatário. Quem
//       recebeu o quê, e a pedido de quem, tem de ser respondível.
//
//  Os conteúdos vêm de `exemplos.ts` — dados inventados, nunca os dados
//  reais de ninguém.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { adminDoPedido } from "@/lib/supabase/verify-request-admin";
import { supabaseServico } from "@/lib/contabilistas/servidor";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { emailValido, normalizarEmail } from "@/lib/validacao-email";
import { EXEMPLOS_DE_EMAIL, exemploPorId } from "@/lib/email/exemplos";
import { enviarEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chamadas por administrador e por hora. Cada uma vale até 24 emails. */
const LIMITE_POR_HORA = 3;

/**
 * Quantos seguem ao mesmo tempo.
 *
 * O Resend limita os pedidos por segundo; disparar 24 de uma vez faz
 * metade voltar com 429 e o relatório dizia «falhou» sobre moldes que
 * estão bons. Em grupos de quatro, com uma pausa curta, chegam todos.
 */
const EM_PARALELO = 4;
const PAUSA_MS = 600;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  const rl = rateLimit(`admin:emails-teste:${ator.id}`, LIMITE_POR_HORA, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { erro: `São ${LIMITE_POR_HORA} envios por hora. Tenta mais tarde.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const corpo = (await req.json().catch(() => ({}))) as { para?: unknown; apenas?: unknown };
  if (!emailValido(corpo.para)) {
    return NextResponse.json({ erro: "Escreve um endereço de email válido." }, { status: 400 });
  }
  const para = normalizarEmail(corpo.para);

  // `apenas` deixa reenviar um molde só, depois de o corrigir, sem voltar
  // a encher a caixa com os outros vinte e três.
  const pedidos = typeof corpo.apenas === "string" ? [corpo.apenas] : null;
  const escolhidos = pedidos
    ? pedidos.map(exemploPorId).filter((e): e is NonNullable<typeof e> => e !== undefined)
    : [...EXEMPLOS_DE_EMAIL];

  if (escolhidos.length === 0) {
    return NextResponse.json({ erro: "Esse email de exemplo não existe." }, { status: 400 });
  }

  const resultados: { id: string; rotulo: string; ok: boolean; erro?: string; enviadoId?: string }[] = [];

  for (let i = 0; i < escolhidos.length; i += EM_PARALELO) {
    const lote = escolhidos.slice(i, i + EM_PARALELO);
    const feitos = await Promise.all(lote.map(async (ex) => {
      try {
        const { subject, html } = ex.render();
        // O prefixo evita que uma revisão seja confundida com o email a
        // sério — sobretudo nos alertas, que falam de dinheiro e prazos.
        const r = await enviarEmail({ to: para, subject: `[teste] ${subject}`, html });
        return r.erro
          ? { id: ex.id, rotulo: ex.rotulo, ok: false, erro: r.erro }
          : { id: ex.id, rotulo: ex.rotulo, ok: true, enviadoId: r.id };
      } catch (e) {
        return {
          id: ex.id, rotulo: ex.rotulo, ok: false,
          erro: e instanceof Error ? e.message : "Falha desconhecida.",
        };
      }
    }));
    resultados.push(...feitos);
    if (i + EM_PARALELO < escolhidos.length) await dormir(PAUSA_MS);
  }

  const enviados = resultados.filter((r) => r.ok).length;
  const falhados = resultados.length - enviados;

  // O registo é do ATO, e fica mesmo que alguns envios tenham falhado:
  // «tentou enviar para X» é precisamente o que faz falta saber depois.
  const sb = supabaseServico();
  if (sb) {
    await sb.from("admin_auditoria").insert({
      ator_id: ator.id,
      ator_email: ator.email,
      acao: "emails_teste_enviados",
      alvo_email: para,
      detalhe: { enviados, falhados, ids: resultados.filter((r) => !r.ok).map((r) => r.id) },
      ip: clientIp(req),
    });
  }

  return NextResponse.json({ ok: falhados === 0, para, enviados, falhados, resultados });
}

/** O catálogo, para a interface listar sem ter de o repetir. */
export async function GET(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  return NextResponse.json({
    emails: EXEMPLOS_DE_EMAIL.map((e) => ({
      id: e.id, rotulo: e.rotulo, quando: e.quando, canal: e.canal, novo: e.novo === true,
      assunto: e.render().subject,
    })),
  });
}
