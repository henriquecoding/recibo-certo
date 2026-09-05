// ═══════════════════════════════════════════════════════════════════════
//  O CATÁLOGO DO QUE NUNCA SAIU DO APARELHO
//  ---------------------------------------------------------------------
//  A zona de risco só sabia falar da nuvem. Duas consequências, e as duas
//  más:
//
//  PRIMEIRA — quem não tem conta não via zona de risco nenhuma. O
//  componente começava por `if (!user) return null`, e a maior parte de
//  quem usa isto não tem conta: as calculadoras, os simuladores, o estúdio
//  de negócio e o motor de descoberta funcionam sem sessão. Essas pessoas
//  têm dados — o rascunho do negócio, os custos de fornecedor, as margens,
//  o perfil de competências — e não tinham por onde os apagar. Uma página
//  que se chama «zona de risco» e não mostra nada a quem tem tudo no
//  aparelho não está a proteger ninguém.
//
//  SEGUNDA — apagar UMA coisa na nuvem esvaziava o cofre INTEIRO. Escolher
//  «Comentários que deixaste» chamava `esvaziarCofre`, que remove os
//  dezoito domínios: o estúdio de negócio, os preços guardados, as
//  hipóteses de mercado, o perfil de descoberta. Nada disso está na nuvem,
//  nada disso tinha sido escolhido, e a resposta dizia «1 registo apagado».
//
//  Este ficheiro é o inventário do lado do aparelho: um conjunto por
//  domínio do cofre, com o que a pessoa lê e uma forma de contar o que lá
//  está. `DOMINIOS_POR_CONJUNTO` é o outro lado — o que um apagamento na
//  nuvem pode levar consigo daqui, e SÓ isso.
//
//  Vive à parte de `catalogo.ts` porque toca no cofre, e o cofre é do
//  browser: a rota que apaga na nuvem não tem de o carregar.
// ═══════════════════════════════════════════════════════════════════════

import { DOMINIOS, chaveNoCofre, type Dominio } from "@/lib/store/cofre";
import { lerChave, removerChave } from "@/lib/store/persistencia";

export type GrupoLocalId = "trabalho" | "negocio" | "rascunhos";

export const GRUPOS_LOCAIS: { id: GrupoLocalId; titulo: string; descricao: string }[] = [
  { id: "trabalho", titulo: "O teu trabalho fiscal, neste aparelho",
    descricao: "A cópia local do que as calculadoras usam. Sem sessão, é a única que existe." },
  { id: "negocio", titulo: "Preço, negócio e descoberta",
    descricao: "Custos, margens, hipóteses e o teu perfil de competências. É o mais identificador que este produto sabe — e nunca saiu daqui." },
  { id: "rascunhos", titulo: "Rascunhos e pontes",
    descricao: "Estados a meio e passagens de uma ferramenta para outra. Apagá-los não perde nada que esteja guardado." },
];

export interface ConjuntoLocal {
  /** Um domínio do cofre, e é a chave: não há aqui nada que o cofre não conheça. */
  id: Dominio;
  grupo: GrupoLocalId;
  titulo: string;
  descricao: string;
  /**
   * Como se conta o que lá está. O conteúdo é JSON escrito por nós, mas
   * pode ter sido mexido à mão ou ter ficado a meio — daí `desconhecido`,
   * que é honesto, em vez de zero, que é mentira.
   */
  contar: "lista" | "chaves" | "presenca";
}

export const CONJUNTOS_LOCAIS: ConjuntoLocal[] = [
  // ── O trabalho fiscal ─────────────────────────────────────────────
  { id: "recibos", grupo: "trabalho", contar: "lista",
    titulo: "Recibos verdes neste aparelho",
    descricao: "A cópia local dos recibos verdes que registaste. Se tens sessão, existe também na nuvem e sai com ela." },
  { id: "recibos-computed", grupo: "trabalho", contar: "lista",
    titulo: "Contas já feitas dos recibos",
    descricao: "Os totais calculados a partir dos recibos, guardados para o painel não os refazer a cada visita. Voltam a ser calculados sozinhos." },
  { id: "vencimentos", grupo: "trabalho", contar: "lista",
    titulo: "Recibos de vencimento neste aparelho",
    descricao: "A cópia local dos recibos de vencimento que guardaste." },
  { id: "cenarios", grupo: "trabalho", contar: "lista",
    titulo: "Cenários neste aparelho",
    descricao: "A cópia local dos cenários de simulação que guardaste." },
  { id: "perfil-fiscal", grupo: "trabalho", contar: "presenca",
    titulo: "Perfil fiscal neste aparelho",
    descricao: "As condições que guardaste: início de atividade, regime de IVA, agregado e deduções. O painel volta a dizer que não sabe." },
  { id: "prazos", grupo: "trabalho", contar: "lista",
    titulo: "Prazos marcados como cumpridos",
    descricao: "As marcas de «já entreguei» feitas neste aparelho." },

  // ── Preço, negócio e descoberta ───────────────────────────────────
  { id: "preco", grupo: "negocio", contar: "presenca",
    titulo: "Cálculo de preço a meio",
    descricao: "O produto ou serviço que estás a pôr a preço agora: custos, tempo, margem e comissões." },
  { id: "precos-guardados", grupo: "negocio", contar: "lista",
    titulo: "Preços guardados",
    descricao: "Os preços que já decidiste, com a estrutura de custos de cada um. Apagá-los deixa-te sem o histórico com que comparas." },
  { id: "negocio", grupo: "negocio", contar: "presenca",
    titulo: "Estúdio de negócio",
    descricao: "O projeto que estás a montar: fornecedores, custos fixos, volumes e a estrutura de custos inteira. É o dado mais sensível que este produto guarda neste aparelho." },
  { id: "hipoteses-mercado", grupo: "negocio", contar: "lista",
    titulo: "Hipóteses que estás a testar",
    descricao: "As entrevistas, os orçamentos aceites, os pilotos pagos e as vendas que registaste. É a tua prova comercial e a dos teus clientes." },
  { id: "perfil-descoberta", grupo: "negocio", contar: "presenca",
    titulo: "Perfil de descoberta",
    descricao: "Zona, competências, ativos, capital, restrições e tolerância ao risco. Em conjunto, é o que mais te identifica em todo o produto." },
  { id: "instantaneos-descoberta", grupo: "negocio", contar: "lista",
    titulo: "Análises de descoberta anteriores",
    descricao: "As pontuações das análises que já correste, para poderes ver o que mudou. Não guardam o teu perfil, só o resultado." },

  // ── Rascunhos e pontes ────────────────────────────────────────────
  { id: "simulador-irs", grupo: "rascunhos", contar: "presenca",
    titulo: "Simulação de IRS a meio",
    descricao: "O que já preencheste no simulador de IRS: agregado, rendimentos e deduções." },
  { id: "perfil", grupo: "rascunhos", contar: "presenca",
    titulo: "Modo escolhido na página inicial",
    descricao: "Se abres o site como independente, por conta de outrem, empresa ou a comparar. Volta a perguntar." },
  { id: "ponte-recibos", grupo: "rascunhos", contar: "presenca",
    titulo: "Passagem dos recibos verdes para o IRS",
    descricao: "A cópia que fica à espera quando levas os recibos verdes para o simulador de IRS." },
  { id: "ponte-vencimento", grupo: "rascunhos", contar: "presenca",
    titulo: "Passagem do vencimento para o IRS",
    descricao: "A cópia que fica à espera quando levas o recibo de vencimento para o simulador de IRS." },
  { id: "ponte-empresa", grupo: "rascunhos", contar: "presenca",
    titulo: "Passagem da empresa para o IRS",
    descricao: "A cópia que fica à espera quando levas o simulador de empresa para o de IRS." },
  { id: "handoff-negocio-empresa", grupo: "rascunhos", contar: "presenca",
    titulo: "Passagem do estúdio para o simulador de empresa",
    descricao: "Leva volume de negócios, custos e estrutura. Expira sozinha e é consumida uma vez — apagá-la só antecipa isso." },
  { id: "handoff-descoberta-negocio", grupo: "rascunhos", contar: "presenca",
    titulo: "Passagem da descoberta para o estúdio",
    descricao: "Leva o cenário de preço e o nome da oferta. Expira sozinha e é consumida uma vez." },
  { id: "regresso-descoberta", grupo: "rascunhos", contar: "presenca",
    titulo: "Caminho de volta ao simulador",
    descricao: "Guarda apenas de que simulador saíste para ir descobrir o que fazer, para te oferecer o regresso. Não leva números nenhuns e expira sozinha." },
];

/**
 * O que um apagamento na nuvem pode levar daqui, e SÓ isso.
 *
 * Escolher «Comentários que deixaste» chamava `esvaziarCofre` e levava o
 * estúdio de negócio à frente. Um conjunto da nuvem só pode tocar no
 * domínio local que É a mesma coisa — a cópia local do mesmo dado.
 */
export const DOMINIOS_POR_CONJUNTO: Record<string, Dominio[]> = {
  recibos: ["recibos", "recibos-computed"],
  vencimentos: ["vencimentos"],
  cenarios: ["cenarios"],
  "perfil-fiscal": ["perfil-fiscal"],
  prazos: ["prazos"],
};

/** Os domínios locais que saem com um apagamento destes conjuntos da nuvem. */
export function dominiosDosConjuntos(conjuntos: readonly string[]): Dominio[] {
  const saem = new Set<Dominio>();
  for (const c of conjuntos) for (const d of DOMINIOS_POR_CONJUNTO[c] ?? []) saem.add(d);
  return [...saem];
}

/**
 * Quantos registos há num domínio, neste cofre.
 *
 * `null` quer dizer «não se sabe» — a chave existe mas não se lê. Nunca
 * devolve zero nesse caso: um zero faria a interface desativar a linha e
 * a pessoa ficaria sem forma de apagar o que lá está mesmo.
 */
export function contarLocal(c: ConjuntoLocal, userId: string | null | undefined): number | null {
  const bruto = lerChaveDoDominio(c.id, userId);
  if (bruto === null || bruto === "") return 0;
  if (c.contar === "presenca") return 1;
  try {
    const v = JSON.parse(bruto) as unknown;
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === "object") {
      // Alguns domínios guardam `{ itens: [...] }` e outros um mapa.
      const itens = (v as { itens?: unknown }).itens;
      if (Array.isArray(itens)) return itens.length;
      return c.contar === "chaves" ? Object.keys(v).length : 1;
    }
    return 1;
  } catch {
    return null;
  }
}

/**
 * A chave antiga, de antes do cofre.
 *
 * ⚠️ Existe porque dois domínios ainda escrevem nela: `lib/perfil.tsx` e o
 * simulador de IRS usam a chave global e não `chaveAtiva`. `esvaziarCofre`
 * só removia `chave::cofre`, pelo que a simulação de IRS SOBREVIVIA ao
 * apagamento — e o recarregamento que vem a seguir corria a migração do
 * cofre, que a copiava de volta para o cofre acabado de esvaziar. Apagar
 * tem de levar as duas formas da mesma chave.
 */
const chaveAntiga = (d: Dominio): string => DOMINIOS[d];

function lerChaveDoDominio(d: Dominio, userId: string | null | undefined): string | null {
  return lerChave(chaveNoCofre(d, userId)) ?? lerChave(chaveAntiga(d));
}

/** Apaga os domínios escolhidos, nas duas formas da chave. */
export function apagarDominiosLocais(
  dominios: readonly Dominio[],
  userId: string | null | undefined,
): void {
  for (const d of dominios) {
    removerChave(chaveNoCofre(d, userId));
    removerChave(chaveAntiga(d));
  }
}

export const conjuntoLocalPorId = (id: string): ConjuntoLocal | undefined =>
  CONJUNTOS_LOCAIS.find((c) => c.id === id);
