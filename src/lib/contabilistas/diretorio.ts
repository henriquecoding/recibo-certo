// ═══════════════════════════════════════════════════════════════════════
//  DIRETÓRIO PÚBLICO — o que o cartão mostra, e o que a query traz
//  ---------------------------------------------------------------------
//  O diretório lia `select("*")` sobre a view pública, trazia até 200
//  fichas inteiras e filtrava-as no browser com `.filter()`. Funciona
//  enquanto forem doze contabilistas; deixa de funcionar antes de ser
//  visível que deixou. E enquanto durava, mandava para o browser a bio
//  inteira, o preço e o email de toda a gente para desenhar quatro linhas
//  de cartão.
//
//  Este ficheiro é a resposta a isso, em três decisões:
//
//   1. **O cartão tem contrato próprio.** `CartaoDoDiretorio` é menor do
//      que `Contabilista` de propósito (§156): o cartão resume, o perfil
//      decide. O que o cartão não mostra não viaja.
//
//   2. **Filtrar é trabalho da base de dados.** Distrito, área, modalidade,
//      idioma, vagas e confiança entram na consulta; a página pede uma
//      página de resultados e não a lista toda.
//
//   3. **A fronteira continua a ser a view.** `contabilistas_publico` diz
//      as colunas uma a uma e só devolve aprovados; aqui pedimos ainda
//      menos do que ela oferece. A tabela `contabilistas` não é lida por
//      nada nesta página — nem por engano, nem por conveniência.
//
//  As funções puras no fim (estado da OCC, localização, modalidades, o
//  parse do endereço) não sabem o que é React nem o que é Supabase: são
//  as regras de apresentação que o cartão e o perfil têm de partilhar
//  para não contarem duas histórias diferentes da mesma ficha (§50).
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import { avatarLinkedInExpirou } from "./linkedin";
import { DISTRITOS, ESPECIALIDADES } from "./catalogo";
import { copyResposta, IDIOMAS } from "./perfil";
import type { Modalidade } from "./tipos";

export type Linha = Record<string, unknown>;

/** O contrato público. Nunca a tabela — ver a migração 20260815200000. */
const VISTA_PUBLICA = "contabilistas_publico";

/**
 * As colunas que o cartão precisa, ditas uma a uma (§28).
 *
 * A view já é a fronteira de segurança; esta lista é a fronteira de
 * apresentação. Não traz bio, preço, email, website nem anos de
 * experiência: nada disso cabe num cartão, e o que não cabe não deve
 * atravessar a rede vinte e quatro vezes por página.
 *
 * `linkedin_avatar_url` é a única exceção a «só o que se mostra», e não
 * chega a sair deste módulo: serve para responder sim/não à pergunta
 * «há fotografia?» e é descartada em `paraCartao`. A fotografia em si
 * continua a ser servida pelo proxy do Recibo Certo (§8).
 */
export const CAMPOS_DO_CARTAO =
  "user_id,slug,nome,occ,occ_verificado,titulo_profissional,apresentacao_curta," +
  "distrito,concelho,especialidades,modalidades,idiomas,resposta_media_horas," +
  "linkedin_ligado,linkedin_avatar_url,aceita_novos_clientes,fidelidade_ativa," +
  "recebe_pagamentos";

/** Quantos cartões por página. §33: nunca centenas no DOM. */
export const POR_PAGINA = 24;

/** Teto de segurança para o `pagina=` do endereço — ver `parseFiltro`. */
const PAGINA_MAXIMA = 40;

/**
 * O que um cartão do diretório sabe sobre um contabilista.
 *
 * Deliberadamente sem telefone, sem preço, sem progressão e sem comissão:
 * uns porque não são públicos, outros porque não são resumo.
 */
export interface CartaoDoDiretorio {
  userId: string;
  slug: string;
  nome: string;
  /** Declarado pelo próprio. Não é uma credencial verificada (§40). */
  tituloProfissional: string | null;
  apresentacaoCurta: string | null;
  occ: string | null;
  /** Facto administrativo. Só a administração o escreve (§7). */
  occVerificado: boolean;
  distrito: string | null;
  concelho: string | null;
  especialidades: string[];
  modalidades: Modalidade[];
  idiomas: string[];
  /** Compromisso declarado, nunca uma medição (§12). */
  respostaMediaHoras: number | null;
  aceitaNovosClientes: boolean;
  linkedinLigado: boolean;
  /** Há fotografia utilizável? A URL fica no servidor (§8, §86). */
  avatarDisponivel: boolean;
  fidelidadeAtiva: boolean;
  /** Se o cliente consegue pagar-lhe aqui. Ver `Contabilista.recebePagamentos`. */
  recebePagamentos: boolean;
}

export type ModalidadeFiltro = "" | "online" | "presencial" | "ambos";
export type OrdemDoDiretorio = "disponibilidade" | "nome";

/**
 * O estado da procura — o mesmo objeto que o endereço representa.
 *
 * Não há um só campo que valha a pena esconder do URL: quem procura um
 * contabilista de IRS em Setúbal deve poder enviar esse link a alguém.
 */
export interface FiltroDiretorio {
  procura: string;
  distrito: string;
  especialidade: string;
  modalidade: ModalidadeFiltro;
  idioma: string;
  soAceitaNovos: boolean;
  /** Só perfis com número de OCC confirmado pela administração. */
  soOccVerificada: boolean;
  soLinkedIn: boolean;
  ordem: OrdemDoDiretorio;
  pagina: number;
}

export const FILTRO_VAZIO: FiltroDiretorio = {
  procura: "",
  distrito: "",
  especialidade: "",
  modalidade: "",
  idioma: "",
  soAceitaNovos: false,
  soOccVerificada: false,
  soLinkedIn: false,
  ordem: "disponibilidade",
  pagina: 1,
};

export interface PaginaDoDiretorio {
  cartoes: CartaoDoDiretorio[];
  /** Total que corresponde aos filtros, não o que veio nesta página. */
  total: number;
  temMais: boolean;
}

// ─── Leitura ───────────────────────────────────────────────────────────

/**
 * Uma linha da view pública, na forma que o cartão consome.
 *
 * Exportada porque o motor de afinidade lê a MESMA view com um punhado de
 * colunas a mais (`perfil_termos`, `cobertura`) e não pode ter uma segunda
 * leitura da mesma ficha — duas leituras acabam sempre por divergir numa
 * coluna, e o cartão do diretório e o cartão do fim de uma ferramenta
 * passariam a contar histórias diferentes da mesma pessoa (§50).
 */
export function paraCartao(l: Linha): CartaoDoDiretorio {
  const avatar = (l.linkedin_avatar_url as string | null) ?? null;

  return {
    userId: l.user_id as string,
    slug: l.slug as string,
    nome: (l.nome as string) ?? "",
    tituloProfissional: (l.titulo_profissional as string | null) ?? null,
    apresentacaoCurta: (l.apresentacao_curta as string | null) ?? null,
    occ: (l.occ as string | null) ?? null,
    occVerificado: Boolean(l.occ_verificado),
    distrito: (l.distrito as string | null) ?? null,
    concelho: (l.concelho as string | null) ?? null,
    especialidades: (l.especialidades as string[]) ?? [],
    modalidades: ((l.modalidades as string[]) ?? []) as Modalidade[],
    idiomas: (l.idiomas as string[]) ?? [],
    respostaMediaHoras: (l.resposta_media_horas as number | null) ?? null,
    aceitaNovosClientes: Boolean(l.aceita_novos_clientes),
    linkedinLigado: Boolean(l.linkedin_ligado),
    // A URL assinada morre aqui: o cartão leva um sim/não, e o `src` da
    // imagem é sempre o endpoint do Recibo Certo.
    avatarDisponivel: Boolean(avatar) && !avatarLinkedInExpirou(avatar),
    fidelidadeAtiva: Boolean(l.fidelidade_ativa),
    recebePagamentos: Boolean(l.recebe_pagamentos),
  };
}

/**
 * O texto que a pessoa escreveu, sem os caracteres que o PostgREST lê
 * como sintaxe.
 *
 * O `.or()` separa condições por vírgula e delimita por parênteses, e o
 * `ilike` usa `%` e `*` como jóquer. Nada disto chega a ser injeção — a
 * query é parametrizada —, mas um parêntese a meio de uma procura dá um
 * erro 400 em vez de zero resultados, e isso já é um bug.
 */
function limparProcura(valor: string): string {
  return valor.trim().replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * Lê uma página do diretório.
 *
 * `desdeOInicio` distingue os dois momentos em que se pede dados: mudar
 * de filtro (traz da primeira página até à atual, numa consulta só, para
 * que abrir `?pagina=3` restaure mesmo o que a pessoa via) e carregar
 * mais (traz só o troço novo). Em nenhum dos casos há uma consulta por
 * cartão — nem para o LinkedIn, nem para a agenda (§10, §172).
 */
export async function lerDiretorio(
  f: FiltroDiretorio,
  { desdeOInicio = true }: { desdeOInicio?: boolean } = {},
): Promise<PaginaDoDiretorio> {
  const pagina = Math.min(Math.max(1, Math.floor(f.pagina) || 1), PAGINA_MAXIMA);

  let q = getSupabase()
    .from(VISTA_PUBLICA)
    .select(CAMPOS_DO_CARTAO, { count: "exact" });

  if (f.distrito) q = q.eq("distrito", f.distrito);
  if (f.especialidade) q = q.contains("especialidades", [f.especialidade]);
  if (f.idioma) q = q.contains("idiomas", [f.idioma]);
  if (f.soAceitaNovos) q = q.eq("aceita_novos_clientes", true);
  if (f.soOccVerificada) q = q.eq("occ_verificado", true);
  if (f.soLinkedIn) q = q.eq("linkedin_ligado", true);

  if (f.modalidade === "ambos") q = q.contains("modalidades", ["online", "presencial"]);
  else if (f.modalidade) q = q.contains("modalidades", [f.modalidade]);

  const procura = limparProcura(f.procura);
  if (procura) {
    q = q.or(
      [
        `nome.ilike.%${procura}%`,
        `concelho.ilike.%${procura}%`,
        `distrito.ilike.%${procura}%`,
        `titulo_profissional.ilike.%${procura}%`,
        `apresentacao_curta.ilike.%${procura}%`,
      ].join(","),
    );
  }

  // A ordem é explicável em voz alta e não depende de nada comercial
  // (§35, §150): quem tem vagas aparece primeiro, e dentro disso é
  // alfabético. Nenhum patamar, nenhuma comissão, nenhum destaque pago.
  q = f.ordem === "nome"
    ? q.order("nome", { ascending: true })
    : q.order("aceita_novos_clientes", { ascending: false }).order("nome", { ascending: true });

  const de = desdeOInicio ? 0 : (pagina - 1) * POR_PAGINA;
  const ate = pagina * POR_PAGINA - 1;

  const { data, error, count } = await q.range(de, ate);
  if (error) throw new Error(error.message);

  const cartoes = (data ?? []).map((l) => paraCartao(l as unknown as Linha));
  const total = count ?? cartoes.length;

  return { cartoes, total, temMais: pagina * POR_PAGINA < total };
}

// ─── Estado na barra de endereço ───────────────────────────────────────

/**
 * Os nomes dos parâmetros, num sítio só.
 *
 * Mudar um destes muda links que já foram partilhados — por isso estão
 * aqui, à vista, e não espalhados por seis componentes.
 */
export const PARAMS = {
  procura: "q",
  distrito: "distrito",
  especialidade: "especialidade",
  modalidade: "modalidade",
  idioma: "idioma",
  vagas: "vagas",
  occ: "occ",
  linkedin: "linkedin",
  ordem: "ordem",
  pagina: "pagina",
} as const;

function valorDoCatalogo(valor: string | null, catalogo: readonly string[]): string {
  if (!valor) return "";
  const achado = catalogo.find((c) => c.toLowerCase() === valor.trim().toLowerCase());
  return achado ?? "";
}

/**
 * Lê o endereço e devolve um filtro válido.
 *
 * Tudo o que não estiver nos catálogos fechados é descartado em silêncio
 * (§97): um distrito inventado à mão no URL não pode virar uma consulta,
 * e uma página negativa não pode virar um `range` negativo. O que sai
 * daqui é sempre um estado que a interface sabe desenhar.
 */
export function parseFiltro(params: URLSearchParams): FiltroDiretorio {
  const modalidade = (params.get(PARAMS.modalidade) ?? "").toLowerCase();
  const ordem = (params.get(PARAMS.ordem) ?? "").toLowerCase();
  const paginaCrua = Number.parseInt(params.get(PARAMS.pagina) ?? "1", 10);

  return {
    procura: (params.get(PARAMS.procura) ?? "").trim().slice(0, 80),
    distrito: valorDoCatalogo(params.get(PARAMS.distrito), DISTRITOS),
    especialidade: valorDoCatalogo(params.get(PARAMS.especialidade), ESPECIALIDADES),
    modalidade: (["online", "presencial", "ambos"] as const).includes(modalidade as never)
      ? (modalidade as ModalidadeFiltro)
      : "",
    idioma: valorDoCatalogo(params.get(PARAMS.idioma), IDIOMAS.map((i) => i.codigo)),
    soAceitaNovos: params.get(PARAMS.vagas) === "1",
    soOccVerificada: params.get(PARAMS.occ) === "1",
    soLinkedIn: params.get(PARAMS.linkedin) === "1",
    ordem: ordem === "nome" ? "nome" : "disponibilidade",
    pagina: Number.isFinite(paginaCrua)
      ? Math.min(Math.max(1, paginaCrua), PAGINA_MAXIMA)
      : 1,
  };
}

/**
 * O caminho oposto: o filtro escrito como query string canónica.
 *
 * Só aparece o que difere do estado vazio, e sempre pela mesma ordem —
 * dois filtros iguais dão sempre o mesmo endereço, que é o que torna o
 * link partilhável e o histórico previsível.
 */
export function filtroParaQuery(f: FiltroDiretorio): string {
  const p = new URLSearchParams();
  const procura = f.procura.trim();

  if (procura) p.set(PARAMS.procura, procura);
  if (f.distrito) p.set(PARAMS.distrito, f.distrito);
  if (f.especialidade) p.set(PARAMS.especialidade, f.especialidade);
  if (f.modalidade) p.set(PARAMS.modalidade, f.modalidade);
  if (f.idioma) p.set(PARAMS.idioma, f.idioma);
  if (f.soAceitaNovos) p.set(PARAMS.vagas, "1");
  if (f.soOccVerificada) p.set(PARAMS.occ, "1");
  if (f.soLinkedIn) p.set(PARAMS.linkedin, "1");
  if (f.ordem !== "disponibilidade") p.set(PARAMS.ordem, f.ordem);
  if (f.pagina > 1) p.set(PARAMS.pagina, String(f.pagina));

  return p.toString();
}

/**
 * Muda um filtro e volta à primeira página.
 *
 * Manter a página ao mudar de distrito era a forma mais rápida de mostrar
 * «nenhum resultado» a quem tinha acabado de escolher um filtro com
 * resultados (§104).
 */
export function comFiltro(f: FiltroDiretorio, mudanca: Partial<FiltroDiretorio>): FiltroDiretorio {
  return { ...f, ...mudanca, pagina: mudanca.pagina ?? 1 };
}

/** Quantos filtros estão a restringir a lista — o «Filtros (2)» do telemóvel. */
export function contarFiltros(f: FiltroDiretorio): number {
  return [
    f.procura.trim(),
    f.distrito,
    f.especialidade,
    f.modalidade,
    f.idioma,
    f.soAceitaNovos,
    f.soOccVerificada,
    f.soLinkedIn,
  ].filter(Boolean).length;
}

// ─── Regras de apresentação (partilhadas com o perfil) ──────────────────

export interface EstadoOcc {
  /** A frase inteira, com o número. É o que o perfil mostra. */
  etiqueta: string;
  /**
   * A mesma verdade sem o número, para caber ao lado do título no cartão.
   *
   * Encurtar não é suavizar: «informada» continua a dizer que ninguém
   * confirmou aquele número, e o cartão leva a frase inteira no `title`.
   */
  curto: string;
  /** `verificada` é o único que pode usar o verde da marca. */
  tom: "verificada" | "informada" | "aprovado";
  /**
   * Como e quando foi confirmado. `null` quando não há nada a dizer.
   *
   * Existe porque «verificada» sem mais nada não responde à pergunta que
   * a seguir se faz — verificada por quem, e há quanto tempo? Um selo que
   * não sabe responder a isso é um autocolante.
   */
  detalhe: string | null;
}

/** Como cada método se diz a um cliente, em duas palavras. */
const COMO_FOI: Record<string, string> = {
  scap: "confirmada junto da Ordem",
  registo_publico: "confirmada no registo público da Ordem",
  documento: "confirmada por documento",
};

/**
 * O que se pode dizer sobre a inscrição na Ordem.
 *
 * Três estados, não dois. Ter um número escrito no formulário não é o
 * mesmo que alguém o ter confirmado junto da OCC — e a diferença entre
 * «informada» e «verificada» é precisamente a confiança que o diretório
 * está a pedir emprestada. Sem número não se finge certificação nenhuma:
 * diz-se o que é verdade, que a conta foi aprovada na plataforma (§41).
 */
export function estadoOcc(c: {
  occ: string | null;
  occVerificado: boolean;
  /** Opcionais: quem tiver a informação diz mais, quem não tiver diz o mesmo de antes. */
  occMetodo?: string | null;
  occVerificadoEm?: string | null;
}): EstadoOcc {
  if (c.occ && c.occVerificado) {
    return {
      etiqueta: `OCC n.º ${c.occ} · Verificada`,
      curto: "OCC verificada",
      tom: "verificada",
      detalhe: detalheDaVerificacao(c.occMetodo ?? null, c.occVerificadoEm ?? null),
    };
  }
  if (c.occ) {
    return {
      etiqueta: `OCC n.º ${c.occ} · Informada`,
      curto: "OCC informada",
      tom: "informada",
      // Dito uma vez, sem rodeios: o número está lá porque a pessoa o
      // escreveu, e mais ninguém confirmou nada.
      detalhe: "Número indicado pelo próprio, ainda por confirmar.",
    };
  }
  return {
    etiqueta: "Perfil profissional aprovado",
    curto: "Perfil aprovado",
    tom: "aprovado",
    detalhe: null,
  };
}

function detalheDaVerificacao(metodo: string | null, quando: string | null): string | null {
  const como = metodo ? COMO_FOI[metodo] : null;
  if (!como) return null;
  if (!quando) return `Inscrição ${como}.`;

  const data = new Date(quando);
  if (Number.isNaN(data.getTime())) return `Inscrição ${como}.`;
  const legivel = data.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  return `Inscrição ${como} a ${legivel}.`;
}

/** «Concelho, Distrito», ou o que existir. `null` quando não há nada. */
export function textoLocalizacao(c: { concelho: string | null; distrito: string | null }): string | null {
  const partes = [c.concelho, c.distrito].map((p) => p?.trim()).filter(Boolean);
  return partes.length ? partes.join(", ") : null;
}

/** Como se atende. Nunca inventa: sem modalidades, fica «A combinar». */
export function textoModalidades(modalidades: readonly Modalidade[]): string {
  const online = modalidades.includes("online");
  const presencial = modalidades.includes("presencial");
  if (online && presencial) return "Online e presencial";
  if (online) return "Online";
  if (presencial) return "Presencial";
  return "A combinar";
}

/**
 * O tempo de resposta, encurtado para caber numa célula do cartão.
 *
 * A frase canónica é a do perfil (`copyResposta`) e é dela que esta sai,
 * sem o sujeito: o cartão tem o rótulo «Tempo de resposta» ao lado, e
 * repetir «responde» seria dizer duas vezes a mesma palavra. O que não
 * se perde é o «normalmente» — este número é um compromisso que o
 * profissional escreveu, não uma média medida por nós (§12).
 */
export function textoRespostaCurta(horas: number | null): string | null {
  const frase = copyResposta(horas);
  if (!frase) return null;
  const curta = frase.replace(/^Responde\s+/i, "");
  return curta.charAt(0).toUpperCase() + curta.slice(1);
}

/**
 * As áreas que cabem no cartão, e quantas ficaram de fora.
 *
 * Dez etiquetas num cartão não são dez informações: são uma mancha. A
 * área que está a ser filtrada vem à frente, porque é a que responde à
 * pergunta que a pessoa acabou de fazer (§43).
 */
export function especialidadesDoCartao(
  especialidades: readonly string[],
  emDestaque: string,
  limite = 3,
): { visiveis: string[]; restantes: number } {
  const ordenadas = emDestaque && especialidades.includes(emDestaque)
    ? [emDestaque, ...especialidades.filter((e) => e !== emDestaque)]
    : [...especialidades];

  return {
    visiveis: ordenadas.slice(0, limite),
    restantes: Math.max(0, ordenadas.length - limite),
  };
}
