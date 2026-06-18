"use client";

// ─────────────────────────────────────────────────────────────────────
//  Consentimento de cookies — modelo por categorias (RGPD).
//  · Necessários: sempre ativos (não desligáveis).
//  · Estatística: medição de utilização (opt-in).
//  · Marketing e personalização: anúncios/personalização (opt-in).
//  A escolha fica em localStorage. Qualquer script não-essencial deve ser
//  carregado apenas após consentimento da respetiva categoria (usar
//  `lerConsentimento()` / o hook `useCookieConsent`).
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export interface CookieConsent {
  necessarios: true;
  estatistica: boolean;
  marketing: boolean;
  /** ISO timestamp da decisão. */
  data: string;
  versao: number;
}

export const CONSENT_STORAGE_KEY = "recibocerto:cookie-consent";
/** Subir quando as categorias/política mudarem → repede o consentimento. */
export const CONSENT_VERSION = 1;

/** Evento para (re)abrir o painel de preferências (ex.: link do rodapé). */
export const ABRIR_PREFERENCIAS_EVENT = "recibocerto:abrir-cookies";
/** Evento emitido quando o consentimento muda. */
export const CONSENT_CHANGED_EVENT = "recibocerto:cookie-consent-changed";

export function lerConsentimento(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<CookieConsent>;
    if (!c || c.versao !== CONSENT_VERSION) return null;
    return {
      necessarios: true,
      estatistica: !!c.estatistica,
      marketing: !!c.marketing,
      data: typeof c.data === "string" ? c.data : new Date().toISOString(),
      versao: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

export function guardarConsentimento(escolha: { estatistica: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = {
    necessarios: true,
    estatistica: escolha.estatistica,
    marketing: escolha.marketing,
    data: new Date().toISOString(),
    versao: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* ignora (modo privado/sem storage) */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: consent }));
  return consent;
}

/** Abre o painel de preferências de cookies (a partir de qualquer parte da app). */
export function abrirPreferenciasCookies(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ABRIR_PREFERENCIAS_EVENT));
}

/** Lê o consentimento atual de forma reativa (atualiza quando muda). */
export function useCookieConsent(): CookieConsent | null {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  useEffect(() => {
    setConsent(lerConsentimento());
    const onChange = () => setConsent(lerConsentimento());
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);
  return consent;
}
