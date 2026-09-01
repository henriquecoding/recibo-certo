// ═══════════════════════════════════════════════════════════════════════
//  O REENCAMINHAMENTO DO CORREIO DO DOMÍNIO — RC-EMAIL-002
//  ---------------------------------------------------------------------
//  O domínio `recibocerto.pt` não tinha registo MX: não recebia email
//  nenhum. Na prática, `apoio@`, `ola@` e `admin@recibocerto.pt` eram
//  endereços que se podiam escrever mas a que ninguém podia responder —
//  incluindo o `admin@recibocerto.pt` que já era cliente na Stripe e a
//  quem um recibo nunca chegaria.
//
//  A alternativa óbvia era contratar caixa de correio. Esta é mais
//  barata e chega para o que é preciso agora: a Resend, que já enviava,
//  passa também a RECEBER, e tudo o que chega ao domínio é reencaminhado
//  para a caixa que a pessoa já lê todos os dias.
//
//  ── O que é preciso do lado de fora ──────────────────────────────────
//    1. MX no ápex → `inbound-smtp.eu-west-1.amazonaws.com` (prio 10)
//    2. Webhook `email.received` da Resend a apontar para esta rota
//    3. `RESEND_WEBHOOK_SECRET` e `EMAIL_REENCAMINHAR_PARA` no ambiente
//  Ver `docs/IDENTIDADE-PASSO-A-PASSO.md`.
//
//  ── Porque é que o destino é uma variável de ambiente ────────────────
//  É uma caixa de correio pessoal. Escrita no código, ficava no histórico
//  do git para sempre e mudá-la exigia um deploy. Fora dele, muda-se no
//  painel da Vercel em dez segundos — que é a cadência a que uma caixa de
//  correio de facto muda.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getResend } from "@/lib/email/server";
import { EMAIL_REMETENTE } from "@/lib/contacto";

export const runtime = "nodejs";
// O corpo tem de chegar byte a byte como a Resend o assinou. Qualquer
// cache ou reserialização invalida a assinatura.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const segredo = process.env.RESEND_WEBHOOK_SECRET;
  const destino = process.env.EMAIL_REENCAMINHAR_PARA;

  // Sem configuração não se lê sequer o corpo do pedido. E responde-se
  // 503, não 200: um 200 diria à Resend que a mensagem foi tratada, e ela
  // deixaria de tentar. Melhor ficar na fila dela até isto estar ligado.
  if (!segredo || !destino) {
    console.error(
      "[email/receber] Falta RESEND_WEBHOOK_SECRET ou EMAIL_REENCAMINHAR_PARA — nada é reencaminhado.",
    );
    return NextResponse.json(
      { erro: "Reencaminhamento não configurado.", motivo: "sem_configuracao" },
      { status: 503 },
    );
  }

  const corpo = await req.text();

  // A Resend assina à maneira do Svix: três cabeçalhos e o corpo EM BRUTO.
  // Reserializar o JSON antes de verificar invalidaria a assinatura, e é o
  // erro clássico desta integração — daí o `req.text()` acima.
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ erro: "Pedido sem assinatura." }, { status: 401 });
  }

  let evento;
  try {
    evento = getResend().webhooks.verify({
      payload: corpo,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: segredo,
    });
  } catch {
    // Sem detalhes na resposta: quem não assina não precisa de saber
    // porque falhou.
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  // Um webhook subscreve um tipo de evento, mas a Resend pode entregar
  // outros. O que não é correio recebido confirma-se e ignora-se — 200,
  // para não entrar na fila de repetições dela.
  if (evento.type !== "email.received") {
    return NextResponse.json({ ok: true, ignorado: evento.type });
  }

  const { email_id: emailId, from, subject } = evento.data;

  // Trava de ciclo. Uma resposta automática da caixa de destino (férias,
  // ausência) voltaria a entrar aqui e seria reencaminhada outra vez, e
  // outra. Comparar o endereço basta: é o único remetente que fecha o
  // ciclo.
  if (enderecoDe(from) === enderecoDe(destino)) {
    console.warn("[email/receber] Ignorado: viria da própria caixa de destino.");
    return NextResponse.json({ ok: true, ignorado: "ciclo" });
  }

  try {
    const { data, error } = await getResend().emails.receiving.forward(
      {
        emailId,
        to: destino,
        // Tem de sair de um domínio que assinamos. Sair em nome do
        // remetente original faria o SPF e o DMARC dele falhar, e a
        // mensagem seria classificada como falsificada — que é o que
        // acontece a quase todos os reencaminhamentos feitos à mão.
        from: EMAIL_REMETENTE,
        passthrough: true,
      },
      // A Resend repete um webhook que não recebeu 200. Sem isto, uma
      // repetição entregava a mesma mensagem duas vezes.
      { idempotencyKey: `reencaminhar-${emailId}` },
    );

    if (error) {
      console.error("[email/receber] A Resend recusou o reencaminhamento:", error.message);
      // 500 para entrar na fila de repetições: a mensagem existe e ainda
      // não foi entregue a ninguém.
      return NextResponse.json({ erro: "Reencaminhamento falhou." }, { status: 500 });
    }

    // O assunto ajuda a seguir o rasto num registo; o corpo nunca entra.
    console.log(`[email/receber] Reencaminhado ${emailId} (${subject?.slice(0, 60) ?? "sem assunto"}) → ${data?.id}`);
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (erro) {
    console.error("[email/receber]", erro);
    return NextResponse.json({ erro: "Reencaminhamento falhou." }, { status: 500 });
  }
}

/** `Nome <a@b.pt>` → `a@b.pt`, em minúsculas. */
function enderecoDe(valor: string): string {
  const entreSinais = valor.match(/<([^>]+)>/);
  return (entreSinais ? entreSinais[1] : valor).trim().toLowerCase();
}
