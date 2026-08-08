"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O TRACKER — pequeno, estável e auditável
//  ---------------------------------------------------------------------
//  §8: «A instrumentação deve ser pequena, estável e auditável. O objetivo
//  não é gravar tudo; é ligar origem, intenção, conclusão, retorno e
//  desfecho comercial sem recolher dados fiscais desnecessários.»
//
//  Sem dependências externas — nem Google Analytics, nem PostHog, nem
//  Plausible. Não é purismo: cada uma dessas escolhas é um subcontratante
//  a declarar, uma transferência a justificar e um script de terceiros no
//  caminho crítico de páginas que têm de continuar a funcionar sem
//  JavaScript (§9.2). O relatório pede uma camada de medição, não um
//  fornecedor. Quando houver um, entra por trás desta mesma interface.
//
//  Quatro portas, por esta ordem, antes de um evento sair do dispositivo:
//
//   1. CONSENTIMENTO — sem a categoria «estatística» aceite, nada sai e
//      nenhum identificador é criado. Não há modo «anónimo na mesma».
//   2. CATÁLOGO — o evento tem de existir em `eventos.ts`.
//   3. ORIGEM — eventos de receita não podem nascer no browser.
//   4. PII — a barreira de `pii.ts` corre sobre o payload final.
// ═══════════════════════════════════════════════════════════════════════

import { APP_VERSION } from "@/lib/version";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_VERSION,
  lerConsentimento,
} from "@/lib/cookie-consent";
import {
  CATALOGO,
  eventoConhecido,
  type NomeEvento,
  type PayloadsEvento,
} from "./eventos";
import {
  esquecerIdentidade,
  garantirAnonymousId,
  lerAtribuicao,
  origemAtual,
  propriedadesDeOrigem,
  registarVisita,
} from "./identidade";
import { verificarSemPII } from "./pii";

const ENDPOINT = "/api/analytics";
/** Eventos acumulados antes de irem em lote — poupa pedidos e bateria. */
const LOTE_MAXIMO = 12;
const INTERVALO_MS = 5_000;

interface EventoEnviado {
  nome: NomeEvento;
  props: Record<string, unknown>;
  em: string;
  sessao: string;
  ator: string;
}

let fila: EventoEnviado[] = [];
let temporizador: ReturnType<typeof setTimeout> | null = null;
let sessaoId = "";
let visitaRegistada = false;

function medicaoPermitida(): boolean {
  return lerConsentimento()?.estatistica === true;
}

function idDeSessao(): string {
  if (sessaoId) return sessaoId;
  sessaoId =
    globalThis.crypto?.randomUUID?.() ??
    `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return sessaoId;
}

/**
 * Regista a visita uma vez por carregamento, para que a atribuição exista
 * antes do primeiro evento. Sem isto, o primeiro evento de cada sessão
 * chegava sem origem — justamente o evento que mais interessa atribuir.
 */
function garantirVisita(): void {
  if (visitaRegistada || typeof window === "undefined") return;
  visitaRegistada = true;
  registarVisita(origemAtual(window.location.href, document.referrer));
}

/**
 * Emite um evento. Falha em silêncio para o utilizador e em voz alta para
 * quem programa: um evento recusado avisa na consola em desenvolvimento e
 * nunca interrompe o que a pessoa estava a fazer.
 */
export function registar<N extends NomeEvento>(nome: N, props: PayloadsEvento[N]): void {
  if (typeof window === "undefined") return;
  if (!medicaoPermitida()) return;

  if (!eventoConhecido(nome)) {
    avisar(`evento desconhecido "${nome}" — declarar em analytics/eventos.ts`);
    return;
  }
  if (CATALOGO[nome].origem === "servidor") {
    avisar(`"${nome}" só pode ser emitido no servidor — ver DefinicaoEvento.origem`);
    return;
  }

  garantirVisita();
  const ator = garantirAnonymousId();
  if (!ator) return; // sem storage não há medição; a app continua igual

  const completo: Record<string, unknown> = {
    ...props,
    ...propriedadesDeOrigem(lerAtribuicao()),
    app_version: APP_VERSION,
    ano_fiscal: FISCAL_YEAR,
    consent_version: CONSENT_VERSION,
  };

  const verificacao = verificarSemPII(completo);
  if (!verificacao.ok) {
    avisar(`evento "${nome}" recusado: ${verificacao.motivo}`);
    return;
  }

  fila.push({ nome, props: completo, em: new Date().toISOString(), sessao: idDeSessao(), ator });
  if (fila.length >= LOTE_MAXIMO) descarregar();
  else agendar();
}

function agendar(): void {
  if (temporizador) return;
  temporizador = setTimeout(() => {
    temporizador = null;
    descarregar();
  }, INTERVALO_MS);
}

/** Envia o que está em fila. `keepalive` para sobreviver ao fecho da página. */
export function descarregar(): void {
  if (fila.length === 0) return;
  const lote = fila;
  fila = [];
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }

  const corpo = JSON.stringify({ eventos: lote });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corpo,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* perder medição nunca é motivo para partir a página */
  }
}

function avisar(mensagem: string): void {
  if (process.env.NODE_ENV !== "production") console.warn(`[analytics] ${mensagem}`);
}

/**
 * Liga o tracker ao ciclo de vida da página. Chamado uma vez, no arranque.
 * Devolve a função de limpeza.
 */
export function iniciarMedicao(): () => void {
  if (typeof window === "undefined") return () => {};

  const aoSair = () => descarregar();
  const aoEsconder = () => {
    if (document.visibilityState === "hidden") descarregar();
  };
  /** Se o consentimento for retirado, esquecer a identidade e a fila. */
  const aoMudarConsentimento = () => {
    if (!medicaoPermitida()) {
      fila = [];
      esquecerIdentidade();
    } else {
      garantirVisita();
    }
  };

  window.addEventListener("pagehide", aoSair);
  document.addEventListener("visibilitychange", aoEsconder);
  window.addEventListener(CONSENT_CHANGED_EVENT, aoMudarConsentimento);
  if (medicaoPermitida()) garantirVisita();

  return () => {
    window.removeEventListener("pagehide", aoSair);
    document.removeEventListener("visibilitychange", aoEsconder);
    window.removeEventListener(CONSENT_CHANGED_EVENT, aoMudarConsentimento);
    descarregar();
  };
}
