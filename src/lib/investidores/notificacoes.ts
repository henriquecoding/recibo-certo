// Notificações do pipeline de investidores.
//
// Um contacto que chega à base de dados e não avisa ninguém é um contacto
// perdido: o relatório encontrou o fluxo a terminar no `insert`, sem email
// interno, sem confirmação a quem escreveu e sem prazo de resposta.
//
// Duas mensagens, e uma regra sobre o que vai lá dentro:
//
//  · o alerta INTERNO não reproduz o contacto todo. Diz que chegou, de quem
//    (nome e organização), o que pediu, e manda abrir o painel. O email é uma
//    superfície que se reencaminha, arquiva e indexa; a PII fica na base de
//    dados, atrás de autenticação.
//  · a confirmação a QUEM ESCREVEU fecha o ciclo e diz quando terá resposta.
//
// Nenhuma das duas pode fazer a rota falhar: um lead guardado com o email por
// enviar é muito melhor do que um lead perdido porque o Resend estava em baixo.

import "server-only";
import { enviarEmail } from "@/lib/email/send";
import { EMAIL_INVESTIDORES, SLA_RESPOSTA } from "@/app/investidores/_data/legal";

const SITE = "https://www.recibocerto.pt";

const INTERESSE_LEGIVEL: Record<string, string> = {
  deck: "Receber o deck",
  intro: "Marcar uma apresentação",
  "strategic-partnership": "Parceria estratégica",
};

export interface DadosNotificacao {
  nome: string;
  organizacao: string;
  interesse: string;
  email: string;
}

/** Envelope comum, no tom do resto dos emails do produto. */
function moldura(titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:24px;background:#edeae0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a17">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0f6e56">Recibo Certo</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${titulo}</h1>
    ${corpo}
  </div>
</body></html>`;
}

/**
 * Avisa a equipa. Sem email, telefone nem mensagem — só o suficiente para
 * decidir a prioridade e abrir o painel.
 */
export async function alertarEquipa(dados: DadosNotificacao): Promise<void> {
  const interesse = INTERESSE_LEGIVEL[dados.interesse] ?? dados.interesse;
  const html = moldura(
    "Novo contacto de investidor",
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       <strong>${escapar(dados.nome)}</strong>${dados.organizacao ? ` · ${escapar(dados.organizacao)}` : ""}<br>
       Pedido: <strong>${escapar(interesse)}</strong>
     </p>
     <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#57534e">
       O contacto completo está no painel — não é reproduzido aqui de propósito.
       Prazo de primeira resposta: ${SLA_RESPOSTA}.
     </p>
     <a href="${SITE}/admin/propostas" style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600">Abrir no painel</a>`,
  );

  await enviarEmail({ to: EMAIL_INVESTIDORES, subject: `Investidor: ${dados.nome} · ${interesse}`, html });
}

/** Confirma a quem escreveu, com prazo. */
export async function confirmarAoInvestidor(dados: DadosNotificacao): Promise<void> {
  const html = moldura(
    "Recebemos o seu contacto",
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">Olá ${escapar(dados.nome)},</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Recebemos o seu pedido e respondemos ${SLA_RESPOSTA}.
     </p>
     <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#57534e">
       Entretanto, o produto está aberto e sem registo — é a forma mais rápida
       de perceber o que fazemos.
     </p>
     <a href="${SITE}" style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600">Ver o Recibo Certo</a>
     <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#78716c">
       Se não foi você que preencheu o formulário, responda a este email e
       eliminamos o registo.
     </p>`,
  );

  await enviarEmail({ to: dados.email, subject: "Recebemos o seu contacto — Recibo Certo", html });
}

/**
 * Dispara as duas, sem deixar que qualquer uma derrube a outra nem o pedido.
 * Devolve o que falhou para a rota poder registar (sem PII).
 */
export async function notificarNovoLead(dados: DadosNotificacao): Promise<{ falhas: string[] }> {
  const resultados = await Promise.allSettled([alertarEquipa(dados), confirmarAoInvestidor(dados)]);
  const nomes = ["alerta_equipa", "confirmacao_investidor"];
  return { falhas: resultados.flatMap((r, i) => (r.status === "rejected" ? [nomes[i]] : [])) };
}

/** Escapa o que vai para HTML — os nomes vêm de um formulário público. */
function escapar(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
