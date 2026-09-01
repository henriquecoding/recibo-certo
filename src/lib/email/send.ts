import { getResend, EMAIL_FROM } from "./server";
import { htmlParaTexto } from "./texto";
import { EMAIL_APOIO } from "@/lib/contacto";

interface EmailOpts {
  to: string | string[];
  subject: string;
  html: string;
  /** Reentregas do mesmo webhook não podem enviar a mesma mensagem duas vezes. */
  idempotencyKey?: string;
  /**
   * URL onde a pessoa desliga ESTE tipo de aviso.
   *
   * Só para emails que se subscrevem — alertas do Guardião, IVA,
   * Segurança Social. Um recibo de compra ou uma confirmação de conta
   * não se «cancela», e pôr lá o cabeçalho convidaria alguém a tentar.
   */
  desinscrever?: string;
}

export async function enviarEmail(opts: EmailOpts): Promise<{ id?: string; erro?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      // Sem isto, responder a um email nosso ia para uma caixa que
      // ninguém lê. Quem responde a um alerta fiscal está a fazer uma
      // pergunta — e merece que ela chegue a alguém.
      replyTo: EMAIL_APOIO,
      subject: opts.subject,
      html: opts.html,
      // Derivada do HTML: ver `texto.ts`.
      text: htmlParaTexto(opts.html),
      ...(opts.desinscrever ? {
        headers: {
          // Requisito de remetentes do Gmail e do Yahoo desde 2024.
          //
          // Duas vias, de propósito: a página, para quem clica no cliente
          // de email, e o `mailto:`, que funciona mesmo que a pessoa não
          // tenha sessão iniciada.
          //
          // NÃO se declara `List-Unsubscribe-Post: One-Click`. Esse
          // cabeçalho promete um endereço que cancela a subscrição num
          // único POST, sem mais nada — e nós não temos um. Declará-lo
          // sem o ter faria o botão do Gmail parecer que funcionou
          // quando não fez nada, que é pior do que não o ter.
          "List-Unsubscribe": `<${opts.desinscrever}>, <mailto:${EMAIL_APOIO}?subject=${encodeURIComponent("Cancelar alertas")}>`,
        },
      } : {}),
    }, opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined);
    if (error) return { erro: error.message };
    return { id: data?.id };
  } catch (error) {
    return { erro: error instanceof Error ? error.message : "Erro de email desconhecido." };
  }
}
