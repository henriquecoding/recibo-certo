// ═══════════════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DA INTEGRAÇÃO FIZ
//  ---------------------------------------------------------------------
//  A parceria só entra em produção quando as duas equipas validarem o
//  percurso completo (ponto 3 da arquitetura: "não existe lançamento
//  provisório"). Até lá a integração vive atrás de uma bandeira.
//
//  Estado da integração:
//    · "desligada"      → NEXT_PUBLIC_FIZ_ENABLED != "true". Nada aparece.
//    · "sem_credenciais"→ ligada mas sem segredos: a UI mostra o estado
//                          neutro de indisponibilidade e o Guia continua
//                          totalmente utilizável.
//    · "pronta"         → credenciais presentes; chamadas reais.
//
//  Nenhum segredo tem prefixo NEXT_PUBLIC_ — só a bandeira é pública.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { fizAtiva as bandeiraAtiva } from "./flag";

export type EstadoIntegracao = "desligada" | "sem_credenciais" | "pronta";

const AMBIENTES = {
  sandbox: {
    api: "https://sandbox-partners-api.fiz.co",
    authorize: "https://app.fiz.co/oauth/authorize",
  },
  production: {
    api: "https://partners-api.fiz.co",
    authorize: "https://app.fiz.co/oauth/authorize",
  },
} as const;

export type AmbienteFiz = keyof typeof AMBIENTES;

// A bandeira vive em `flag.ts` (isomórfico) e é reexportada aqui para que
// exista UMA só regra de ativação. Ter uma cópia local foi um erro: o
// servidor dizia "desligada" enquanto a interface já mostrava a integração.
export { fizAtiva } from "./flag";

function ambiente(): AmbienteFiz {
  return process.env.FIZ_ENVIRONMENT === "production" ? "production" : "sandbox";
}

/** Configuração do servidor. Nunca importar isto de um componente cliente. */
export function fizServerConfig() {
  const amb = ambiente();
  return {
    ambiente: amb,
    apiBaseUrl: process.env.FIZ_API_BASE_URL ?? AMBIENTES[amb].api,
    authorizeUrl: process.env.FIZ_OAUTH_AUTHORIZE_URL ?? AMBIENTES[amb].authorize,
    clientId: process.env.FIZ_CLIENT_ID ?? "",
    clientSecret: process.env.FIZ_CLIENT_SECRET ?? "",
    /** Segredo partilhado para verificar a assinatura dos webhooks. */
    webhookSecret: process.env.FIZ_WEBHOOK_SECRET ?? "",
    /** Chave de cifra dos refresh tokens em repouso (32 bytes em base64). */
    tokenEncryptionKey: process.env.FIZ_TOKEN_ENCRYPTION_KEY ?? "",
    referralCode: process.env.FIZ_REFERRAL_CODE ?? "recibocerto",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    /** Margem de segurança antes de considerar um access token expirado. */
    margemExpiracaoSegundos: 60,
    /** Ponto 20 da arquitetura: expiração do handoff ≤ 30 min. */
    handoffTtlSegundos: 15 * 60,
    /** Tolerância de relógio na verificação de webhooks. */
    toleranciaWebhookSegundos: 5 * 60,
    timeoutMs: 8_000,
  };
}

export function estadoIntegracao(): EstadoIntegracao {
  if (!bandeiraAtiva()) return "desligada";
  const c = fizServerConfig();
  const completa = Boolean(c.clientId && c.clientSecret && c.tokenEncryptionKey);
  return completa ? "pronta" : "sem_credenciais";
}

export const redirectUri = (): string => `${fizServerConfig().appUrl}/api/integrations/fiz/callback`;

/** Versão do documento de consentimento apresentado ao utilizador.
    Subir sempre que os campos ou a finalidade mudarem — fica gravada em
    cada recibo de consentimento. */
export const POLITICA_CONSENTIMENTO_VERSAO = "2026-07-26.1" as const;
