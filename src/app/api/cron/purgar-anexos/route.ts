// ═══════════════════════════════════════════════════════════════════════
//  Os anexos órfãos e as vagas gastas varrem-se aqui, uma vez por dia.
//  ---------------------------------------------------------------------
//  Um órfão é um objeto sem nada que o reclame. Nascem de um envio que
//  morre a meio — a vaga abriu, o ficheiro subiu, o separador fechou-se
//  antes de o servidor verificar os bytes. Ninguém os vê, e ocupam o plano
//  em silêncio até alguém reparar na fatura.
//
//  Duas horas de tolerância: menos do que isso apanharia envios ainda a
//  decorrer, e apagar o ficheiro de alguém a meio do envio é pior do que
//  deixá-lo mais um bocado.
//
//  ---------------------------------------------------------------------
//  ⚠️ QUEM APAGA OS BYTES É A STORAGE API, E NÃO O SQL
//
//  A versão anterior chamava uma função que fazia `DELETE FROM
//  storage.objects`. O Supabase recusa isso:
//
//    «Direct deletion from storage tables is not allowed.
//     Use the Storage API instead.»
//
//  Todos os dias, nos logs de produção, durante meses. A rota devolvia
//  500 e nenhum órfão foi alguma vez apagado — a retenção prometida na
//  página de privacidade não tinha nada por trás.
//
//  A base de dados passa a fazer o que sabe fazer, e só isso:
//
//    1. `reservar_anexos_orfaos` deteta, regista e reserva um lote;
//    2. esta rota manda o Storage removê-los, em lotes;
//    3. `fechar_purga_de_anexos` VERIFICA que desapareceram e só então
//       escreve «removido».
//
//  O passo 3 não acredita nesta rota — vai ver a `storage.objects`. É o
//  que impede a metadata de dizer «apagado» sobre bytes que ficaram.
//
//  Retomável: o que falhar fica na fila com o motivo, e a execução
//  seguinte pega no mesmo sítio. Seguro em paralelo: a reserva usa
//  `SKIP LOCKED`, e duas execuções não pedem a mesma remoção.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BALDE = "contabilista-anexos";
/** Quantos caminhos por chamada ao Storage. Acima disto o pedido cresce demais. */
const LOTE = 100;
/** Teto por execução. O resto fica na fila para a execução seguinte. */
const POR_EXECUCAO = 500;

interface Estado {
  pendentes: number;
  reservados: number;
  teimosos: number;
  mais_antigo_h: number;
  removidos_24h: number;
}

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    console.error("[cron/purgar-anexos] CRON_SECRET não configurado — recusado.");
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

  // ── 1. Detetar e reservar ────────────────────────────────────────
  const { data: reservados, error } = await sb.rpc("reservar_anexos_orfaos", {
    p_idade: "2 hours",
    p_limite: POR_EXECUCAO,
    p_reserva: "10 minutes",
  });
  if (error) {
    console.error("[cron/purgar-anexos] reservar:", error.message);
    return NextResponse.json({ erro: "Falha ao reservar." }, { status: 500 });
  }

  const caminhos = ((reservados ?? []) as { caminho: string }[]).map((r) => r.caminho);

  // ── 2. Remover pela Storage API, em lotes ────────────────────────
  let removidos = 0;
  let pendentes = 0;
  const falhas: string[] = [];

  for (let i = 0; i < caminhos.length; i += LOTE) {
    const lote = caminhos.slice(i, i + LOTE);
    const { error: erroStorage } = await sb.storage.from(BALDE).remove(lote);

    // ── 3. Confirmar, lote a lote ──────────────────────────────────
    //  Mesmo com erro do Storage se fecha o lote: parte dele pode ter
    //  saído, e a função confirma um a um contra `storage.objects`. O que
    //  não saiu larga a reserva e volta à fila com o motivo.
    const { data: fecho, error: erroFecho } = await sb.rpc("fechar_purga_de_anexos", {
      p_caminhos: lote,
      p_erro: erroStorage?.message ?? null,
    });

    if (erroFecho) {
      // Não se pode continuar às cegas: sem fechar, o lote seguinte
      // reserva por cima do que este deixou por confirmar.
      console.error("[cron/purgar-anexos] fechar:", erroFecho.message);
      falhas.push(erroFecho.message);
      break;
    }

    const r = (fecho ?? {}) as { removidos?: number; pendentes?: number };
    removidos += r.removidos ?? 0;
    pendentes += r.pendentes ?? 0;
    if (erroStorage) falhas.push(erroStorage.message);
  }

  // ── 4. As vagas gastas ───────────────────────────────────────────
  const { data: vagas, error: erroVagas } = await sb.rpc("purgar_vagas_velhas");
  if (erroVagas) console.error("[cron/purgar-anexos] vagas:", erroVagas.message);

  // ── 5. O alarme ──────────────────────────────────────────────────
  //  «Falhou» é um evento; «falha há dias e a fila cresce» é um problema.
  //  Sem esta distinção, o defeito que esta rota corrige teria voltado a
  //  passar despercebido: havia um erro por dia nos logs, e ninguém o
  //  procurava porque nada dizia que era o mesmo erro há meses.
  const { data: estadoBruto } = await sb.rpc("estado_da_purga_de_anexos");
  const estado = (estadoBruto ?? {}) as Partial<Estado>;
  const backlogTeimoso = (estado.teimosos ?? 0) > 0 || (estado.mais_antigo_h ?? 0) > 48;

  // Contagens, nunca caminhos: este registo fica nos logs, e um caminho
  // diz a que vínculo ou a que caso pertence o ficheiro.
  const resumo = {
    reservados: caminhos.length,
    removidos,
    pendentes,
    vagas: vagas ?? 0,
    fila: estado.pendentes ?? 0,
    teimosos: estado.teimosos ?? 0,
    maisAntigoH: estado.mais_antigo_h ?? 0,
  };

  if (backlogTeimoso) {
    console.error("[cron/purgar-anexos] backlog por resolver", {
      ...resumo,
      // A primeira mensagem de erro basta para saber o que se passa; as
      // outras são a mesma repetida.
      motivo: falhas[0] ?? "objetos que não desaparecem do Storage",
    });
  } else {
    console.info("[cron/purgar-anexos]", resumo);
  }

  // Uma falha de um lote não é uma falha da execução: o resto correu, e
  // devolver 500 aqui faria o cron parecer partido todos os dias por um
  // ficheiro teimoso. O 500 fica para quando não se conseguiu sequer
  // reservar — que é a única falha que impede qualquer progresso.
  return NextResponse.json({ ok: true, ...resumo, alarme: backlogTeimoso });
}
