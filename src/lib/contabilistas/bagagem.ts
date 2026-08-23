// ═══════════════════════════════════════════════════════════════════════
//  BAGAGEM — o que a pessoa leva consigo quando sai de uma ferramenta
//  ---------------------------------------------------------------------
//  Quem acaba de simular e clica num contabilista perde tudo. Chega ao
//  perfil de alguém sem contexto nenhum, pede o vínculo, espera pela
//  aceitação, e nessa altura já não se lembra do número que o tinha feito
//  procurar ajuda. O contabilista, do outro lado, recebe «olá» e mais nada.
//
//  A bagagem é a resposta a isso, e é deliberadamente pequena:
//
//   1. **UMA de cada vez.** A última simulação. Um histórico de simulações
//      num `localStorage` seria uma segunda base de dados fiscal a manter,
//      a expirar e a explicar na política de privacidade — para responder a
//      uma pergunta («o que é que eu estava a fazer há um minuto?») que só
//      tem uma resposta.
//
//   2. **Já nasce sanitizada.** O conteúdo passa por
//      `sanitizarConteudoPartilha()` ANTES de ser escrito. É a mesma lista
//      branca por tipo que governa a partilha real, aplicada uma etapa mais
//      cedo: um campo que ninguém autorizou não chega sequer a tocar no
//      disco. Se fosse sanitizado só na saída, bastaria alguém ler a chave
//      no browser para ver o que a lista branca teria recusado.
//
//   3. **Nunca sai sozinha.** Isto NÃO é uma partilha. É uma nota da pessoa
//      para si própria, no dispositivo dela. O envio continua a acontecer no
//      único sítio onde sempre aconteceu — a folha de
//      `EnviarAoContabilista`, com o destinatário identificado, os campos
//      exatos à vista e o consentimento versionado gravado.
//
//   4. **Expira.** Setenta e duas horas. Uma simulação de há uma semana não
//      é o contexto de nada, e mantê-la seria acumular dados fiscais por
//      inércia — exatamente o contrário do que a página de privacidade
//      promete.
// ═══════════════════════════════════════════════════════════════════════

import type { TipoPartilha } from "./tipos";
import { ROTULO_PARTILHA, sanitizarConteudoPartilha, tituloPorOmissao } from "./vinculo";

export const CHAVE_BAGAGEM = "recibocerto:contabilistas:bagagem:v1";

/** Ao fim de quanto tempo a bagagem deixa de fazer sentido. */
export const VALIDADE_HORAS = 72;

export interface Bagagem {
  /** A ferramenta de onde veio. É por aqui que a secção sabe se é a dela. */
  toolId: string;
  tipo: TipoPartilha;
  titulo: string;
  /** Já filtrado pela lista branca do tipo. Nunca o objeto em bruto. */
  conteudo: Record<string, unknown>;
  /** Quantos campos sobreviveram à lista branca. Para a copy e a medição. */
  campos: number;
  criadoEm: string;
}

interface Pedido {
  toolId: string;
  tipo: TipoPartilha;
  conteudo: unknown;
  titulo?: string;
}

function disponivel(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Guarda a última simulação. Devolve `false` em silêncio quando não há nada
 * de aproveitável — um resultado vazio não é bagagem, e um aviso de erro
 * por causa disso seria ruído numa ação que a pessoa nem pediu.
 */
export function guardarBagagem(p: Pedido): boolean {
  if (!disponivel()) return false;

  const limpo = sanitizarConteudoPartilha(p.tipo, p.conteudo);
  if (limpo.erro || Object.keys(limpo.conteudo).length === 0) return false;

  const bagagem: Bagagem = {
    toolId: p.toolId,
    tipo: p.tipo,
    titulo: (p.titulo ?? "").trim().slice(0, 120) || tituloPorOmissao(p.tipo),
    conteudo: limpo.conteudo,
    campos: Object.keys(limpo.conteudo).length,
    criadoEm: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CHAVE_BAGAGEM, JSON.stringify(bagagem));
    return true;
  } catch {
    // Modo privado, quota cheia, armazenamento bloqueado. A ferramenta
    // continua a funcionar; só não há «levar comigo».
    return false;
  }
}

/**
 * Lê a bagagem, se ainda for válida.
 *
 * Com `toolId`, só devolve a bagagem daquela ferramenta: a secção do fim do
 * simulador de IRS não pode oferecer «levar a tua simulação» apontando para
 * um cálculo de heranças que ficou de ontem.
 */
export function lerBagagem(toolId?: string): Bagagem | null {
  if (!disponivel()) return null;

  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE_BAGAGEM);
  } catch {
    return null;
  }
  if (!bruto) return null;

  let lido: unknown;
  try {
    lido = JSON.parse(bruto);
  } catch {
    limparBagagem();
    return null;
  }

  const b = validar(lido);
  if (!b) {
    limparBagagem();
    return null;
  }
  if (expirou(b)) {
    limparBagagem();
    return null;
  }
  if (toolId && b.toolId !== toolId) return null;
  return b;
}

export function limparBagagem(): void {
  if (!disponivel()) return;
  try {
    window.localStorage.removeItem(CHAVE_BAGAGEM);
  } catch {
    /* nada a fazer, e nada que valha um erro na cara de alguém */
  }
}

export function expirou(b: Bagagem, agora: Date = new Date()): boolean {
  const nascida = Date.parse(b.criadoEm);
  if (!Number.isFinite(nascida)) return true;
  return agora.getTime() - nascida > VALIDADE_HORAS * 3_600_000;
}

/**
 * O que se diz sobre uma bagagem, numa linha.
 *
 * Diz o tipo e quantos campos seguem — nunca os valores. A pessoa só vê os
 * valores no ecrã de confirmação do envio, que é onde a decisão de os
 * mostrar a outra pessoa é tomada.
 */
export function descreverBagagem(b: Bagagem): string {
  const n = b.campos;
  return `${ROTULO_PARTILHA[b.tipo]} · ${n} ${n === 1 ? "campo" : "campos"}`;
}

function validar(bruto: unknown): Bagagem | null {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;

  if (typeof o.toolId !== "string" || !o.toolId) return null;
  if (typeof o.tipo !== "string" || !(o.tipo in ROTULO_PARTILHA)) return null;
  if (typeof o.criadoEm !== "string") return null;
  if (!o.conteudo || typeof o.conteudo !== "object" || Array.isArray(o.conteudo)) return null;

  const tipo = o.tipo as TipoPartilha;
  // Revalidar a lista branca na LEITURA e não só na escrita: a chave está
  // no browser da pessoa e pode ser editada à mão, e as listas brancas
  // mudam entre versões. O que foi autorizado ontem não é, por si, uma
  // autorização hoje.
  const limpo = sanitizarConteudoPartilha(tipo, o.conteudo);
  if (limpo.erro || Object.keys(limpo.conteudo).length === 0) return null;

  return {
    toolId: o.toolId,
    tipo,
    titulo: typeof o.titulo === "string" && o.titulo.trim()
      ? o.titulo.trim().slice(0, 120)
      : tituloPorOmissao(tipo),
    conteudo: limpo.conteudo,
    campos: Object.keys(limpo.conteudo).length,
    criadoEm: o.criadoEm,
  };
}
