// ═══════════════════════════════════════════════════════════════════════
//  O FEED DE CALENDÁRIO
//  ---------------------------------------------------------------------
//  Um endereço que devolve `text/calendar`. O Google, o Apple e o Outlook
//  subscrevem-no e voltam a lê-lo de tempos a tempos — é isso, e mais
//  nada, que faz a consulta aparecer no telemóvel de quem a marcou e
//  mudar de hora sozinha quando ela muda aqui.
//
//  PORQUE É QUE NÃO HÁ SESSÃO
//  --------------------------
//  Quem faz este pedido não é um browser com sessão iniciada: é um
//  servidor do Google, às três da manhã, sem cookies e sem forma de
//  apresentar um token num cabeçalho. O protocolo não tem por onde
//  autenticar — e por isso o segredo vive no caminho do URL.
//
//  É uma decisão com custo, e o custo está escrito na migração
//  `20260818220000`: quem tiver o endereço, lê a agenda. O que a torna
//  aceitável é o resto do desenho — 244 bits de aleatoriedade, revogação
//  num clique, e a opção de o feed dizer apenas «ocupado».
//
//  AS DEFESAS QUE ESTA ROTA ACRESCENTA
//  -----------------------------------
//   · `noindex` e `nosnippet`. Um feed que aparece numa pesquisa é um
//     feed público, e ninguém o quis assim.
//   · `Cache-Control: private`. Uma cache partilhada a guardar isto
//     serviria a agenda de uma pessoa a outra.
//   · Resposta igual para token inválido e para token revogado. Distingui-
//     los diria a quem anda a adivinhar que estava perto.
//   · Nada é escrito no registo com o token dentro.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import {
  construirCalendario, type EventoICS, type EstadoEvento,
} from "@/lib/calendario/ics";
import { ORIGEM_CANONICA } from "@/lib/origem";

export const runtime = "nodejs";
// Nunca estático: a agenda muda, e um feed pré-renderizado no build
// devolveria para sempre as consultas que existiam nesse dia.
export const dynamic = "force-dynamic";

/** Quantos dias para trás. O suficiente para o histórico recente, não mais. */
const DIAS_ATRAS = 30;
/** E para a frente. Um ano cobre tudo o que a agenda deixa marcar. */
const DIAS_A_FRENTE = 365;

/** De quanto em quanto tempo se PEDE que releiam. Nenhum cliente obedece. */
const RELER_A_CADA_MIN = 60;

const ESTADO: Record<string, EstadoEvento> = {
  pedido: "provisorio",
  confirmado: "confirmado",
  realizada: "confirmado",
  cancelado_cliente: "cancelado",
  cancelado_contabilista: "cancelado",
  nao_compareceu: "cancelado",
};

interface Linha { [k: string]: unknown }

function calendarioVazio(nome: string): string {
  return construirCalendario([], { nome, atualizarACadaMin: RELER_A_CADA_MIN });
}

function resposta(ics: string, estado = 200): NextResponse {
  return new NextResponse(ics, {
    status: estado,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="recibo-certo.ics"',
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token: bruto } = await ctx.params;
  const token = (bruto ?? "").replace(/\.ics$/i, "").toLowerCase();

  // O formato é verificado antes de se ir à base de dados. Não é uma
  // otimização: é não deixar que um caminho arbitrário chegue a uma
  // consulta, por muito parametrizada que ela seja.
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return resposta(calendarioVazio("Recibo Certo"), 404);
  }

  const sb = supabaseAdmin();
  // Sem credenciais de servidor não se inventa uma resposta: devolve-se um
  // calendário vazio e não um erro, porque um erro faz o Google desistir
  // da subscrição ao fim de algumas tentativas.
  if (!sb) return resposta(calendarioVazio("Recibo Certo"));

  const { data: assinatura } = await sb
    .from("calendario_assinaturas")
    .select("user_id, papel, detalhe, alarme_min, revogado_em")
    .eq("token", token)
    .is("revogado_em", null)
    .maybeSingle();

  // Revogado e inexistente respondem o mesmo. A diferença entre os dois
  // seria informação para quem estivesse a tentar adivinhar.
  if (!assinatura) return resposta(calendarioVazio("Recibo Certo"), 404);

  const a = assinatura as unknown as {
    user_id: string;
    papel: "cliente" | "contabilista";
    detalhe: "completo" | "ocupado";
    alarme_min: number | null;
  };

  const agora = new Date();
  const de = new Date(agora.getTime() - DIAS_ATRAS * 86_400_000);
  const ate = new Date(agora.getTime() + DIAS_A_FRENTE * 86_400_000);

  const coluna = a.papel === "contabilista" ? "contabilista_id" : "cliente_id";
  const { data: linhas } = await sb
    .from("agendamentos")
    .select("id, inicio, fim, estado, modalidade, assunto, local_ou_ligacao, " +
            "local_lat, local_lng, criado_em, atualizado_em, cliente_id, contabilista_id")
    .eq(coluna, a.user_id)
    .gte("inicio", de.toISOString())
    .lte("inicio", ate.toISOString())
    .order("inicio")
    .limit(500);

  const completo = a.detalhe === "completo";

  // O nome do outro lado só se procura quando vai ser mostrado. Em
  // «ocupado» nem se pergunta — pedir dados que não se vão usar é a forma
  // mais fácil de os deixar escapar para um registo mais tarde.
  const nomes = new Map<string, string>();
  if (completo && a.papel === "contabilista" && linhas?.length) {
    const ids = [...new Set((linhas as unknown as Linha[]).map((l) => l.cliente_id as string))];
    const { data: vinculos } = await sb
      .from("contabilista_vinculos")
      .select("cliente_id, nome_cliente")
      .eq("contabilista_id", a.user_id)
      .in("cliente_id", ids);
    for (const v of ((vinculos ?? []) as unknown as Linha[])) {
      const nome = (v.nome_cliente as string | null)?.trim();
      if (nome) nomes.set(v.cliente_id as string, nome);
    }
  }

  const eventos: EventoICS[] = ((linhas ?? []) as unknown as Linha[]).map((l) => {
    const estado = ESTADO[l.estado as string] ?? "provisorio";
    const online = l.modalidade === "online";
    const assunto = (l.assunto as string | null)?.trim();

    let titulo: string;
    if (!completo) {
      titulo = "Ocupado";
    } else if (a.papel === "contabilista") {
      const nome = nomes.get(l.cliente_id as string);
      titulo = nome ? `Consulta · ${nome}` : "Consulta";
    } else {
      titulo = "Consulta com o meu contabilista";
    }

    const partes: string[] = [];
    if (completo) {
      if (assunto) partes.push(assunto);
      partes.push(online ? "Consulta online." : "Consulta presencial.");
      partes.push(`Marcada pelo Recibo Certo — ${ORIGEM_CANONICA}/dashboard`);
    }

    return {
      // Estável para sempre, e único no mundo. Se mudasse entre leituras,
      // cada releitura criava um evento novo em vez de atualizar o antigo.
      uid: `agendamento-${l.id as string}@recibocerto.pt`,
      inicio: new Date(l.inicio as string),
      fim: new Date(l.fim as string),
      titulo,
      descricao: partes.length ? partes.join("\n") : undefined,
      local: completo ? ((l.local_ou_ligacao as string | null) ?? undefined) : undefined,
      lat: completo ? (l.local_lat as number | null) : null,
      lng: completo ? (l.local_lng as number | null) : null,
      estado,
      // A hora da última alteração faz de número de versão. Sem isto, o
      // calendário que já viu o evento ignora a versão nova — e a consulta
      // fica lá à hora antiga depois de ter sido remarcada.
      sequencia: Math.floor(
        new Date((l.atualizado_em as string) ?? (l.criado_em as string)).getTime() / 1000,
      ),
      alarmeMin: a.alarme_min,
      criadoEm: l.criado_em ? new Date(l.criado_em as string) : undefined,
      atualizadoEm: l.atualizado_em ? new Date(l.atualizado_em as string) : undefined,
    };
  });

  // Que o registo do último acesso falhe não pode impedir a resposta: é
  // uma comodidade de diagnóstico, não parte do serviço.
  void sb
    .from("calendario_assinaturas")
    .update({ ultimo_acesso_em: agora.toISOString() })
    .eq("token", token)
    .then(undefined, () => {});

  return resposta(
    construirCalendario(
      eventos,
      {
        nome: a.papel === "contabilista"
          ? "Recibo Certo · Consultas"
          : "Recibo Certo · As minhas consultas",
        descricao: "Consultas marcadas pelo Recibo Certo.",
        atualizarACadaMin: RELER_A_CADA_MIN,
      },
      agora,
    ),
  );
}
