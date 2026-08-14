import { NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailAuditoriaRecibo } from "@/lib/email/templates";
import { auditarRecibo } from "@/lib/fiscal-dependente";
import { userDoPedido } from "@/lib/supabase/verify-request-user";
import { utilizadorTemPlus } from "@/lib/billing/access";

export async function POST(req: Request) {
  const user = await userDoPedido(req);
  if (!user?.email) return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  try {
    if (!await utilizadorTemPlus(user.id)) {
      return NextResponse.json({ erro: "Funcionalidade Plus." }, { status: 403 });
    }
  } catch (error) {
    console.error("[email/auditoria] Falha ao confirmar acesso:", error);
    return NextResponse.json({ erro: "Não foi possível confirmar o plano." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as {
    salarioBruto?: number;
    dependentes?: number;
    irsDeclarado?: number;
    ssDeclarado?: number;
  };
  const salarioBruto = Math.max(0, Number(body.salarioBruto) || 0);
  const dependentes = Math.max(0, Math.floor(Number(body.dependentes) || 0));
  const irsDeclarado = Math.max(0, Number(body.irsDeclarado) || 0);
  const ssDeclarado = Math.max(0, Number(body.ssDeclarado) || 0);
  const result = auditarRecibo({ salarioBruto, dependentes, irsDeclarado, ssDeclarado });
  const template = emailAuditoriaRecibo({
    salarioBruto,
    ssEsperado: result.ssEsperado,
    irsEsperado: result.irsEsperado,
    ssDeclarado,
    irsDeclarado,
    tudoOk: result.tudoOk,
    alertas: result.alertas,
  });
  const sent = await enviarEmail({ to: user.email, ...template });
  if (sent.erro) return NextResponse.json({ erro: sent.erro }, { status: 500 });
  return NextResponse.json({ ok: true });
}
