import { NextResponse, type NextRequest } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailBoasVindasWaitlist } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ erro: "Email em falta." }, { status: 400 });
    }

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
