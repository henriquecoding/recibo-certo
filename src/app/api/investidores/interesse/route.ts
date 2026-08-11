// Único caminho de entrada de um contacto de investidor.
//
// Antes, o browser escrevia direto na base de dados com a chave anónima. A
// migração 031 revoga esse INSERT; a partir daqui tudo passa por aqui, no
// servidor, onde o cliente não pode mentir sobre o que envia nem quantas vezes.
//
// As camadas, por ordem, e porquê cada uma existe:
//
//   1. tamanho do corpo   — corta um payload gigante antes de o ler para memória
//   2. origem             — bloqueia o POST cross-site trivial (não é defesa a sério)
//   3. validação completa — nada entra sem passar por `validarLead`
//   4. honeypot + tempo   — apanha o autómato ingénuto, que é a maioria
//   5. rate limit em memória — corta rajadas na mesma instância, de graça
//   6. rate limit na base — o limite a sério: atómico e partilhado entre instâncias
//   7. idempotência       — duplo-clique ou retry não criam dois registos
//
// Nenhuma sozinha chega. O honeypot não substitui o rate limit, a origem não
// substitui nada, e o limite em memória é uma sugestão em serverless — por
// isso o que conta é o da base de dados.
//
// E o que NÃO acontece: nome, email, telefone ou mensagem nunca vão para os
// logs. Um `console.error` com o corpo do pedido transforma o registo de erros
// num segundo repositório de dados pessoais, fora de qualquer política.

import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { validarLead } from "@/app/investidores/_lib/validation";
import { RETENCAO_MESES } from "@/app/investidores/_data/legal";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { notificarNovoLead } from "@/lib/investidores/notificacoes";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
/** A rota escreve; nunca pode ser servida de cache. */
export const dynamic = "force-dynamic";

const MAX_BYTES = 16_384;
const LIMITE_IP_DIA = 5;
const LIMITE_EMAIL_DIA = 3;

/**
 * HMAC com sal do ambiente. Sem segredo definido, usa-se um derivado da chave
 * de service role — que já é secreta e já é obrigatória para esta rota
 * funcionar. Assim o hash nunca é um SHA-256 nu do IP, que qualquer pessoa com
 * a tabela conseguiria reverter por força bruta (são 2^32 IPv4).
 */
function hmac(valor: string): string {
  const segredo =
    process.env.INVESTOR_FORM_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!segredo) throw new Error("sem segredo para o hash");
  return createHmac("sha256", segredo).update(valor).digest("hex");
}

/** Janela diária. O IP roda com o dia, por isso o hash também — e um hash que
 *  muda todos os dias não serve para seguir ninguém ao longo do tempo. */
function janelaDoDia(): string {
  return new Date().toISOString().slice(0, 10);
}

function erro(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  // 1 · tamanho
  const tamanho = Number(req.headers.get("content-length") || "0");
  if (tamanho > MAX_BYTES) return erro("body_too_large", 413);

  // 2 · origem
  const origem = req.headers.get("origin");
  if (origem && origem !== new URL(req.url).origin) return erro("origin_rejected", 403);

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return erro("invalid_json", 400);
  }

  // 3+4 · validação completa, honeypot e tempo mínimo
  const validado = validarLead(corpo);
  if (!validado.ok) {
    // O honeypot e o "demasiado depressa" devolvem 202 e não 422: um autómato
    // que recebe 422 aprende a corrigir o campo; um que recebe "aceite" e nunca
    // vê consequência, não. Nada é escrito nos dois casos.
    if (validado.erros.companyFax || validado.erros.startedAt === "too_fast") {
      return NextResponse.json({ accepted: true }, { status: 202 });
    }
    return erro("validation_error", 422, { fields: validado.erros });
  }
  const lead = validado.dados;

  // 5 · rajada na instância — barato, antes de tocar na rede
  const rl = rateLimit(`investidores:${clientIp(req)}`, LIMITE_IP_DIA, 24 * 60 * 60 * 1000);
  if (!rl.ok) {
    return erro("rate_limited", 429, undefined);
  }

  const admin = supabaseAdmin();
  if (!admin) {
    console.error("investidores_sem_credenciais");
    return erro("temporarily_unavailable", 503);
  }

  let ipHash: string;
  let emailHash: string;
  try {
    const dia = janelaDoDia();
    ipHash = hmac(`${clientIp(req)}:${dia}`);
    emailHash = hmac(lead.email);
  } catch {
    console.error("investidores_sem_segredo_hash");
    return erro("temporarily_unavailable", 503);
  }

  // 6 · o limite a sério
  //
  // ⚠️ TOLERA A MIGRAÇÃO 031 AINDA NÃO ESTAR CORRIDA. O código é publicado
  // pela Vercel no instante do merge; o SQL corre à mão no Supabase, noutro
  // momento. Entre um e outro, esta função não existe — e falhar aqui com 503
  // deixaria o formulário a recusar TODOS os contactos, que é pior do que o
  // problema que a migração vem resolver. Nessa janela vale o limite em
  // memória, que já foi aplicado acima; quando o SQL correr, o limite forte
  // entra sozinho, sem novo deploy.
  const { data: permitido, error: erroLimite } = await admin.rpc("consume_investor_rate_limit", {
    p_ip_hash: ipHash,
    p_email_hash: emailHash,
    p_window_start: janelaDoDia(),
    p_ip_limit: LIMITE_IP_DIA,
    p_email_limit: LIMITE_EMAIL_DIA,
  });

  if (erroLimite) {
    // PGRST202 = função não encontrada no schema cache.
    if (erroLimite.code === "PGRST202") {
      console.warn("investidores_rate_limit_por_migrar");
    } else {
      console.error("investidores_rate_limit_falhou", { code: erroLimite.code });
      return erro("temporarily_unavailable", 503);
    }
  } else if (!permitido) {
    return erro("rate_limited", 429);
  }

  // 7 · escrita
  const retencao = new Date();
  retencao.setMonth(retencao.getMonth() + RETENCAO_MESES);

  const legado = {
    nome: lead.name,
    email: lead.email,
    empresa: lead.organisation || null,
    cargo: lead.role || null,
    // `interesse` é NOT NULL no schema legado e guardava texto livre; passa a
    // guardar o valor do enum, que é o que a página oferece.
    interesse: lead.interest,
    mensagem: lead.message || null,
  };

  const completo = {
    ...legado,
    estado: "new",
    ticket_band: lead.ticketBand || null,
    source_url: lead.sourceUrl,
    utm_source: lead.utmSource || null,
    utm_medium: lead.utmMedium || null,
    utm_campaign: lead.utmCampaign || null,
    privacy_version: lead.privacyVersion,
    privacy_acknowledged_at: new Date().toISOString(),
    ip_hash: ipHash,
    idempotency_key: lead.idempotencyKey,
    retention_until: retencao.toISOString(),
  };

  let { error: erroInsert } = await admin.from("propostas_investidores").insert(completo);

  // PGRST204 = coluna inexistente. Mesma janela: colunas novas ainda por
  // criar. Repete-se com o que o schema antigo tem, e o contacto não se
  // perde — perde-se a proveniência, que se recupera falando com a pessoa.
  if (erroInsert?.code === "PGRST204") {
    console.warn("investidores_colunas_por_migrar");
    ({ error: erroInsert } = await admin
      .from("propostas_investidores")
      .insert({ ...legado, estado: "pendente" }));
  }

  // 23505 = violação de unicidade → é o mesmo pedido a chegar segunda vez.
  // Responder "aceite" é o correto: do ponto de vista de quem enviou, está.
  if (erroInsert && erroInsert.code !== "23505") {
    console.error("investidores_insert_falhou", { code: erroInsert.code });
    return erro("temporarily_unavailable", 503);
  }
  const duplicado = erroInsert?.code === "23505";

  // Notificações só na primeira vez. Esperamos por elas antes de responder:
  // numa função serverless, trabalho pendente depois da resposta pode ser
  // cortado a meio. Se um dia a latência incomodar, isto vai para uma fila.
  if (!duplicado) {
    const { falhas } = await notificarNovoLead({
      nome: lead.name,
      organizacao: lead.organisation,
      interesse: lead.interest,
      email: lead.email,
    });
    // Falhar o email não perde o lead — já está guardado.
    if (falhas.length > 0) console.error("investidores_notificacao_falhou", { falhas });
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}

/** Qualquer outro método não existe aqui. */
export async function GET() {
  return erro("method_not_allowed", 405);
}
