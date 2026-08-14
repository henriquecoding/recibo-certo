// ═══════════════════════════════════════════════════════════════════════
//  O CASO — a relação passa a ser mediada
//  ---------------------------------------------------------------------
//  Até aqui o cliente escolhia um contabilista e falavam livremente.
//  Passa a ser: descreve o caso, a plataforma intermedeia tudo o que é
//  dito, e o contabilista responde com uma proposta — sem nunca receber
//  os contactos.
//
//  A fronteira não é entre saber quem é a pessoa e não saber: o
//  contabilista recebe o NOME e o NIF, porque sem eles não faz o trabalho
//  nem orçamenta com seriedade. O que ele não recebe é o CANAL — email,
//  telefone, morada —, que é o que lhe permitiria continuar a conversa
//  fora daqui.
//
//  Nada neste ficheiro decide quem vê o quê. Essas decisões vivem todas na
//  migração 051, e é de propósito: a garantia não pode depender de um
//  `select` que alguém aqui se lembre de não escrever. Os contactos estão
//  numa tabela a que o contabilista não chega.
//
//  Ver `docs/ESTRATEGIA-INTERMEDIACAO.md`.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

export type AreaDoCaso =
  | "irs" | "iva" | "contabilidade_organizada" | "inicio_atividade"
  | "seguranca_social" | "empresa" | "herancas" | "outro";

export type UrgenciaDoCaso = "normal" | "prazo_proximo" | "urgente";

export type EstadoDoCaso =
  | "rascunho" | "submetido" | "em_triagem" | "encaminhado"
  | "com_proposta" | "aceite" | "recusado" | "fechado";

export type EstadoMensagem = "submetida" | "aprovada" | "devolvida" | "recusada";

export type EstadoProposta =
  | "enviada" | "lida" | "aceite" | "desconto_pedido"
  | "recusada" | "expirada" | "substituida";

/** As áreas, como a pessoa as lê. Nunca o valor da base de dados. */
export const AREAS: { id: AreaDoCaso; titulo: string; ajuda: string }[] = [
  { id: "irs", titulo: "IRS", ajuda: "Declaração anual, reembolsos, retenções." },
  { id: "iva", titulo: "IVA", ajuda: "Declarações periódicas, isenções, regularizações." },
  { id: "inicio_atividade", titulo: "Início de atividade", ajuda: "Abrir atividade, escolher CAE, primeiro ano." },
  { id: "seguranca_social", titulo: "Segurança Social", ajuda: "Escalões, isenções, trimestrais." },
  { id: "contabilidade_organizada", titulo: "Contabilidade organizada", ajuda: "Passar de simplificado, ou já lá estar." },
  { id: "empresa", titulo: "Empresa", ajuda: "Constituir sociedade, IRC, distribuição de lucros." },
  { id: "herancas", titulo: "Heranças", ajuda: "Partilhas, imposto do selo, imóveis." },
  { id: "outro", titulo: "Outra coisa", ajuda: "Descreve na tua situação." },
];

export const URGENCIAS: { id: UrgenciaDoCaso; titulo: string; ajuda: string }[] = [
  { id: "normal", titulo: "Sem pressa", ajuda: "Quero resolver, mas não há data à vista." },
  { id: "prazo_proximo", titulo: "Tenho um prazo", ajuda: "Há uma data a aproximar-se." },
  { id: "urgente", titulo: "Já estou em falta", ajuda: "O prazo passou, ou está a passar." },
];

/** O mínimo para que a descrição seja útil a quem a vai ler. */
export const SITUACAO_MIN = 20;
export const SITUACAO_MAX = 4000;

/**
 * Quantos contabilistas podem receber o mesmo caso.
 *
 * Está dito na interface por uma razão: um caso encaminhado para vários
 * não é a mesma lead vendida a vários — a diferença é que aqui a pessoa
 * sabe, escolhe entre propostas, e nenhum deles recebe dados pessoais.
 * Esconder o número tornaria a diferença invisível.
 */
export const TETO_DE_ENCAMINHAMENTOS = 3;

export interface Caso {
  id: string;
  referencia: string;
  /** O contabilista vê estes dois. São identificação, não canal. */
  nomeCompleto: string;
  nif: string;
  assunto: string;
  situacao: string;
  area: AreaDoCaso;
  urgencia: UrgenciaDoCaso;
  orcamentoCents: number | null;
  estado: EstadoDoCaso;
  notaTriagem: string | null;
  criadoEm: string;
  submetidoEm: string | null;
}

export interface MensagemDoCaso {
  id: string;
  casoId: string;
  autorId: string;
  autorPapel: "cliente" | "contabilista";
  corpo: string;
  corpoEncaminhado: string | null;
  estado: EstadoMensagem;
  notaRevisao: string | null;
  criadoEm: string;
}

export interface Proposta {
  id: string;
  casoId: string;
  contabilistaId: string;
  corpo: string;
  valorCents: number;
  ivaIncluido: boolean;
  prazoExecucao: string | null;
  validadeAte: string | null;
  estado: EstadoProposta;
  lidaAteAoFimEm: string | null;
  confirmacaoEm: string | null;
  decididaEm: string | null;
  motivo: string | null;
  criadoEm: string;
}

/**
 * O NIF encurtado, para listas.
 *
 * Não é uma proteção — quem abre o caso vê-o inteiro, e é suposto. É só
 * para uma lista de vinte casos não ser uma parede de números iguais.
 */
export function nifMascarado(nif: string): string {
  const limpo = nif.replace(/\D/g, "");
  if (limpo.length !== 9) return "•••••••••";
  return `••••••${limpo.slice(6)}`;
}

/** O dígito de controlo do NIF português. Um NIF mal escrito não passa daqui. */
export function nifValido(nif: string): boolean {
  const d = nif.replace(/\D/g, "");
  if (d.length !== 9) return false;
  // O primeiro dígito diz o tipo de contribuinte; zero não existe.
  if (d[0] === "0") return false;
  let soma = 0;
  for (let i = 0; i < 8; i++) soma += Number(d[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(d[8]);
}

/** Onde é que este caso está, dito a quem o submeteu. */
export function estadoDoCasoLegivel(estado: EstadoDoCaso): {
  titulo: string;
  explicacao: string;
} {
  switch (estado) {
    case "rascunho":
      return { titulo: "Por submeter", explicacao: "Ainda não enviaste este caso." };
    case "submetido":
      return { titulo: "Recebido", explicacao: "Vamos ler o que escreveste e encaminhar." };
    case "em_triagem":
      return { titulo: "Em análise", explicacao: "Estamos a ver quem é a pessoa certa para isto." };
    case "encaminhado":
      return {
        titulo: "Encaminhado",
        explicacao: "Já está com quem o vai analisar. Avisamos-te quando houver proposta.",
      };
    case "com_proposta":
      return { titulo: "Com proposta", explicacao: "Tens uma proposta à espera da tua decisão." };
    case "aceite":
      return { titulo: "Aceite", explicacao: "Aceitaste uma proposta. Já podem falar diretamente." };
    case "recusado":
      return { titulo: "Não seguiu", explicacao: "Este caso não avançou." };
    case "fechado":
      return { titulo: "Fechado", explicacao: "Este caso está encerrado." };
  }
}

/** «240,00 €» — o valor de uma proposta, como se lê. */
export function euros(cents: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })
    .format(cents / 100);
}

// ─── Escritas ──────────────────────────────────────────────────────────

export interface NovoCaso {
  assunto: string;
  situacao: string;
  area: AreaDoCaso;
  urgencia: UrgenciaDoCaso;
  nome: string;
  nif: string;
  email: string;
  telefone?: string;
  morada?: string;
  orcamentoCents?: number | null;
}

const MOTIVO: Record<string, string> = {
  nao_autenticado: "Entra na tua conta para submeteres um caso.",
  ja_tens_um_caso_aberto: "Já tens um caso aberto nesta área. Acompanha esse antes de abrires outro.",
  dados_invalidos: "Há um campo por preencher ou mal preenchido.",
  so_a_administracao: "Só a administração pode fazer isto.",
  contabilista_nao_aprovado: "Esse contabilista ainda não está aprovado.",
  ja_encaminhado: "Este caso já lhe foi encaminhado.",
  teto_atingido: `Um caso vai no máximo para ${TETO_DE_ENCAMINHAMENTOS} contabilistas.`,
  caso_nao_encaminhavel: "Este caso já não está em condições de ser encaminhado.",
  ja_revista: "Esta mensagem já tinha sido revista.",
  falta_a_razao: "Diz o que é preciso corrigir — devolver sem razão deixa a pessoa a adivinhar.",
  decisao_invalida: "Decisão desconhecida.",
  ainda_nao_leste_ate_ao_fim: "Chega ao fim do documento antes de confirmares.",
  ainda_nao_leste_e_confirmaste: "Lê até ao fim e confirma antes de decidires.",
  proposta_expirada: "Esta proposta já passou da validade.",
  nao_decidivel: "Esta proposta já não está por decidir.",
  nao_e_tua_ou_ja_decidida: "Esta proposta já não está por decidir.",
  falta_o_valor: "Diz que valor propões.",
};

const traduzir = (motivo?: string) => MOTIVO[motivo ?? ""] ?? "Não foi possível concluir.";

export async function submeterCaso(
  c: NovoCaso,
): Promise<{ erro?: string; id?: string; referencia?: string }> {
  // As mesmas perguntas que a base de dados faz, feitas cedo: poupam uma
  // ida e volta e dão resposta imediata a quem se enganou a escrever.
  if (!nifValido(c.nif)) return { erro: "Esse NIF não é válido. Confere os nove dígitos." };
  if (c.situacao.trim().length < SITUACAO_MIN) {
    return { erro: "Descreve a situação com um pouco mais de detalhe." };
  }

  const { data, error } = await getSupabase().rpc("submeter_caso", {
    p_assunto: c.assunto,
    p_situacao: c.situacao,
    p_area: c.area,
    p_urgencia: c.urgencia,
    p_nome: c.nome,
    p_nif: c.nif.replace(/\D/g, ""),
    p_email: c.email,
    p_telefone: c.telefone ?? null,
    p_morada: c.morada ?? null,
    p_orcamento: c.orcamentoCents ?? null,
  });
  if (error) return { erro: error.message };

  const r = (data ?? {}) as { ok?: boolean; motivo?: string; id?: string; referencia?: string };
  return r.ok ? { id: r.id, referencia: r.referencia } : { erro: traduzir(r.motivo) };
}

export async function submeterMensagem(
  casoId: string,
  autorId: string,
  papel: "cliente" | "contabilista",
  corpo: string,
): Promise<{ erro?: string }> {
  const texto = corpo.trim().slice(0, 4000);
  if (!texto) return { erro: "Escreve alguma coisa." };

  // A mensagem nasce `submetida` porque é o único estado que a política
  // deixa entrar — não porque este código o diga.
  const { error } = await getSupabase().from("caso_mensagens").insert({
    caso_id: casoId, autor_id: autorId, autor_papel: papel, corpo: texto,
  });
  return error ? { erro: error.message } : {};
}

export async function reverMensagem(
  mensagemId: string,
  decisao: "aprovar" | "devolver" | "recusar",
  nota?: string,
  redigido?: string,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("rever_mensagem", {
    p_mensagem: mensagemId,
    p_decisao: decisao,
    p_nota: nota ?? null,
    p_redigido: redigido ?? null,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

export async function encaminharCaso(
  casoId: string, contabilistaId: string,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("encaminhar_caso", {
    p_caso: casoId, p_contabilista: contabilistaId,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/** Chegou ao fim do documento. Chamada pelo observador de interseção. */
export async function marcarPropostaLida(id: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("marcar_proposta_lida", { p_proposta: id });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/** «Confirmo que li e compreendi.» */
export async function confirmarLeitura(id: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase()
    .rpc("confirmar_leitura_da_proposta", { p_proposta: id });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

export async function decidirProposta(
  id: string,
  decisao: "aceitar" | "recusar" | "pedir_desconto",
  motivo?: string,
  valorPedidoCents?: number,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("decidir_proposta", {
    p_proposta: id,
    p_decisao: decisao,
    p_motivo: motivo ?? null,
    p_valor_pedido: valorPedidoCents ?? null,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}
