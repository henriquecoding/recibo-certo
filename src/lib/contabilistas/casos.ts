// ═══════════════════════════════════════════════════════════════════════
//  O CASO — descrever uma vez, escolher a quem enviar
//  ---------------------------------------------------------------------
//  Em vez de olhar para uma lista de pessoas e adivinhar qual serve, o
//  cliente descreve o que precisa e escolhe até três contabilistas
//  certificados para o receberem.
//
//  ⚠️ ESTE CABEÇALHO DIZIA O CONTRÁRIO DO QUE O CÓDIGO FAZ.
//
//  Descrevia a mediação: «a plataforma intermedeia tudo o que é dito» e o
//  contabilista responde «sem nunca receber os contactos». Isso acabou em
//  `20260818210000_fim_da_mediacao` — as mensagens nascem entregues,
//  ninguém as lê por nós, e a ficha de contactos pode chegar ao outro
//  lado. Um comentário desatualizado sobre uma fronteira de privacidade é
//  mais perigoso do que nenhum: quem o lê acredita e escreve código em
//  cima de uma garantia que já não existe.
//
//  O que é verdade hoje, e onde é imposto:
//
//   · NOME e NIF seguem sempre com o caso. São identificação, não canal:
//     sem eles não se faz o trabalho nem se orçamenta com seriedade.
//   · A FICHA DE CONTACTOS (email, telefone, morada) só segue se o cliente
//     escolher partilhá-la. Nasce desligada desde `20260820092000`, e
//     liga-se e desliga-se com efeito imediato — a política de
//     `caso_contactos` lê a coluna, não uma cópia dela.
//   · Um contacto ESCRITO À MÃO numa mensagem segue. É uma decisão de quem
//     escreve, no momento em que escreve, e não é papel nosso desfazê-la.
//
//  Nada neste ficheiro decide quem vê o quê. Essas decisões vivem nas
//  migrações 051 e 20260818210000, e é de propósito: a garantia não pode
//  depender de um `select` que alguém aqui se lembre de não escrever.
//
//  Ver `docs/CONTRATO-DE-PRIVACIDADE.md`.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

export type AreaDoCaso =
  | "irs" | "iva" | "contabilidade_organizada" | "inicio_atividade"
  | "seguranca_social" | "empresa" | "herancas" | "outro";

export type UrgenciaDoCaso = "normal" | "prazo_proximo" | "urgente";

export type EstadoDoCaso =
  | "rascunho" | "submetido" | "em_triagem" | "encaminhado"
  | "com_proposta" | "aceite" | "recusado" | "fechado";

/**
 * O estado de uma mensagem.
 *
 * `entregue` é o único que nasce. Os outros quatro são história: existiram
 * enquanto a plataforma leu o que era escrito, e ficam no tipo porque as
 * linhas antigas ficaram na tabela. Ver `20260818210000_fim_da_mediacao`.
 */
export type EstadoMensagem =
  | "entregue" | "submetida" | "aprovada" | "devolvida" | "recusada";

/** O que o outro lado consegue ler. Hoje: tudo o que foi enviado. */
export function mensagemVisivel(estado: EstadoMensagem): boolean {
  return estado === "entregue" || estado === "aprovada" || estado === "submetida";
}

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
  /** Enquanto for verdadeiro, os contabilistas do caso veem os contactos. */
  partilhaContactos: boolean;
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
  denunciadaEm: string | null;
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
  /**
   * Quando o cliente chegou ao fim do CONTRATO anexo.
   *
   * Nulo em propostas sem contrato — e aí não é exigido. Onde há
   * documento, o texto da proposta é o resumo e isto é o que fica a
   * valer: `decidir_proposta` recusa enquanto for nulo (migração
   * `20260816090000`).
   */
  contratoLidoEm: string | null;
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
      return {
        titulo: "Por enviar",
        explicacao: "Está escrito, mas ainda não seguiu para ninguém. Escolhe quem o vai ver.",
      };
    case "em_triagem":
      // Estado herdado da triagem que deixou de existir. Nenhum caso novo
      // lá entra; os antigos que lá ficaram leem-se como o que são.
      return {
        titulo: "Por enviar",
        explicacao: "Está escrito, mas ainda não seguiu para ninguém. Escolhe quem o vai ver.",
      };
    case "encaminhado":
      return {
        titulo: "Com quem escolheste",
        explicacao: "Já está com quem o vai analisar. Avisamos-te quando houver proposta.",
      };
    case "com_proposta":
      return { titulo: "Com proposta", explicacao: "Tens uma proposta à espera da tua decisão." };
    case "aceite":
      return { titulo: "Aceite", explicacao: "Aceitaste uma proposta. Podem marcar a consulta." };
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
  /**
   * Se a ficha estruturada de contactos acompanha o caso.
   *
   * Omitir é NÃO partilhar. A coluna nasce falsa desde
   * `20260820092000`, e este campo só existe para o formulário poder
   * dizer «sim» — nunca para poder dizer «não», que é o estado inicial.
   */
  partilharContactos?: boolean;
}

const MOTIVO: Record<string, string> = {
  nao_autenticado: "Entra na tua conta para submeteres um caso.",
  ja_tens_um_caso_aberto: "Já tens um caso aberto nesta área. Acompanha esse antes de abrires outro.",
  dados_invalidos: "Há um campo por preencher ou mal preenchido.",
  so_a_administracao: "Só a administração pode fazer isto.",
  nao_e_teu: "Este caso não é teu.",
  nao_estas_no_caso: "Só quem está no caso pode denunciar uma mensagem.",
  nao_denuncias_o_que_escreveste: "Não podes denunciar uma mensagem que escreveste.",
  mensagem_nao_encontrada: "Essa mensagem já não existe.",
  caso_nao_encontrado: "Esse caso já não existe.",
  contabilista_nao_aprovado: "Esse contabilista ainda não está aprovado.",
  ja_encaminhado: "Este caso já lhe foi encaminhado.",
  teto_atingido: `Um caso vai no máximo para ${TETO_DE_ENCAMINHAMENTOS} contabilistas.`,
  caso_nao_encaminhavel: "Este caso já não está em condições de ser encaminhado.",
  ainda_nao_leste_ate_ao_fim: "Chega ao fim do documento antes de confirmares.",
  ainda_nao_leste_e_confirmaste: "Lê até ao fim e confirma antes de decidires.",
  contrato_por_ler: "Abre o contrato em anexo e lê-o até ao fim antes de decidires.",
  sem_contrato: "Esta proposta não traz contrato em anexo.",
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
  if (!r.ok) return { erro: traduzir(r.motivo) };

  // ⚠️ Uma segunda chamada, e não um parâmetro de `submeter_caso`.
  //
  // A partilha nasce desligada na coluna. Ligá-la é um ato à parte, e
  // fica assim de propósito: passa pela MESMA função que o interruptor do
  // detalhe do caso usa, o que significa que há um só caminho para este
  // valor mudar — e um só sítio onde a autorização é verificada.
  //
  // Se esta chamada falhar, o caso fica criado e sem partilha. É a falha
  // certa: o caso não se perde, e o estado em que fica é o mais fechado
  // dos dois.
  if (c.partilharContactos && r.id) await definirPartilhaDeContactos(r.id, true);
  return { id: r.id, referencia: r.referencia };
}

/**
 * Envia uma mensagem. Chega ao outro lado no instante em que entra.
 *
 * Chamava-se `submeterMensagem` porque havia a quem submeter. Não há: a
 * política da migração `20260818210000` só aceita `entregue`, e o nome
 * antigo prometia uma fila que deixou de existir.
 */
export async function enviarMensagemDoCaso(
  casoId: string,
  autorId: string,
  papel: "cliente" | "contabilista",
  corpo: string,
): Promise<{ erro?: string }> {
  const texto = corpo.trim().slice(0, 4000);
  if (!texto) return { erro: "Escreve alguma coisa." };

  const { error } = await getSupabase().from("caso_mensagens").insert({
    caso_id: casoId, autor_id: autorId, autor_papel: papel,
    corpo: texto, estado: "entregue",
  });
  return error ? { erro: error.message } : {};
}

/**
 * Entrega o caso a um contabilista escolhido por quem o descreveu.
 *
 * Substitui `encaminharCaso`, que só a administração podia chamar. A
 * diferença não é de permissões: é que já ninguém tem de ler o caso para
 * decidir para onde ele vai.
 */
export async function enviarCasoAContabilista(
  casoId: string, contabilistaId: string,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("enviar_caso_a_contabilista", {
    p_caso: casoId, p_contabilista: contabilistaId,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/**
 * Liga ou desliga a partilha dos contactos com os contabilistas do caso.
 *
 * O efeito é imediato e vive na política, não numa cópia do valor: assim
 * que isto devolve, o contabilista deixa de alcançar a linha.
 */
export async function definirPartilhaDeContactos(
  casoId: string, partilhar: boolean,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("definir_partilha_de_contactos", {
    p_caso: casoId, p_partilhar: partilhar,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/**
 * Entrega UMA mensagem à administração, por decisão de quem a recebeu.
 *
 * É o único caminho que existe: sem isto, um `select` de administrador
 * sobre `caso_mensagens` devolve zero linhas. Denunciar o que a própria
 * pessoa escreveu é recusado — seria uma forma de entregar à
 * administração o que ela não pode ler.
 */
export async function denunciarMensagem(
  mensagemId: string, motivo: string,
): Promise<{ erro?: string }> {
  const texto = motivo.trim().slice(0, 1000);
  if (!texto) return { erro: "Diz o que se passa — sem isso não há o que analisar." };

  const { data, error } = await getSupabase().rpc("denunciar_mensagem", {
    p_mensagem: mensagemId, p_motivo: texto,
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

/**
 * Chegou ao fim do CONTRATO anexo.
 *
 * O leitor de documentos chama isto quando a última página é alcançada —
 * a rolar ou por teclado. Sem esta marca, `confirmar_leitura` e
 * `decidir_proposta` recusam em propostas que tragam contrato.
 */
export async function marcarContratoLido(id: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("marcar_contrato_lido", { p_proposta: id });
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

// ─── Leituras ──────────────────────────────────────────────────────────
//
// Nenhuma destas funções filtra por quem está a ver. Não é esquecimento:
// é a RLS da migração 051 que decide, e repetir a decisão aqui criaria um
// segundo sítio onde ela poderia divergir — e o segundo sítio é sempre o
// que fica desatualizado.

interface Linha { [k: string]: unknown }

const paraCaso = (l: Linha): Caso => ({
  id: l.id as string,
  referencia: l.referencia as string,
  nomeCompleto: l.nome_completo as string,
  nif: l.nif as string,
  assunto: l.assunto as string,
  situacao: l.situacao as string,
  area: l.area as AreaDoCaso,
  urgencia: l.urgencia as UrgenciaDoCaso,
  orcamentoCents: (l.orcamento_cents as number | null) ?? null,
  estado: l.estado as EstadoDoCaso,
  notaTriagem: (l.nota_triagem as string | null) ?? null,
  // Os casos antigos não têm a coluna; para esses, a partilha está
  // ligada — é o que a migração escreveu como omissão.
  // O `??` responde a «a coluna não veio nesta consulta», e a resposta
  // segura é NÃO PARTILHAR. Estava `?? true`: uma consulta que se
  // esquecesse da coluna desenhava o interruptor ligado sobre um caso
  // que não estava a partilhar nada.
  partilhaContactos: (l.partilha_contactos as boolean | null) ?? false,
  criadoEm: l.criado_em as string,
  submetidoEm: (l.submetido_em as string | null) ?? null,
});

const paraMensagem = (l: Linha): MensagemDoCaso => ({
  id: l.id as string,
  casoId: l.caso_id as string,
  autorId: l.autor_id as string,
  autorPapel: l.autor_papel as "cliente" | "contabilista",
  corpo: l.corpo as string,
  corpoEncaminhado: (l.corpo_encaminhado as string | null) ?? null,
  estado: l.estado as EstadoMensagem,
  notaRevisao: (l.nota_revisao as string | null) ?? null,
  denunciadaEm: (l.denunciada_em as string | null) ?? null,
  criadoEm: l.criado_em as string,
});

const paraProposta = (l: Linha): Proposta => ({
  id: l.id as string,
  casoId: l.caso_id as string,
  contabilistaId: l.contabilista_id as string,
  corpo: l.corpo as string,
  valorCents: l.valor_cents as number,
  ivaIncluido: l.iva_incluido as boolean,
  prazoExecucao: (l.prazo_execucao as string | null) ?? null,
  validadeAte: (l.validade_ate as string | null) ?? null,
  estado: l.estado as EstadoProposta,
  lidaAteAoFimEm: (l.lida_ate_ao_fim_em as string | null) ?? null,
  contratoLidoEm: (l.contrato_lido_em as string | null) ?? null,
  confirmacaoEm: (l.confirmacao_em as string | null) ?? null,
  decididaEm: (l.decidida_em as string | null) ?? null,
  motivo: (l.motivo as string | null) ?? null,
  criadoEm: l.criado_em as string,
});

export async function listarCasos(): Promise<Caso[]> {
  const { data } = await getSupabase()
    .from("casos").select("*").order("criado_em", { ascending: false }).limit(50);
  return ((data ?? []) as unknown as Linha[]).map(paraCaso);
}

export async function obterCaso(id: string): Promise<Caso | null> {
  const { data } = await getSupabase()
    .from("casos").select("*").eq("id", id).maybeSingle();
  return data ? paraCaso(data as unknown as Linha) : null;
}

/** Os contactos. Só o próprio e a administração leem — o resto vê zero linhas. */
export async function obterContactos(casoId: string): Promise<{
  email: string; telefone: string | null; morada: string | null;
} | null> {
  const { data } = await getSupabase()
    .from("caso_contactos").select("email, telefone, morada")
    .eq("caso_id", casoId).maybeSingle();
  if (!data) return null;
  const l = data as unknown as Linha;
  return {
    email: l.email as string,
    telefone: (l.telefone as string | null) ?? null,
    morada: (l.morada as string | null) ?? null,
  };
}

export async function listarMensagensDoCaso(casoId: string): Promise<MensagemDoCaso[]> {
  const { data } = await getSupabase()
    .from("caso_mensagens").select("*").eq("caso_id", casoId).order("criado_em");
  return ((data ?? []) as unknown as Linha[]).map(paraMensagem);
}

export async function listarPropostas(casoId: string): Promise<Proposta[]> {
  const { data } = await getSupabase()
    .from("propostas").select("*").eq("caso_id", casoId)
    .order("criado_em", { ascending: false });
  return ((data ?? []) as unknown as Linha[]).map(paraProposta);
}

/** A quem o caso já foi entregue, e em que pé está cada convite. */
export interface EncaminhamentoDoCaso {
  contabilistaId: string;
  estado: "convidado" | "aceite" | "recusado" | "retirado";
  encaminhadoEm: string;
}

export async function listarEncaminhamentos(casoId: string): Promise<EncaminhamentoDoCaso[]> {
  const { data } = await getSupabase()
    .from("caso_encaminhamentos")
    .select("contabilista_id, estado, encaminhado_em")
    .eq("caso_id", casoId)
    .order("encaminhado_em");
  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    contabilistaId: l.contabilista_id as string,
    estado: l.estado as EncaminhamentoDoCaso["estado"],
    encaminhadoEm: l.encaminhado_em as string,
  }));
}

/**
 * Os casos que ainda não foram entregues a ninguém.
 *
 * Deixou de ser uma fila de trabalho: ninguém tem de os ler para decidir
 * para onde vão. Serve para a administração saber que existem pedidos
 * parados — e o que se lê aqui é a área e a data, não a situação.
 */
export async function casosPorEntregar(): Promise<Caso[]> {
  const { data } = await getSupabase()
    .from("casos").select("*")
    .in("estado", ["submetido", "em_triagem"])
    .order("criado_em").limit(100);
  return ((data ?? []) as unknown as Linha[]).map(paraCaso);
}

/** Uma mensagem entregue à administração, e o que quem a entregou disse. */
export interface MensagemDenunciada {
  id: string;
  casoId: string;
  referencia: string;
  autorPapel: "cliente" | "contabilista";
  corpo: string;
  criadoEm: string;
  denunciadaEm: string;
  denunciaMotivo: string | null;
}

/**
 * O que a administração pode ler de `caso_mensagens`: só o que alguém de
 * dentro lhe entregou. Sem denúncias, isto devolve uma lista vazia — e
 * não por filtro, mas porque a política não deixa passar mais nada.
 */
export async function filaDeDenuncias(): Promise<MensagemDenunciada[]> {
  const { data } = await getSupabase()
    .from("caso_mensagens_denunciadas")
    .select("*")
    .order("denunciada_em", { ascending: false }).limit(100);
  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    id: l.id as string,
    casoId: l.caso_id as string,
    referencia: (l.referencia as string | null) ?? "—",
    autorPapel: l.autor_papel as "cliente" | "contabilista",
    corpo: l.corpo as string,
    criadoEm: l.criado_em as string,
    denunciadaEm: l.denunciada_em as string,
    denunciaMotivo: (l.denuncia_motivo as string | null) ?? null,
  }));
}

export interface NovaProposta {
  casoId: string;
  contabilistaId: string;
  corpo: string;
  valorCents: number;
  ivaIncluido: boolean;
  prazoExecucao?: string;
  validadeAte?: string;
}

/**
 * Cria a proposta e devolve o id.
 *
 * O id não é um extra: os anexos penduram-se numa proposta que já existe,
 * e sem ele o contrato ficaria sem onde ir. A ordem é esta de propósito —
 * primeiro a proposta, depois os ficheiros — porque uma proposta sem
 * anexo é uma proposta legítima, e um anexo sem proposta é lixo.
 */
export async function enviarProposta(p: NovaProposta): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().from("propostas").insert({
    caso_id: p.casoId,
    contabilista_id: p.contabilistaId,
    corpo: p.corpo.trim(),
    valor_cents: Math.max(0, Math.round(p.valorCents)),
    iva_incluido: p.ivaIncluido,
    prazo_execucao: p.prazoExecucao?.trim() || null,
    validade_ate: p.validadeAte || null,
  }).select("id").single();

  if (error) return { erro: error.message };
  return { id: (data as { id: string } | null)?.id };
}

// ─── Anexos ────────────────────────────────────────────────────────────

export interface DocumentoDoCaso {
  id: string;
  caminho: string;
  nome: string;
  bytes: number;
  tipoMime: string;
  libertadoEm: string | null;
  criadoEm: string;
}

export interface AnexoDaProposta {
  id: string;
  caminho: string;
  nome: string;
  bytes: number;
  tipoMime: string;
  eContrato: boolean;
}

export async function listarDocumentosDoCaso(casoId: string): Promise<DocumentoDoCaso[]> {
  const { data } = await getSupabase()
    .from("caso_documentos").select("*").eq("caso_id", casoId).order("criado_em");
  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    id: l.id as string,
    caminho: l.caminho as string,
    nome: l.nome as string,
    bytes: l.bytes as number,
    tipoMime: l.tipo_mime as string,
    libertadoEm: (l.libertado_em as string | null) ?? null,
    criadoEm: l.criado_em as string,
  }));
}

export async function listarAnexosDaProposta(propostaId: string): Promise<AnexoDaProposta[]> {
  const { data } = await getSupabase()
    .from("proposta_anexos").select("*").eq("proposta_id", propostaId).order("criado_em");
  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    id: l.id as string,
    caminho: l.caminho as string,
    nome: l.nome as string,
    bytes: l.bytes as number,
    tipoMime: l.tipo_mime as string,
    eContrato: l.e_contrato as boolean,
  }));
}

/**
 * Retira — ou repõe — um documento que o cliente anexou ao caso.
 *
 * Substitui `libertarDocumento`, que fazia o contrário: um documento
 * nascia invisível e a administração decidia se seguia. Agora nasce
 * entregue, e quem muda de ideias é quem o anexou.
 *
 * Não apaga o ficheiro. Fecha o acesso, que é o que quem retira quer —
 * apagar de vez é o que faz a purga de anexos.
 */
export async function retirarDocumentoDoCaso(
  id: string, retirar: boolean,
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase()
    .rpc("retirar_documento_do_caso", { p_documento: id, p_retirar: retirar });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  return r.ok ? {} : { erro: traduzir(r.motivo) };
}

/**
 * Envia um ficheiro para um caso ou para uma proposta.
 *
 * O browser não escolhe o caminho nem escreve a linha: pede uma vaga, põe
 * o ficheiro onde ela diz, e o servidor olha para os primeiros bytes antes
 * de registar seja o que for. É o mesmo caminho dos anexos da conversa,
 * porque ter dois seria ter um deles mais fraco.
 */
export async function enviarFicheiro(
  contexto: "caso" | "proposta",
  alvo: string,
  ficheiro: File,
  opcoes?: { eContrato?: boolean },
): Promise<{ erro?: string }> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { erro: "A sessão expirou. Entra outra vez." };
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    const vaga = await fetch("/api/contabilistas/anexo", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        contexto, alvo, tipoMime: ficheiro.type, bytes: ficheiro.size,
      }),
    });
    const d = (await vaga.json()) as
      { erro?: string; vagaId?: string; caminho?: string; token?: string };
    if (!vaga.ok || !d.caminho || !d.token) return { erro: d.erro ?? "Envio recusado." };

    const { error } = await sb.storage
      .from("contabilista-anexos")
      .uploadToSignedUrl(d.caminho, d.token, ficheiro, { contentType: ficheiro.type });
    if (error) return { erro: error.message };

    const fecho = await fetch("/api/contabilistas/anexo", {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({
        vagaId: d.vagaId, nome: ficheiro.name, eContrato: opcoes?.eContrato === true,
      }),
    });
    if (!fecho.ok) {
      const e = (await fecho.json()) as { erro?: string };
      return { erro: e.erro ?? "O ficheiro não foi aceite." };
    }
    return {};
  } catch {
    return { erro: "Falha de rede. Tenta outra vez." };
  }
}

/** Traz o ficheiro para o aparelho, com a autorização confirmada na hora. */
export async function urlDoFicheiro(caminho: string): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch("/api/contabilistas/descarregar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ caminho }),
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

// ─── Tempo real ────────────────────────────────────────────────────────

/**
 * Escuta o que muda num caso.
 *
 * Numa conversa com revisão pelo meio, não ver a mudança é pior do que num
 * chat: a pessoa fica sem saber se a mensagem foi aprovada, e recarrega à
 * espera de uma resposta que já lá está.
 *
 * Devolve a função de cancelamento. Quem chama TEM de a usar na limpeza do
 * efeito — um canal por montagem que nunca fecha esgota as ligações
 * simultâneas do plano, e o sintoma aparece longe da causa.
 */
export function escutarCaso(casoId: string, aoMudar: () => void): () => void {
  const sb = getSupabase();
  const canal = sb
    .channel(`caso:${casoId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "caso_mensagens", filter: `caso_id=eq.${casoId}` },
      () => aoMudar())
    .on("postgres_changes",
      { event: "*", schema: "public", table: "propostas", filter: `caso_id=eq.${casoId}` },
      () => aoMudar())
    .subscribe();

  return () => { void sb.removeChannel(canal); };
}
