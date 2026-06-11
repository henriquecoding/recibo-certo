import { Resend } from "resend";

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

export const EMAIL_FROM = "ReciboCerto <noreply@recibocerto.pt>";
