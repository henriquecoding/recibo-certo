import { getResend, EMAIL_FROM } from "./server";

interface EmailOpts {
  to: string | string[];
  subject: string;
  html: string;
}

export async function enviarEmail(opts: EmailOpts): Promise<{ id?: string; erro?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    });

    if (error) return { erro: error.message };
    return { id: data?.id };
  } catch (e) {
    return { erro: (e as Error).message };
  }
}
