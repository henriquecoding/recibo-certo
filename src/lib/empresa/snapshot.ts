// ═══════════════════════════════════════════════════════════════════════
//  O SNAPSHOT DO SIMULADOR DE EMPRESA — um contrato, não um `useState`
//  ---------------------------------------------------------------------
//  §12 do relatório. O formato de interoperabilidade do simulador vivia
//  DENTRO de `ModoGuiadoEmpresa.tsx`, num `montarSnapshot()` que devolvia
//  um objeto literal. Isso significava três coisas más:
//
//   · o formato era `ReturnType<typeof montarSnapshot>` — um tipo que
//     nasce de uma implementação e muda sem ninguém decidir;
//   · quem quisesse escrever um snapshot (a store de cenários, uma ponte
//     entre ferramentas) tinha de importar um componente React, e com ele
//     o Leaflet, o motor fiscal e meio megabyte de UI;
//   · um cenário gravado há seis meses era relido com `as`, sem validação
//     nenhuma — §95: «não castar snapshots cegamente».
//
//  A partir daqui o formato é um TIPO, num ficheiro sem React, com um
//  normalizador que aceita o que reconhece e ignora o resto sem rebentar.
//
//  ── O QUE ESTE FICHEIRO NÃO É ──────────────────────────────────────
//  Não é o motor. Não calcula IRC, derrama, tributação autónoma nem
//  dividendos — isso é `fiscal-empresa.ts` e continua lá. Isto é a FORMA
//  das respostas que o simulador guarda, e nada mais.
// ═══════════════════════════════════════════════════════════════════════

import type { ParametrosFiscaisRegiao } from "@/lib/incentivos-regioes";
import { ESTADOS_CIVIS, type PerfilFiscalPessoa } from "@/lib/perfil-pessoa";

// ─── Os vocabulários do simulador guiado ───────────────────────────────
//  Estavam declarados dentro do componente. Um formato de interoperabilidade
//  não pode viver num ficheiro `.tsx` que ninguém consegue importar sem
//  arrastar a interface inteira.

export type TipoSociedade = "unipessoal" | "quotas";
export type PerfilFundador = "residente" | "estrangeiro_ue" | "estrangeiro_extra_ue";
export type TipoSede = "fisica" | "virtual" | "coworking";
export type RegiaoRFAIGuiado = "interior" | "litoral";
/** Os escalões do Art. 88.º CIRC tal como o simulador guiado os expõe. */
export type TipoViaturaGuiado =
  | "nenhuma"
  | "eletrica"
  | "eletrica_cara"
  | "phev_baixo"
  | "phev_medio"
  | "phev_alto"
  | "comb_baixo"
  | "comb_medio"
  | "comb_alto";

export const TIPOS_SOCIEDADE: readonly TipoSociedade[] = ["unipessoal", "quotas"];
export const PERFIS_FUNDADOR: readonly PerfilFundador[] = [
  "residente",
  "estrangeiro_ue",
  "estrangeiro_extra_ue",
];
export const TIPOS_SEDE: readonly TipoSede[] = ["fisica", "virtual", "coworking"];
export const REGIOES_RFAI: readonly RegiaoRFAIGuiado[] = ["interior", "litoral"];
export const TIPOS_VIATURA: readonly TipoViaturaGuiado[] = [
  "nenhuma",
  "eletrica",
  "eletrica_cara",
  "phev_baixo",
  "phev_medio",
  "phev_alto",
  "comb_baixo",
  "comb_medio",
  "comb_alto",
];
export const TIPOS_SIFIDE = ["startup", "pme_jovem", "pme_normal", "grande"] as const;
export type TipoSifideGuiado = (typeof TIPOS_SIFIDE)[number];

// ─── O snapshot ────────────────────────────────────────────────────────

/**
 * Tudo o que o simulador guiado de empresa guarda de uma sessão.
 *
 * Os campos são todos opcionais de propósito: um snapshot é sempre
 * PARCIAL. Um cenário guardado antes de um campo existir não tem esse
 * campo, e um handoff vindo do estúdio só traz o que o estúdio sabe —
 * §16: tipo de sociedade, salário do gerente, dividendos, viatura, RFAI e
 * imóvel NÃO se inferem de um modelo comercial.
 */
export interface SnapshotEmpresaGuiada {
  /** Sobe quando a forma mudar de maneira incompatível. */
  versao?: number;

  // ── Situação ────────────────────────────────────────────────────
  jaTemEmpresa?: "sim" | "nao";

  // ── Sociedade e fundador ────────────────────────────────────────
  tipoSociedade?: TipoSociedade;
  tipoSelecionado?: boolean;
  perfilFundador?: PerfilFundador;
  aplicarIFICI?: boolean;

  // ── Localização e sede ──────────────────────────────────────────
  tipoSede?: TipoSede;
  custoSedeVirtual?: number;
  localizacao?: ParametrosFiscaisRegiao | null;
  localNome?: string;

  // ── Receita e custos ────────────────────────────────────────────
  faturacaoAnual?: number;
  faturacaoComIva?: boolean;
  /** Custos da atividade — os que andam com a faturação. */
  despesasOper?: number;
  /** Estrutura: contabilidade, software, sede, seguros, pessoal. */
  custosEstrutura?: number;
  salGerenteMensal?: number;
  /**
   * Quantos pagamentos por ano recebe a gerência (§44).
   *
   * O motor aceita 12 ou 14 desde sempre e tem testes para o efeito; era
   * a superfície guiada que não o expunha, e por isso a capacidade
   * existia sem ninguém lhe chegar.
   */
  mesesSalarioGerente?: 12 | 14;
  /**
   * A situação pessoal de quem gere (§43).
   *
   * Não é o perfil do NEGÓCIO: é da pessoa, e é ela que decide a tabela
   * de retenção, os dependentes e o IRS Jovem. Omissa, o motor mantém o
   * comportamento anterior — não se inventa uma família.
   */
  perfilGerente?: PerfilFiscalPessoa;
  incluirConstituicao?: boolean;
  custoConstituicao?: number;
  anosAmortizacao?: number;

  // ── Dividendos ──────────────────────────────────────────────────
  distribuirDividendos?: boolean;
  opcaoEnglobamento?: boolean;

  // ── Tributação autónoma ─────────────────────────────────────────
  tipoViatura?: TipoViaturaGuiado;
  encargosViatura?: number;
  despRepresentacao?: number;
  ajudasCusto?: number;
  naoDocumentadas?: number;
  emPrejuizo?: boolean;
  excecaoPrejuizo?: boolean;

  // ── Benefícios ──────────────────────────────────────────────────
  rfaiRegiao?: RegiaoRFAIGuiado;
  rfaiInvest?: number;
  primeirosAnos?: boolean;
  sifideDespesas?: number;
  tipoSifide?: TipoSifideGuiado;
  rfaiContratualValor?: number;

  // ── Imóvel ──────────────────────────────────────────────────────
  temImovelEmpresa?: boolean;
  vptImovel?: number;
  taxaIMI?: number;
  isencaoIMI_RFAI?: boolean;
  valorAquisicaoImovel?: number;
  isencaoIMT_RFAI?: boolean;
  anosAmortizacaoIMT?: number;
}

export const SNAPSHOT_EMPRESA_VERSAO = 2;

// ─── Normalização ──────────────────────────────────────────────────────

const numeroValido = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && !Number.isNaN(v);

const numeroNaoNegativo = (v: unknown): number | undefined =>
  numeroValido(v) && v >= 0 ? v : undefined;

const booleano = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

const texto = (v: unknown): string | undefined =>
  typeof v === "string" && v.length <= 200 ? v : undefined;

const umDe = <T extends string>(v: unknown, validos: readonly T[]): T | undefined =>
  typeof v === "string" && (validos as readonly string[]).includes(v) ? (v as T) : undefined;

/**
 * Um `ParametrosFiscaisRegiao` só é aceite inteiro.
 *
 * Meio objeto de localização é pior do que nenhum: um `derramaEstimada`
 * que chegou e um `ircPME` que não faria o motor calcular com uma taxa por
 * omissão e apresentar o resultado como se fosse daquele município. §111:
 * «localização incompleta não vira município inventado».
 */
export function normalizarLocalizacao(v: unknown): ParametrosFiscaisRegiao | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.regiaoId !== "string" || o.regiaoId.length === 0) return undefined;
  if (typeof o.nome !== "string") return undefined;
  if (typeof o.interior !== "boolean") return undefined;
  for (const chave of ["ircPME", "ircGeral", "derramaEstimada", "rfaiTaxa", "contabMin", "contabMax"]) {
    if (!numeroValido(o[chave]) || (o[chave] as number) < 0) return undefined;
  }
  if (!umDe(o.rfaiTipo, REGIOES_RFAI)) return undefined;
  if (typeof o.selo !== "string") return undefined;
  return v as ParametrosFiscaisRegiao;
}

/**
 * Aceita o que reconhece, descarta o resto — e nunca rebenta.
 *
 * §94-95: valores inválidos não podem quebrar a página. O campo é
 * ignorado e a interface fica a saber (pelos avisos do handoff) que ficou
 * de fora. Um `as SnapshotEmpresaGuiada` sobre `JSON.parse` era uma
 * promessa ao TypeScript que os dados não têm obrigação de cumprir.
 */
export function normalizarSnapshotEmpresa(bruto: unknown): SnapshotEmpresaGuiada {
  if (!bruto || typeof bruto !== "object") return {};
  const o = bruto as Record<string, unknown>;
  const s: SnapshotEmpresaGuiada = {};

  const versao = numeroNaoNegativo(o.versao);
  if (versao !== undefined) s.versao = versao;

  const ja = umDe(o.jaTemEmpresa, ["sim", "nao"] as const);
  if (ja) s.jaTemEmpresa = ja;

  const tipoSoc = umDe(o.tipoSociedade, TIPOS_SOCIEDADE);
  if (tipoSoc) s.tipoSociedade = tipoSoc;
  const selecionado = booleano(o.tipoSelecionado);
  if (selecionado !== undefined) s.tipoSelecionado = selecionado;
  const perfil = umDe(o.perfilFundador, PERFIS_FUNDADOR);
  if (perfil) s.perfilFundador = perfil;
  const ifici = booleano(o.aplicarIFICI);
  if (ifici !== undefined) s.aplicarIFICI = ifici;

  const sede = umDe(o.tipoSede, TIPOS_SEDE);
  if (sede) s.tipoSede = sede;
  const custoSede = numeroNaoNegativo(o.custoSedeVirtual);
  if (custoSede !== undefined) s.custoSedeVirtual = custoSede;
  const local = normalizarLocalizacao(o.localizacao);
  if (local) s.localizacao = local;
  const nomeLocal = texto(o.localNome);
  if (nomeLocal) s.localNome = nomeLocal;

  atribuirNumeros(s, o, [
    "faturacaoAnual",
    "despesasOper",
    "custosEstrutura",
    "salGerenteMensal",
    "custoConstituicao",
    "anosAmortizacao",
    "encargosViatura",
    "despRepresentacao",
    "ajudasCusto",
    "naoDocumentadas",
    "rfaiInvest",
    "sifideDespesas",
    "rfaiContratualValor",
    "vptImovel",
    "taxaIMI",
    "valorAquisicaoImovel",
    "anosAmortizacaoIMT",
  ]);

  atribuirBooleanos(s, o, [
    "faturacaoComIva",
    "incluirConstituicao",
    "distribuirDividendos",
    "opcaoEnglobamento",
    "emPrejuizo",
    "excecaoPrejuizo",
    "primeirosAnos",
    "temImovelEmpresa",
    "isencaoIMI_RFAI",
    "isencaoIMT_RFAI",
  ]);

  // 12 ou 14 — e nada mais. Um snapshot com 13 é um snapshot corrompido.
  if (o.mesesSalarioGerente === 12 || o.mesesSalarioGerente === 14) {
    s.mesesSalarioGerente = o.mesesSalarioGerente;
  }

  const perfilPessoal = normalizarPerfilPessoa(o.perfilGerente);
  if (perfilPessoal) s.perfilGerente = perfilPessoal;

  const viatura = umDe(o.tipoViatura, TIPOS_VIATURA);
  if (viatura) s.tipoViatura = viatura;
  const rfai = umDe(o.rfaiRegiao, REGIOES_RFAI);
  if (rfai) s.rfaiRegiao = rfai;
  const sifide = umDe(o.tipoSifide, TIPOS_SIFIDE);
  if (sifide) s.tipoSifide = sifide;

  return s;
}

/**
 * A situação pessoal, campo a campo.
 *
 * Devolve `undefined` quando nada é reconhecível — um perfil vazio não é
 * a mesma coisa que um perfil declarado a zeros, e a diferença decide se
 * o motor personaliza ou assume.
 */
export function normalizarPerfilPessoa(v: unknown): PerfilFiscalPessoa | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const p: PerfilFiscalPessoa = {};

  const civil = umDe(o.estadoCivil, ESTADOS_CIVIS);
  if (civil) p.estadoCivil = civil;

  const dependentes = numeroNaoNegativo(o.dependentes);
  if (dependentes !== undefined) p.dependentes = Math.floor(dependentes);

  const regiao = umDe(o.regiao, ["continente", "madeira", "acores"] as const);
  if (regiao) p.regiao = regiao;

  const deficiencia = booleano(o.deficiencia);
  if (deficiencia !== undefined) p.deficiencia = deficiencia;

  const jovem = numeroNaoNegativo(o.irsJovemAno);
  if (jovem !== undefined && jovem <= 10) p.irsJovemAno = Math.floor(jovem);

  const ifici = booleano(o.ifici);
  if (ifici !== undefined) p.ifici = ifici;

  const conjunta = booleano(o.conjunta);
  if (conjunta !== undefined) p.conjunta = conjunta;

  return Object.keys(p).length > 0 ? p : undefined;
}

type ChaveNumerica = {
  [K in keyof SnapshotEmpresaGuiada]-?: NonNullable<SnapshotEmpresaGuiada[K]> extends number ? K : never;
}[keyof SnapshotEmpresaGuiada];

type ChaveBooleana = {
  [K in keyof SnapshotEmpresaGuiada]-?: NonNullable<SnapshotEmpresaGuiada[K]> extends boolean ? K : never;
}[keyof SnapshotEmpresaGuiada];

function atribuirNumeros(
  destino: SnapshotEmpresaGuiada,
  origem: Record<string, unknown>,
  chaves: readonly ChaveNumerica[],
): void {
  for (const k of chaves) {
    const v = numeroNaoNegativo(origem[k]);
    if (v !== undefined) (destino as Record<string, unknown>)[k] = v;
  }
}

function atribuirBooleanos(
  destino: SnapshotEmpresaGuiada,
  origem: Record<string, unknown>,
  chaves: readonly ChaveBooleana[],
): void {
  for (const k of chaves) {
    const v = booleano(origem[k]);
    if (v !== undefined) (destino as Record<string, unknown>)[k] = v;
  }
}

// ─── O primeiro passo que ainda falta ──────────────────────────────────

/** Os passos do simulador guiado, pela ordem em que se percorrem. */
export type PassoEmpresa = 0 | 1 | "local" | 2 | 3 | 4 | "resultado" | "aseguir";

/**
 * Onde é que o simulador deve abrir, dado o que já sabe.
 *
 * §21: «não começar no passo zero se já há dados». Fazer alguém percorrer
 * «pergunta já respondida → seguinte → pergunta já respondida → seguinte»
 * é a maneira mais eficaz de transformar continuidade em fricção.
 *
 * A ordem é a do fluxo, e a regra é uma só: para no PRIMEIRO passo cuja
 * resposta ainda não existe. Um passo com resposta nunca bloqueia; um
 * passo sem resposta nunca é saltado.
 */
export function primeiroPassoPendente(s: SnapshotEmpresaGuiada): PassoEmpresa {
  if (!s.jaTemEmpresa) return 0;
  if (!s.tipoSelecionado) return 1;
  if (!s.localizacao) return "local";
  if (!((s.faturacaoAnual ?? 0) > 0)) return 2;
  // Dividendos e otimização têm sempre valor por omissão defensável e não
  // travam ninguém: quem chegou aqui com faturação já pode ver o
  // resultado, e volta atrás se quiser afiná-los.
  return "resultado";
}
