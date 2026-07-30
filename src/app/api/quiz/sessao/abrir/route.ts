// ═══════════════════════════════════════════════════════════════════════
//  POST /api/quiz/sessao/abrir — emite o bilhete de uma sessão de desafio
//  ---------------------------------------------------------------------
//  Sem isto, `/api/quiz/sessao` aceitava qualquer submissão com dez ids
//  válidos e os índices certos, quantas vezes quisesse. As respostas estão
//  todas no browser (o modo guiado e a revisão do resultado precisam delas),
//  por isso não há como as esconder — o que se controla é quantas sessões
//  existem, e é isso que este bilhete faz.
//
//  O servidor escolhe as perguntas. É a parte que não se pode delegar: com o
//  cliente a escolher, podia escolher sempre as mesmas dez.
//
//  Só se abrem bilhetes para as dificuldades que dão prémio (2 e 3). Uma
//  sessão de treino não precisa de bilhete nenhum e continua a funcionar sem
//  rede — jogar não depende de estar autenticado.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  DIFICULDADES_DE_DESAFIO,
  LIMITE_BILHETES_DIA,
  escolherPerguntasDoBilhete,
  supabaseServico,
  utilizadorDoPedido,
} from "@/lib/quiz-fiscal/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { dificuldade?: number };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const dificuldade = Number(corpo.dificuldade);
  if (!(DIFICULDADES_DE_DESAFIO as readonly number[]).includes(dificuldade)) {
    return NextResponse.json(
      { erro: "Esta dificuldade não abre sessão de desafio." },
      { status: 400 },
    );
  }

  // Teto diário. Não substitui a energia — é a rede de segurança contra um
  // script que peça bilhetes em série.
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const { count, error: errConta } = await sb
    .from("quiz_sessoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("criado_em", inicioDoDia.toISOString());
  if (errConta) return NextResponse.json({ erro: errConta.message }, { status: 500 });
  if ((count ?? 0) >= LIMITE_BILHETES_DIA) {
    return NextResponse.json(
      { erro: "Já abriste muitas sessões de desafio hoje. Volta amanhã." },
      { status: 429 },
    );
  }

  const perguntaIds = await escolherPerguntasDoBilhete(dificuldade);
  if (perguntaIds.length === 0) {
    return NextResponse.json(
      { erro: "Não há perguntas suficientes nesta dificuldade." },
      { status: 503 },
    );
  }

  const { data: bilhete, error } = await sb
    .from("quiz_sessoes")
    .insert({ user_id: userId, dificuldade, pergunta_ids: perguntaIds })
    .select("id")
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ sessaoId: bilhete.id, perguntaIds });
}
