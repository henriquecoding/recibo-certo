// ─────────────────────────────────────────────────────────────────────
//  POST /api/documentos/irs — a declaração simulada, composta no servidor
//  ---------------------------------------------------------------------
//  As mesmas decisões das outras duas rotas. Aqui o ponto que mais importa é
//  o primeiro: o cliente envia a ENTRADA da simulação, nunca o resultado. Um
//  documento que diz «reembolso estimado» com o cabeçalho da marca tem de ter
//  sido apurado por nós, ou não vale nada — e alguém que edite o `fetch` não
//  pode conseguir imprimir o reembolso que quiser.
//
//  Como nas outras, NADA fica guardado além da linha de verificação.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assinar, podeExportar, registarEmissao, requerente, urlCompositor } from "@/lib/documentos/emissao";
import { simularDeclaracaoIRS, type DeclaracaoInput } from "@/lib/fiscal";
import { criarProveniencia } from "@/lib/export/referencia";
import { dadosTypst, type DocumentoIRS } from "@/lib/export/documento-irs";
import { contentDisposition, nomeFicheiro } from "@/lib/export/nomes";
import { FISCAL_YEAR } from "@/lib/fiscal-data";
import type { CabecalhoDeclaracao } from "@/lib/export-irs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE = { pedidos: 20, janelaMs: 60_000 };

const AMBITO = [
  "É uma estimativa informativa: não substitui a declaração Modelo 3 entregue à Autoridade Tributária.",
  "Assume que os valores introduzidos estão completos e corretamente enquadrados por categoria.",
  "Não modela benefícios fiscais fora dos indicados, nem regimes negociados caso a caso.",
  "A Segurança Social da categoria B é devida à parte e não entra no apuramento do IRS.",
];

export async function POST(pedido: Request) {
  const ip = clientIp(pedido);
  if (!rateLimit(`documentos:${ip}`, LIMITE.pedidos, LIMITE.janelaMs).ok) {
    return NextResponse.json({ erro: "Demasiados pedidos. Tenta daqui a um minuto." }, { status: 429 });
  }

  const quem = await requerente(pedido);
  if (!quem) {
    return NextResponse.json({ erro: "Inicia sessão para exportar." }, { status: 401 });
  }
  if (!podeExportar(quem, "export.pdf")) {
    return NextResponse.json(
      { erro: "A exportação em PDF é uma funcionalidade do Plus.", codigo: "plano_necessario" },
      { status: 402 },
    );
  }

  let corpo: { entrada?: DeclaracaoInput; cabecalho?: CabecalhoDeclaracao; periodo?: string };
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: "Corpo não é JSON válido." }, { status: 400 });
  }

  const entrada = corpo.entrada;
  if (!entrada || typeof entrada !== "object") {
    return NextResponse.json({ erro: "Faltam os dados da simulação." }, { status: 400 });
  }

  // ── O cálculo, com o MESMO motor que a interface usa ────────────────────
  let resultado: ReturnType<typeof simularDeclaracaoIRS>;
  try {
    resultado = simularDeclaracaoIRS(entrada);
  } catch (erro) {
    return NextResponse.json(
      { erro: "A simulação não pôde ser apurada.", detalhe: erro instanceof Error ? erro.message : "" },
      { status: 400 },
    );
  }

  const proveniencia = await criarProveniencia("irs", { entrada });
  const documento: DocumentoIRS = {
    periodo: corpo.periodo ?? String(FISCAL_YEAR),
    proveniencia,
    resultado,
    cabecalho: corpo.cabecalho,
    ambito: AMBITO,
  };

  // ── A composição ────────────────────────────────────────────────────────
  const payload = JSON.stringify({ tipo: "irs", dados: dadosTypst(documento) });
  let resposta: Response;
  try {
    resposta = await fetch(urlCompositor(pedido), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-documento-assinatura": await assinar(payload),
      },
      body: payload,
    });
  } catch (erro) {
    return NextResponse.json(
      { erro: "O compositor não respondeu.", detalhe: erro instanceof Error ? erro.message : "" },
      { status: 502 },
    );
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    return NextResponse.json(
      { erro: "Não foi possível compor o documento.", detalhe: detalhe.slice(0, 500) },
      { status: 502 },
    );
  }

  const pdf = await resposta.arrayBuffer();

  // Perder a linha de verificação é mau; negar o ficheiro já composto é pior.
  const registo = await registarEmissao({
    referencia: proveniencia.referencia,
    digest: proveniencia.digest,
    tipo: "irs",
    utilizador: quem.id,
    motor: proveniencia.motor,
  });

  const nome = nomeFicheiro({
    assunto: "declaracao de irs",
    periodo: documento.periodo,
    referencia: proveniencia.referencia,
    extensao: "pdf",
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": contentDisposition(nome),
      "cache-control": "no-store",
      "x-documento-referencia": proveniencia.referencia,
      "x-documento-digest": proveniencia.digest,
      "x-documento-registado": registo.registado ? "sim" : "nao",
    },
  });
}
