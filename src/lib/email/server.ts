import "server-only";
import { Resend } from "resend";
import { EMAIL_REMETENTE } from "@/lib/contacto";

let instancia: Resend | null = null;

export function getResend(): Resend {
  if (instancia) return instancia;

  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    throw new Error("RESEND_API_KEY não definida.");
  }

  instancia = new Resend(chave);
  return instancia;
}

/** O remetente. Vive em `@/lib/contacto`, com os outros endereços da marca. */
export const EMAIL_FROM = EMAIL_REMETENTE;
