// ═══════════════════════════════════════════════════════════════════════
//  /api/contabilistas/anexo — a vaga, e o fecho da vaga
//  ---------------------------------------------------------------------
//  POST  → abre uma vaga: devolve o caminho que o SERVIDOR escolheu e um
//          URL assinado para escrever lá, uma vez só.
//  PATCH → fecha a vaga: olha para os primeiros bytes do que ficou lá, e
//          só então escreve a linha do anexo. Se os bytes desmentirem o
//          tipo declarado, o objeto é apagado e não fica linha nenhuma.
//
//  A ordem é esta e não outra. Escrever a linha primeiro e verificar
//  depois deixava, no intervalo, um anexo visível a apontar para conteúdo
//  que ninguém tinha olhado.
//
//  O ficheiro NÃO passa por aqui: vai direto para o armazenamento, com um
//  URL assinado. Passar dez megabytes por uma função sem estado seria
//  esbarrar no limite do corpo do pedido e tornar impossível o que a
//  interface promete.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServico, supabaseDoPedido, utilizadorDoPedido } from "@/lib/contabilistas/servidor";
import { assinaturaConfere, BYTES_PARA_ASSINATURA } from "@/lib/ficheiros/assinatura";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BALDE = "contabilista-anexos";

/** Os três sítios que aceitam ficheiros. Qualquer outro nome é recusado. */
const CONTEXTOS = ["mensagem", "caso", "proposta"];

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Uma conversa com anexos são dezenas por hora; centenas não são.
  const limite = rateLimit(`contabilista:anexo:${userId}:${clientIp(req)}`, 40, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados envios. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
    );
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { contexto?: string; alvo?: string; mensagemId?: string;
               tipoMime?: string; bytes?: number };
  try { corpo = await req.json(); }
  catch { return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 }); }

  // `mensagemId` é a forma antiga, de quando só a conversa aceitava
  // ficheiros. Continua a funcionar para não partir quem ainda a envia.
  const contexto = corpo.contexto ?? "mensagem";
  const alvo = corpo.alvo ?? corpo.mensagemId;

  if (!CONTEXTOS.includes(contexto) || typeof alvo !== "string"
      || typeof corpo.tipoMime !== "string" || typeof corpo.bytes !== "number") {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  // A vaga abre-se com a identidade de quem pede, e não com a chave de
  // serviço: é `auth.uid()` dentro da função que confirma que a mensagem
  // é mesmo desta pessoa.
  const comoUtilizador = supabaseDoPedido(req);
  if (!comoUtilizador) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const { data, error } = await comoUtilizador.rpc("abrir_vaga", {
    p_contexto: contexto,
    p_alvo: alvo,
    p_tipo_mime: corpo.tipoMime,
    p_bytes: Math.round(corpo.bytes),
  });
  if (error) {
    console.error("[anexo] abrir vaga:", error.message);
    return NextResponse.json({ erro: "Não foi possível preparar o envio." }, { status: 500 });
  }

  const r = (data ?? {}) as { ok?: boolean; motivo?: string; id?: string; caminho?: string };
  if (!r.ok || !r.caminho) {
    return NextResponse.json({ erro: MOTIVO[r.motivo ?? ""] ?? "Envio recusado." }, { status: 409 });
  }

  // O URL de escrita vale uma vez e só para este caminho. Sem ele, o
  // browser teria de poder escrever no balde por si — que é exatamente o
  // que a migração 048 lhe tirou.
  const { data: assinado, error: erroUrl } = await sb
    .storage.from(BALDE).createSignedUploadUrl(r.caminho);
  if (erroUrl || !assinado) {
    console.error("[anexo] assinar:", erroUrl?.message);
    return NextResponse.json({ erro: "Não foi possível preparar o envio." }, { status: 500 });
  }

  return NextResponse.json({
    vagaId: r.id,
    caminho: r.caminho,
    url: assinado.signedUrl,
    token: assinado.token,
  });
}

export async function PATCH(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { vagaId?: string; nome?: string; eContrato?: boolean };
  try { corpo = await req.json(); }
  catch { return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 }); }

  const vagaId = typeof corpo.vagaId === "string" ? corpo.vagaId : "";
  if (!vagaId) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

  // A vaga tem de ser desta pessoa. Sem esta verificação, fechava-se a
  // vaga de outra a partir de um id adivinhado.
  const { data: vaga } = await sb
    .from("anexo_vagas")
    .select("id, caminho, tipo_mime, bytes_max, pedida_por, usada_em")
    .eq("id", vagaId)
    .maybeSingle();

  if (!vaga || vaga.pedida_por !== userId) {
    return NextResponse.json({ erro: "Envio não encontrado." }, { status: 404 });
  }

  const caminho = vaga.caminho as string;

  // Os primeiros bytes, e não o ficheiro inteiro: nenhuma assinatura
  // conhecida passa dos primeiros sessenta e quatro.
  const { data: ficheiro, error: erroLer } = await sb.storage.from(BALDE).download(caminho);
  if (erroLer || !ficheiro) {
    return NextResponse.json({ erro: "O ficheiro não chegou. Tenta outra vez." }, { status: 409 });
  }

  const bytes = ficheiro.size;
  if (bytes > (vaga.bytes_max as number)) {
    await sb.storage.from(BALDE).remove([caminho]);
    return NextResponse.json({ erro: "O ficheiro é maior do que o anunciado." }, { status: 413 });
  }

  const inicio = new Uint8Array(
    await ficheiro.slice(0, BYTES_PARA_ASSINATURA).arrayBuffer()
  );
  const veredito = assinaturaConfere(inicio, vaga.tipo_mime as string);

  if (!veredito.ok) {
    // O objeto sai, e não fica linha nenhuma a apontar-lhe. Um ficheiro
    // que mentiu sobre o que é não fica guardado à espera de ser aberto.
    await sb.storage.from(BALDE).remove([caminho]);
    return NextResponse.json({ erro: veredito.motivo }, { status: 415 });
  }

  const { data, error } = await sb.rpc("fechar_vaga", {
    p_vaga: vagaId,
    p_nome: (corpo.nome ?? "ficheiro").slice(0, 200),
    p_bytes: bytes,
    p_e_contrato: corpo.eContrato === true,
  });
  if (error) {
    console.error("[anexo] fechar vaga:", error.message);
    return NextResponse.json({ erro: "Não foi possível registar o anexo." }, { status: 500 });
  }

  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  if (!r.ok) {
    await sb.storage.from(BALDE).remove([caminho]);
    return NextResponse.json({ erro: MOTIVO[r.motivo ?? ""] ?? "Envio recusado." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, caminho });
}

const MOTIVO: Record<string, string> = {
  mensagem_nao_e_tua: "Só se anexa a uma mensagem que tenhas escrito.",
  caso_nao_e_teu: "Só se anexam documentos a um caso teu, e enquanto estiver aberto.",
  proposta_nao_e_tua: "Só se anexa a uma proposta tua, e antes de ser decidida.",
  contexto_invalido: "Não sabemos onde guardar isto.",
  tamanho_recusado: "O ficheiro passa dos 10 MB.",
  tipo_recusado: "Esse formato não é aceite.",
  sem_vagas: "Já tens cinco anexos nesta mensagem.",
  nao_autenticado: "Entra na tua conta.",
  vaga_fechada_ou_expirada: "Este envio já expirou. Tenta outra vez.",
  maior_do_que_o_anunciado: "O ficheiro é maior do que o anunciado.",
};
