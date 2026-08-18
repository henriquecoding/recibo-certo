// ═══════════════════════════════════════════════════════════════════════
//  /api/admin/verificacao — a consola de verificação da Ordem
//  ---------------------------------------------------------------------
//  Esta rota é a ÚNICA porta pela qual um selo pode nascer. As colunas de
//  verificação estão trancadas por trigger para toda a gente menos a
//  administração, e a chave de serviço vive só aqui.
//
//  O que a rota faz, e que um botão «marcar como verificado» não fazia:
//
//   · exige que a decisão traga a EVIDÊNCIA — o que foi lido no registo
//     público. Sem isso, «verificado» é a palavra de quem carregou;
//   · corre a comparação do lado do servidor. O ecrã já a corre, mas o
//     ecrã é código que o cliente controla, e uma verificação que confia
//     no cliente não é uma verificação;
//   · aplica a máquina de estados, com as suas regras de força e de
//     prazo — o mesmo motor que a interface usa para ler;
//   · deixa registo em `admin_auditoria`, porque numa investigação a
//     ausência de registo é indistinguível da ausência de acesso indevido.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { adminDoPedido } from "@/lib/supabase/verify-request-admin";
import { supabaseServico } from "@/lib/contabilistas/servidor";
import {
  compararComRegisto, confirmar, construirEvidencia, diagnosticarNumeroOCC,
  lerVerificacao, recusar, type MetodoVerificacao, type RegistoVerificacao,
} from "@/lib/contabilistas/verificacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METODOS_ADMIN: readonly MetodoVerificacao[] = ["registo_publico", "documento"];

interface LinhaVerificacao {
  user_id: string;
  nome: string;
  slug: string;
  occ: string | null;
  occ_verificado_metodo: string | null;
  occ_verificado_em: string | null;
  occ_verificado_ate: string | null;
  occ_numero_confirmado: string | null;
  occ_pedido_em: string | null;
  occ_recusa_motivo: string | null;
  occ_recusado_em: string | null;
}

const CAMPOS =
  "user_id, nome, slug, occ, occ_verificado_metodo, occ_verificado_em, " +
  "occ_verificado_ate, occ_numero_confirmado, occ_pedido_em, occ_recusa_motivo, " +
  "occ_recusado_em";

function paraRegisto(l: LinhaVerificacao): RegistoVerificacao {
  return {
    metodo: (l.occ_verificado_metodo as MetodoVerificacao | null) ?? null,
    confirmadoEm: l.occ_verificado_em,
    validoAte: l.occ_verificado_ate,
    numeroConfirmado: l.occ_numero_confirmado,
    confirmadoPor: null,
    pedidoEm: l.occ_pedido_em,
    recusaMotivo: l.occ_recusa_motivo,
    recusadoEm: l.occ_recusado_em,
  };
}

/**
 * A fila. Ordenada por quem espera há mais tempo, e não por nome.
 *
 * Traz TODAS as contas aprovadas com número — não só as que pediram. Uma
 * verificação a caducar não gera pedido nenhum, e sem a fila a mostrar
 * também essas, os selos caíam em silêncio e ninguém dava por isso.
 */
export async function GET(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const { data, error } = await sb
    .from("contabilistas")
    .select(CAMPOS)
    .eq("estado", "aprovado")
    .not("occ", "is", null)
    .order("occ_pedido_em", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) {
    console.error("[admin/verificacao] GET:", error.message);
    return NextResponse.json({ erro: "Não foi possível carregar a fila." }, { status: 500 });
  }

  const linhas = (data ?? []) as unknown as LinhaVerificacao[];
  const fila = linhas.map((l) => {
    const registo = paraRegisto(l);
    const leitura = lerVerificacao({ numeroAtual: l.occ, registo });
    return {
      userId: l.user_id,
      nome: l.nome,
      slug: l.slug,
      occ: l.occ,
      pedidoEm: l.occ_pedido_em,
      estado: leitura.estado,
      rotulo: leitura.rotulo,
      metodo: leitura.metodo,
      diasAteCaducar: leitura.diasAteCaducar,
      aExpirar: leitura.aExpirar,
    };
  });

  return NextResponse.json({ fila });
}

interface Corpo {
  userId?: string;
  decisao?: "confirmar" | "recusar";
  metodo?: string;
  motivo?: string;
  /** O que foi lido no registo público da Ordem. */
  leitura?: { nome?: string; numero?: string; exercicio?: string | null };
}

export async function PATCH(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: Corpo;
  try { corpo = (await req.json()) as Corpo; }
  catch { return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 }); }

  const userId = typeof corpo.userId === "string" ? corpo.userId : "";
  if (!userId) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { data, error: erroLeitura } = await sb
    .from("contabilistas").select(CAMPOS).eq("user_id", userId).maybeSingle();

  if (erroLeitura || !data) {
    return NextResponse.json({ erro: "Contabilista não encontrado." }, { status: 404 });
  }

  const linha = data as unknown as LinhaVerificacao;
  const registo = paraRegisto(linha);
  const numero = diagnosticarNumeroOCC(linha.occ).normalizado;

  if (!numero) {
    return NextResponse.json(
      { erro: "Esta ficha não tem um número de inscrição legível." },
      { status: 400 }
    );
  }

  // ── Recusar ────────────────────────────────────────────────────────
  if (corpo.decisao === "recusar") {
    const motivo = typeof corpo.motivo === "string" ? corpo.motivo.trim() : "";
    const r = recusar(registo, { numero, motivo });
    if (!r.ok) return NextResponse.json({ erro: r.motivo }, { status: 400 });

    const { error } = await sb.from("contabilistas").update({
      occ_verificado_metodo: null,
      occ_verificado_em: null,
      occ_verificado_ate: null,
      occ_verificado_por: null,
      occ_numero_confirmado: r.registo.numeroConfirmado,
      occ_evidencia: null,
      occ_pedido_em: null,
      occ_recusa_motivo: r.registo.recusaMotivo,
      occ_recusado_em: r.registo.recusadoEm,
    }).eq("user_id", userId);

    if (error) {
      console.error("[admin/verificacao] recusar:", error.message);
      return NextResponse.json({ erro: "Não foi possível registar a recusa." }, { status: 500 });
    }

    await registar(sb, ator, "occ_verificacao_recusada", userId, { motivo, numero }, ip);
    return NextResponse.json({ ok: true, estado: "recusado" });
  }

  // ── Confirmar ──────────────────────────────────────────────────────
  if (corpo.decisao !== "confirmar") {
    return NextResponse.json({ erro: "Decisão desconhecida." }, { status: 400 });
  }

  const metodo = corpo.metodo as MetodoVerificacao | undefined;
  if (!metodo || !METODOS_ADMIN.includes(metodo)) {
    // O SCAP não passa por aqui de propósito: quem confirma nesse caminho
    // é a Ordem, não uma pessoa desta administração. Deixar um humano
    // escolher «scap» na consola seria dar-lhe o selo mais forte sem
    // nenhuma das garantias que o tornam o mais forte.
    return NextResponse.json(
      { erro: "Método inválido para confirmação manual." },
      { status: 400 }
    );
  }

  const lido = {
    nome: typeof corpo.leitura?.nome === "string" ? corpo.leitura.nome.trim() : "",
    numero: typeof corpo.leitura?.numero === "string" ? corpo.leitura.numero.trim() : "",
    exercicio: typeof corpo.leitura?.exercicio === "string" ? corpo.leitura.exercicio.trim() : null,
  };

  if (!lido.nome || !lido.numero) {
    return NextResponse.json(
      { erro: "Escreve o nome e o número tal como aparecem no registo da Ordem." },
      { status: 400 }
    );
  }

  // A comparação é refeita AQUI. O ecrã já a fez, e o ecrã é código que o
  // cliente controla — confiar nele seria transformar a verificação num
  // campo de formulário.
  const comparacao = compararComRegisto({ nome: linha.nome, numero: linha.occ }, lido);
  if (metodo === "registo_publico" && !comparacao.podeConfirmar) {
    return NextResponse.json(
      { erro: "O que leste no registo não confirma esta ficha.", comparacao },
      { status: 422 }
    );
  }

  const t = confirmar(registo, { metodo, numero, por: ator.id });
  if (!t.ok) return NextResponse.json({ erro: t.motivo }, { status: 409 });

  const { error } = await sb.from("contabilistas").update({
    occ_verificado_metodo: t.registo.metodo,
    occ_verificado_em: t.registo.confirmadoEm,
    occ_verificado_ate: t.registo.validoAte,
    occ_verificado_por: ator.id,
    occ_numero_confirmado: t.registo.numeroConfirmado,
    occ_evidencia: construirEvidencia(lido, comparacao),
    occ_pedido_em: null,
    occ_recusa_motivo: null,
    occ_recusado_em: null,
  }).eq("user_id", userId);

  if (error) {
    console.error("[admin/verificacao] confirmar:", error.message);
    return NextResponse.json({ erro: "Não foi possível gravar a verificação." }, { status: 500 });
  }

  await registar(sb, ator, "occ_verificacao_confirmada", userId, {
    metodo, numero, validoAte: t.registo.validoAte,
    comparacao: { nome: comparacao.nome, numero: comparacao.numero, ativo: comparacao.ativo },
  }, ip);

  return NextResponse.json({ ok: true, estado: "verificado", validoAte: t.registo.validoAte });
}

async function registar(
  sb: NonNullable<ReturnType<typeof supabaseServico>>,
  ator: { id: string; email: string | null },
  acao: string,
  alvoId: string,
  detalhe: Record<string, unknown>,
  ip: string | null
): Promise<void> {
  const { error } = await sb.from("admin_auditoria").insert({
    ator_id: ator.id,
    ator_email: ator.email,
    acao,
    alvo_id: alvoId,
    detalhe,
    ip,
  });
  // O registo falhar não pode desfazer a decisão já gravada — mas tem de
  // aparecer nos logs, porque uma auditoria com buracos silenciosos é
  // pior do que não ter auditoria nenhuma.
  if (error) console.error("[admin/verificacao] auditoria:", error.message);
}
