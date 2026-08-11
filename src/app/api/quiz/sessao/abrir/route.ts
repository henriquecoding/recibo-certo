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
import { dentroDoTeto, inicioDoDiaEm } from "@/lib/quiz-fiscal/concorrencia";
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

  const perguntaIds = await escolherPerguntasDoBilhete(dificuldade);
  if (perguntaIds.length === 0) {
    return NextResponse.json(
      { erro: "Não há perguntas suficientes nesta dificuldade." },
      { status: 503 },
    );
  }

  // ── Teto diário: inserir e depois ver a posição na fila ───────────────
  // RC-QUIZ-001: contava-se ANTES de inserir. Dois pedidos simultâneos liam
  // ambos `limite - 1`, ambos concluíam que cabiam, e ambos inseriam — e com
  // vinte em paralelo passavam os vinte. Agora insere-se primeiro e conta-se
  // quantos bilhetes desta pessoa vieram ANTES do meu: isso dá uma ordem
  // estável, que não depende de quando cada pedido leu. Quem fica acima do
  // teto retira o próprio bilhete.
  //
  // Não é uma transação — a correção definitiva é um contador atómico, na
  // Onda 1 — mas transforma um excesso ilimitado num excesso impossível,
  // salvo empate ao microssegundo no `criado_em`.
  const inicioDoDia = inicioDoDiaEm();

  const { data: bilhete, error } = await sb
    .from("quiz_sessoes")
    .insert({ user_id: userId, dificuldade, pergunta_ids: perguntaIds })
    .select("id, criado_em")
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const { count, error: errConta } = await sb
    .from("quiz_sessoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("criado_em", inicioDoDia)
    .lt("criado_em", bilhete.criado_em);
  if (errConta) return NextResponse.json({ erro: errConta.message }, { status: 500 });

  if (!dentroDoTeto(count ?? 0, LIMITE_BILHETES_DIA)) {
    // O bilhete não chegou a ser usado: retirá-lo devolve a vaga e evita que
    // um pedido recusado conte para o teto de amanhã.
    await sb.from("quiz_sessoes").delete().eq("id", bilhete.id).is("submetido_em", null);
    return NextResponse.json(
      { erro: "Já abriste muitas sessões de desafio hoje. Volta amanhã." },
      { status: 429 },
    );
  }

  return NextResponse.json({ sessaoId: bilhete.id, perguntaIds });
}
