// ═══════════════════════════════════════════════════════════════════════
//  A PASSAGEM PARA O CASO — o achado A10, resolvido
//  ---------------------------------------------------------------------
//  Abrir um caso custa uma redação: `situacao` entre 20 e 4 000 caracteres,
//  obrigatória, mais assunto, área, nome, NIF e email. Quem acabou de ler
//  um guia sobre penhoras tinha de reescrever em prosa o que acabou de ler.
//
//  O dossiê pré-compõe o assunto, a área e a situação — e a pessoa continua
//  a poder mudar cada palavra antes de enviar. Não é um formulário
//  preenchido por nós: é um rascunho.
//
//  ⚠️ `sessionStorage`, nunca `localStorage`, e nunca o endereço.
//  A carga inclui o dossiê inteiro, que é o caso de alguém. Morre com o
//  separador, não é partilhada com outras origens, não entra em log
//  nenhum. É a mesma doutrina de `busca/handoff.ts`, e existe pela mesma
//  razão: uma promessa de privacidade ou é uma propriedade do código ou é
//  publicidade enganosa.
// ═══════════════════════════════════════════════════════════════════════

import type { AreaDoCaso } from "@/lib/contabilistas/areas";
import type { DossieDeGuia } from "./tipos";

export const CHAVE_HANDOFF = "rc:dossie:caso:v1";

/** Vinte minutos. Chega para atravessar o registo; não chega para um perfil. */
export const TTL_MS = 20 * 60 * 1000;

export interface CargaDoCaso {
  versao: 1;
  criadoEm: number;
  expiraEm: number;
  assunto: string;
  area: AreaDoCaso;
  situacao: string;
  dossie: DossieDeGuia;
}

function armazenamento(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Um browser em modo restrito lança ao ACEDER, não só ao escrever. Sem
    // a passagem, o formulário abre limpo — que é um estado válido.
    return null;
  }
}

/**
 * A descrição do caso, composta a partir do dossiê.
 *
 * Não é gerada: é montada com as strings publicadas do guia e com o que a
 * pessoa respondeu. Nada aqui inventa uma frase — e é por isso que ela
 * reconhece o texto e o consegue corrigir.
 */
export function situacaoDoDossie(dossie: DossieDeGuia): string {
  const linhas: string[] = [];

  if (dossie.nota) linhas.push(dossie.nota);

  const resposta = dossie.seccoes
    .find((s) => s.id === "resumo")
    ?.itens.find((i) => i.id === "resumo.resposta");
  if (resposta) {
    linhas.push(`Li o guia «${dossie.guia.titulo}» (versão de ${dossie.fixado.revistoEm}), que responde: ${resposta.texto}`);
  }

  const naoSei = dossie.seccoes
    .find((s) => s.id === "aplicabilidade")
    ?.itens.filter((i) => i.resposta === "nao_sei") ?? [];
  if (naoSei.length > 0) {
    linhas.push(`O que não sei responder: ${naoSei.map((i) => i.texto).join(" ")}`);
  }

  const julgamento = dossie.seccoes.find((s) => s.id === "julgamento")?.itens ?? [];
  if (julgamento.length > 0) {
    linhas.push(
      julgamento.length === 1
        ? "O guia marca 1 ponto como dependente do caso concreto."
        : `O guia marca ${julgamento.length} pontos como dependentes do caso concreto.`,
    );
  }

  const porReunir = dossie.seccoes
    .find((s) => s.id === "elementos")
    ?.itens.filter((i) => i.estado === "por_reunir").length ?? 0;
  if (porReunir > 0) {
    linhas.push(`Tenho ${porReunir} ${porReunir === 1 ? "elemento" : "elementos"} por reunir.`);
  }

  return linhas.join("\n\n");
}

export function guardarPassagem(dossie: DossieDeGuia): boolean {
  const s = armazenamento();
  if (!s) return false;
  const agora = Date.now();
  const carga: CargaDoCaso = {
    versao: 1,
    criadoEm: agora,
    expiraEm: agora + TTL_MS,
    assunto: dossie.guia.titulo.slice(0, 120),
    area: dossie.guia.area,
    situacao: situacaoDoDossie(dossie),
    dossie,
  };
  try {
    s.setItem(CHAVE_HANDOFF, JSON.stringify(carga));
    return true;
  } catch {
    // Quota cheia, ou modo restrito. O formulário abre limpo.
    return false;
  }
}

/**
 * Lê e APAGA. Consumo único: voltar atrás no histórico não repõe um
 * rascunho que a pessoa entretanto mudou no formulário.
 */
export function consumirPassagem(): CargaDoCaso | null {
  const s = armazenamento();
  if (!s) return null;
  let bruto: string | null = null;
  try {
    bruto = s.getItem(CHAVE_HANDOFF);
    s.removeItem(CHAVE_HANDOFF);
  } catch {
    return null;
  }
  if (!bruto) return null;

  try {
    const carga = JSON.parse(bruto) as CargaDoCaso;
    if (carga.versao !== 1 || typeof carga.expiraEm !== "number") return null;
    if (carga.expiraEm <= Date.now()) return null;
    return carga;
  } catch {
    return null;
  }
}

export function esquecerPassagem(): void {
  try {
    armazenamento()?.removeItem(CHAVE_HANDOFF);
  } catch {
    /* nada a fazer */
  }
}
