// ═══════════════════════════════════════════════════════════════════════
//  POST /api/quiz/sessao — regista uma sessão de desafio, com verificação
//  ---------------------------------------------------------------------
//  `registarSessaoDesafio` era chamada DO CLIENTE, com valores DO CLIENTE:
//  bastava enviar `acertos: 10` para o progresso avançar. Nada era
//  recalculado. Aqui o servidor recebe as escolhas e apura os acertos a
//  partir do banco de perguntas, que só ele conhece.
//
//  ── O que faltava a isso ─────────────────────────────────────────────
//  Reapurar os acertos impede inventar um resultado, mas não impede
//  REPETI-LO. O banco inteiro, com cada `correta`, é carregado no browser
//  (o modo guiado e a revisão do resultado precisam dele), por isso quem
//  quisesse podia submeter as mesmas dez respostas certas em ciclo e ver
//  `sequencia_atual` subir até ao cupão. Sem limite.
//
//  Passa a ser preciso um BILHETE, emitido por `/api/quiz/sessao/abrir` e
//  guardado em `quiz_sessoes` (migração 028). Três condições, todas aqui:
//   1. o bilhete existe, é desta pessoa e está aberto;
//   2. fecha-se com UPDATE condicional antes de contar o prémio — dois
//      pedidos simultâneos com o mesmo bilhete só contam uma vez;
//   3. as perguntas submetidas são EXATAMENTE as que o servidor sorteou.
//
//  Assim o número de prémios deixa de depender de quantos pedidos alguém
//  faz e passa a depender de quantas sessões o servidor abriu.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  DIFICULDADES_DE_DESAFIO,
  META_DESAFIO_SERVIDOR,
  TEMPO_MINIMO_SESSAO_MS,
  VALIDADE_CUPAO_DIAS,
  gerarCodigoCupaoServidor,
  supabaseServico,
  utilizadorDoPedido,
  verificarSessao,
  type RespostaSubmetida,
} from "@/lib/quiz-fiscal/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { dificuldade?: number; respostas?: RespostaSubmetida[]; sessaoId?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const respostas = Array.isArray(corpo.respostas) ? corpo.respostas.slice(0, 50) : [];
  const dificuldade = Number(corpo.dificuldade);
  if (respostas.length === 0 || !Number.isFinite(dificuldade)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  // ── O bilhete ────────────────────────────────────────────────────────
  // Só as dificuldades de desafio dão prémio, e só essas exigem bilhete. Uma
  // sessão de treino continua a registar-se sem nada disto.
  const éDesafio = (DIFICULDADES_DE_DESAFIO as readonly number[]).includes(dificuldade);
  const sessaoId = typeof corpo.sessaoId === "string" ? corpo.sessaoId : "";

  interface Bilhete {
    id: string;
    pergunta_ids: string[];
    criado_em: string;
  }
  let bilhete: Bilhete | null = null;
  if (éDesafio) {
    if (!sessaoId) {
      return NextResponse.json(
        { erro: "Falta o identificador da sessão. Começa o desafio pelo botão." },
        { status: 400 },
      );
    }
    const { data, error } = await sb
      .from("quiz_sessoes")
      .select("id, pergunta_ids, criado_em")
      .eq("id", sessaoId)
      .eq("user_id", userId)
      .eq("dificuldade", dificuldade)
      .is("submetido_em", null)
      .maybeSingle();
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    if (!data) {
      // Não existe, não é desta pessoa, ou já foi submetido. As três dizem o
      // mesmo ao cliente de propósito — não se confirma qual é.
      return NextResponse.json({ erro: "Sessão inválida ou já registada." }, { status: 409 });
    }
    bilhete = {
      id: String(data.id),
      pergunta_ids: (data.pergunta_ids ?? []) as string[],
      criado_em: String(data.criado_em),
    };

    // Dez perguntas respondidas em menos de vinte segundos não é uma sessão
    // jogada. O piso é baixo por desenho: não se quer castigar quem sabe.
    const decorrido = Date.now() - new Date(bilhete.criado_em).getTime();
    if (decorrido < TEMPO_MINIMO_SESSAO_MS) {
      return NextResponse.json(
        { erro: "Sessão demasiado rápida para ser válida." },
        { status: 422 },
      );
    }

    // Fecha o bilhete ANTES de contar o prémio, com a condição no próprio
    // UPDATE: dois pedidos simultâneos com o mesmo bilhete — que é como se
    // duplica um prémio — só um passa. Mesmo padrão do resgate do cupão.
    const { data: fechado, error: errFecho } = await sb
      .from("quiz_sessoes")
      .update({ submetido_em: new Date().toISOString() })
      .eq("id", bilhete.id)
      .is("submetido_em", null)
      .select("id");
    if (errFecho) return NextResponse.json({ erro: errFecho.message }, { status: 500 });
    if (!fechado || fechado.length === 0) {
      return NextResponse.json({ erro: "Sessão inválida ou já registada." }, { status: 409 });
    }
  }

  const verificado = await verificarSessao({
    dificuldade,
    respostas,
    ...(bilhete ? { perguntasAutorizadas: bilhete.pergunta_ids } : {}),
  });
  if (verificado.desconhecidos.length > 0) {
    // IDs que não existem no banco só aparecem numa submissão forjada.
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 400 });
  }
  if (!verificado.correspondeAoBilhete) {
    // O bilhete era legítimo, as perguntas não são as dele.
    return NextResponse.json({ erro: "As perguntas não são as desta sessão." }, { status: 409 });
  }
  if (!verificado.caminho) {
    return NextResponse.json({ ok: true, acertos: verificado.acertos, cupaoGerado: null });
  }

  const caminho = verificado.caminho;
  const meta = META_DESAFIO_SERVIDOR[caminho].meta;
  const outros = (["medio", "dificil"] as const).filter((c) => c !== caminho);
  const agora = new Date().toISOString();

  // A sessão só conta para o caminho da sua dificuldade; os outros caminhos
  // são sempre repostos, como no comportamento original.
  const reposicoes = outros.map((c) => ({
    user_id: userId,
    caminho: c,
    sequencia_atual: 0,
    sequencia_meta: META_DESAFIO_SERVIDOR[c].meta,
    atualizado_em: agora,
  }));

  if (!verificado.perfeito) {
    const { error } = await sb.from("quiz_achievement_progress").upsert(
      [{ user_id: userId, caminho, sequencia_atual: 0, sequencia_meta: meta, atualizado_em: agora }, ...reposicoes],
      { onConflict: "user_id,caminho" },
    );
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, acertos: verificado.acertos, cupaoGerado: null });
  }

  const { data: linha, error: errLeitura } = await sb
    .from("quiz_achievement_progress")
    .select("sequencia_atual")
    .eq("user_id", userId)
    .eq("caminho", caminho)
    .maybeSingle();
  if (errLeitura) return NextResponse.json({ erro: errLeitura.message }, { status: 500 });

  const novaSeq = (linha?.sequencia_atual ?? 0) + 1;
  const atingiuMeta = novaSeq >= meta;

  const { error: errProgresso } = await sb.from("quiz_achievement_progress").upsert(
    [
      {
        user_id: userId,
        caminho,
        // Ao atingir a meta a sequência recomeça.
        sequencia_atual: atingiuMeta ? 0 : novaSeq,
        sequencia_meta: meta,
        atualizado_em: agora,
      },
      ...reposicoes,
    ],
    { onConflict: "user_id,caminho" },
  );
  if (errProgresso) return NextResponse.json({ erro: errProgresso.message }, { status: 500 });

  if (!atingiuMeta) {
    return NextResponse.json({
      ok: true,
      acertos: verificado.acertos,
      sequenciaAtual: novaSeq,
      cupaoGerado: null,
    });
  }

  const { data: cupao, error: errCupao } = await sb
    .from("quiz_cupoes")
    .insert({
      user_id: userId,
      codigo: gerarCodigoCupaoServidor(),
      caminho,
      meses: META_DESAFIO_SERVIDOR[caminho].meses,
      estado: "disponivel",
      expira_em: new Date(Date.now() + VALIDADE_CUPAO_DIAS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (errCupao) return NextResponse.json({ erro: errCupao.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    acertos: verificado.acertos,
    sequenciaAtual: 0,
    cupaoGerado: {
      id: cupao.id,
      codigo: cupao.codigo,
      caminho: cupao.caminho,
      meses: cupao.meses,
      estado: cupao.estado,
      criadoEm: cupao.criado_em,
      ativadoEm: cupao.ativado_em,
      expiraEm: cupao.expira_em,
    },
  });
}
