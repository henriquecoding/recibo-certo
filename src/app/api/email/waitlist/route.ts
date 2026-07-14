import { NextResponse, type NextRequest } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailBoasVindasWaitlist } from "@/lib/email/templates";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { emailValido, normalizarEmail } from "@/lib/validacao-email";

export async function POST(req: NextRequest) {
  try {
    // Rate limit por IP: impede uso como relay de email / email-bombing.
    const rl = rateLimit(`email:waitlist:${clientIp(req)}`, 5, 60 * 60 * 1000); // 5/hora
    if (!rl.ok) {
      return NextResponse.json(
        { erro: "Demasiados pedidos. Tenta novamente mais tarde." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const { email: raw } = (await req.json()) as { email?: unknown };
    if (!emailValido(raw)) {
      return NextResponse.json({ erro: "Email inválido." }, { status: 400 });
    }
    const email = normalizarEmail(raw);

    const template = emailBoasVindasWaitlist(email);
    const resultado = await enviarEmail({ to: email, ...template });

    if (resultado.erro) {
      console.error("[email/waitlist]", resultado.erro);
      return NextResponse.json({ erro: resultado.erro }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: resultado.id });
  } catch (err) {
    console.error("[email/waitlist]", err);
    return NextResponse.json({ erro: "Erro ao enviar email." }, { status: 500 });
  }
}
