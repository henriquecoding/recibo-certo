import { getResend, EMAIL_FROM } from "./server";

interface EmailOpts {
  to: string | string[];
  subject: string;
  html: string;
  /** Reentregas do mesmo webhook não podem enviar a mesma mensagem duas vezes. */
  idempotencyKey?: string;
}

export async function enviarEmail(opts: EmailOpts): Promise<{ id?: string; erro?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    }, opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined);
    if (error) return { erro: error.message };
    return { id: data?.id };
  } catch (error) {
    return { erro: error instanceof Error ? error.message : "Erro de email desconhecido." };
  }
}
