// ═══════════════════════════════════════════════════════════════════════
//  AVISAR — notificação na app, e email quando faz sentido
//  ---------------------------------------------------------------------
//  `notificacoes` não tem INSERT pela API pública (migração 044), nem
//  sequer para a própria conta. Quem escreve é este módulo, com a chave de
//  serviço, depois de confirmar que quem pediu é parte do vínculo.
//
//  A razão é a de sempre: se o cliente pudesse inserir, o sino passava a
//  ser um canal de qualquer um para qualquer um — bastava saber um id.
//  Aqui, quem chama diz «fiz X no vínculo Y»; o destinatário e o texto são
//  escolhidos pelo servidor, a partir de um catálogo fechado.
//
//  O email é acessório e nunca bloqueia: sem `RESEND_API_KEY` a app fica
//  igual, com o sino a funcionar e sem nada a falhar.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/email/send";

export type TipoAviso =
  | "vinculo_pedido" | "vinculo_aceite" | "mensagem"
  | "consulta_pedida" | "consulta_confirmada" | "consulta_cancelada"
  | "partilha_recebida" | "cupao_ganho" | "candidatura_decidida";

interface Molde {
  titulo: (quem: string) => string;
  corpo?: (quem: string) => string;
  url: (ctx: { vinculoId?: string }) => string;
  /** `true` quando também vale um email. Nem tudo vale. */
  email: boolean;
  /** Para quem vai: a outra parte do vínculo, ou quem praticou o ato. */
  para: "outra_parte";
}

/**
 * O catálogo. Fechado de propósito: quem chama escolhe um tipo desta lista
 * e não escreve o texto. Um campo de texto livre vindo do cliente seria um
 * canal para lhe escrever o que se quisesse, com o nosso nome em cima.
 *
 * O que NÃO está aqui, e não vai estar: «alguém viu o teu perfil», «tens X
 * clientes novos este mês». Um sino que toca por tudo deixa de se ouvir.
 */
const MOLDES: Record<TipoAviso, Molde> = {
  vinculo_pedido: {
    titulo: (q) => `${q} quer ser teu cliente`,
    corpo: () => "Vê o pedido e decide se aceitas.",
    url: () => "/contabilista/clientes",
    email: true, para: "outra_parte",
  },
  vinculo_aceite: {
    titulo: (q) => `${q} aceitou o teu pedido`,
    corpo: () => "Já podes marcar consultas e enviar-lhe simulações.",
    url: () => "/dashboard/contabilista",
    email: true, para: "outra_parte",
  },
  mensagem: {
    titulo: (q) => `Mensagem de ${q}`,
    url: ({ vinculoId }) => (vinculoId ? `/contabilista/clientes/${vinculoId}` : "/contabilista/clientes"),
    // Sem email: uma conversa que manda um email por linha é uma conversa
    // que se abandona. O sino chega, e chega em tempo real.
    email: false, para: "outra_parte",
  },
  consulta_pedida: {
    titulo: (q) => `${q} pediu uma consulta`,
    corpo: () => "Confirma o horário para a marcação ficar fechada.",
    url: () => "/contabilista/agenda",
    email: true, para: "outra_parte",
  },
  consulta_confirmada: {
    titulo: (q) => `${q} confirmou a consulta`,
    corpo: () => "Vê a hora e o local na tua área.",
    url: () => "/dashboard/contabilista",
    email: true, para: "outra_parte",
  },
  consulta_cancelada: {
    titulo: (q) => `${q} cancelou uma consulta`,
    url: () => "/contabilista/agenda",
    email: true, para: "outra_parte",
  },
  partilha_recebida: {
    titulo: (q) => `${q} enviou-te uma simulação`,
    url: () => "/contabilista/partilhas",
    email: false, para: "outra_parte",
  },
  cupao_ganho: {
    titulo: () => "Completaste o cartão de fidelidade",
    corpo: () => "Tens um desconto à espera na tua área.",
    url: () => "/dashboard/contabilista",
    email: true, para: "outra_parte",
  },
  candidatura_decidida: {
    titulo: () => "Há novidades sobre a tua candidatura",
    url: () => "/contabilistas/candidatura",
    email: true, para: "outra_parte",
  },
};

export interface PedidoAviso {
  sb: SupabaseClient;
  tipo: TipoAviso;
  vinculoId: string;
  /** Quem praticou o ato. O aviso vai para a OUTRA parte. */
  autorId: string;
}

export interface ResultadoAviso {
  ok: boolean;
  motivo?: string;
}

/**
 * Avisa a outra parte de um vínculo.
 *
 * Confirma primeiro que `autorId` é mesmo parte do vínculo — sem isso, a
 * chave de serviço escrevia uma notificação em qualquer conta a partir de
 * um id adivinhado.
 */
export async function avisarOutraParte(p: PedidoAviso): Promise<ResultadoAviso> {
  const molde = MOLDES[p.tipo];
  if (!molde) return { ok: false, motivo: "tipo_desconhecido" };

  const { data: vinculo } = await p.sb
    .from("contabilista_vinculos")
    .select("id, contabilista_id, cliente_id, estado, nome_cliente, email_cliente")
    .eq("id", p.vinculoId)
    .maybeSingle();

  if (!vinculo) return { ok: false, motivo: "vinculo_inexistente" };

  const ehContabilista = vinculo.contabilista_id === p.autorId;
  const ehCliente = vinculo.cliente_id === p.autorId;
  if (!ehContabilista && !ehCliente) return { ok: false, motivo: "nao_e_parte" };

  // Um vínculo terminado não gera avisos: a relação acabou, e o sino do
  // outro lado não é sítio para lhe chegar seja o que for.
  if (vinculo.estado === "terminado") return { ok: false, motivo: "vinculo_terminado" };

  const destinatario = ehContabilista ? vinculo.cliente_id : vinculo.contabilista_id;

  // Como se chama quem praticou o ato, do ponto de vista de quem recebe.
  const { data: cc } = await p.sb
    .from("contabilistas").select("nome").eq("user_id", vinculo.contabilista_id).maybeSingle();

  const quem = ehContabilista
    ? ((cc?.nome as string) ?? "O teu contabilista")
    : ((vinculo.nome_cliente as string | null) ?? identificador(vinculo.cliente_id as string));

  const { error } = await p.sb.from("notificacoes").insert({
    user_id: destinatario,
    tipo: p.tipo,
    titulo: molde.titulo(quem).slice(0, 200),
    corpo: molde.corpo?.(quem).slice(0, 500) ?? null,
    url: molde.url({ vinculoId: p.vinculoId }),
  });

  if (error) {
    console.error("[avisar] notificação:", error.message);
    return { ok: false, motivo: "escrita_falhou" };
  }

  if (molde.email) void porEmail(p.sb, destinatario, molde.titulo(quem), molde.corpo?.(quem));
  return { ok: true };
}

function identificador(id: string): string {
  return `Cliente ${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * O email, quando há para onde o mandar.
 *
 * Não devolve erro nem espera: o aviso já está no sino, e falhar o envio de
 * um email não pode transformar uma operação bem-sucedida numa falha aos
 * olhos de quem a fez.
 */
async function porEmail(
  sb: SupabaseClient,
  destinatario: string,
  titulo: string,
  corpo?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { data } = await sb.auth.admin.getUserById(destinatario);
    const para = data?.user?.email;
    if (!para) return;

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.recibocerto.pt";
    const { emailAvisoPlataforma } = await import("@/lib/email/templates");
    const { subject, html } = emailAvisoPlataforma(titulo, corpo, `${site}/dashboard/contabilista`);
    await enviarEmail({ to: para, subject, html });
  } catch (e) {
    console.error("[avisar] email:", (e as Error).message);
  }
}
