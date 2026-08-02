// ─────────────────────────────────────────────────────────────────────
//  POST /api/documentos/recibos — o mapa de recibos, composto no servidor
//  ---------------------------------------------------------------------
//  As mesmas quatro decisões da rota do vencimento, e uma diferença:
//
//  Aqui o cliente ENVIA os recibos, porque é ele quem os tem — vivem no
//  `localStorage` do browser, o servidor nunca os viu. O que o servidor não
//  aceita são os valores CALCULADOS: recebe o recibo em bruto e volta a passar
//  cada um por `calcularRecibo`. Se aceitasse totais vindos do `fetch`, um
//  documento com o cabeçalho da marca podia dizer qualquer coisa.
//
//  Como no vencimento, NADA fica guardado além da linha de verificação.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assinar, podeExportar, registarEmissao, requerente, urlCompositor } from "@/lib/documentos/emissao";
import { criarProveniencia } from "@/lib/export/referencia";
import { dadosTypst, type DocumentoRecibos } from "@/lib/export/documento-recibos";
import { contentDisposition, nomeFicheiro } from "@/lib/export/nomes";
import type { Recibo } from "@/lib/store/recibos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE = { pedidos: 20, janelaMs: 60_000 };

/** Acima disto o documento deixa de ser legível e passa a ser um ataque. */
const MAX_RECIBOS = 2_000;

const AMBITO = [
  "Lista os recibos guardados na aplicação, não os comunicados ao Portal das Finanças.",
  "A retenção na fonte indicada é a do recibo; o IRS final apura-se na declaração anual.",
  "A Segurança Social mostrada é a contribuição estimada sobre a base declarada.",
  "Não substitui a fatura-recibo emitida no Portal das Finanças.",
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

  let corpo: {
    recibos?: Recibo[];
    periodo?: string;
    filtros?: { rotulo: string; valor: string }[];
  };
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: "Corpo não é JSON válido." }, { status: 400 });
  }

  const recibos = corpo.recibos;
  if (!Array.isArray(recibos) || recibos.length === 0) {
    return NextResponse.json({ erro: "Não há recibos para exportar." }, { status: 400 });
  }
  if (recibos.length > MAX_RECIBOS) {
    return NextResponse.json(
      { erro: `O mapa aceita até ${MAX_RECIBOS} recibos de cada vez.` },
      { status: 413 },
    );
  }

  const proveniencia = await criarProveniencia("recibos", { recibos, periodo: corpo.periodo });
  const documento: DocumentoRecibos = {
    periodo: corpo.periodo ?? "",
    proveniencia,
    recibos,
    filtros: corpo.filtros ?? [],
    ambito: AMBITO,
  };

  // ── A composição ────────────────────────────────────────────────────────
  let dados: ReturnType<typeof dadosTypst>;
  try {
    dados = dadosTypst(documento);
  } catch (erro) {
    // Um recibo com um tipo ou um regime que o motor não conhece chega aqui.
    return NextResponse.json(
      { erro: "Há um recibo que o motor não reconhece.", detalhe: erro instanceof Error ? erro.message : "" },
      { status: 400 },
    );
  }

  const payload = JSON.stringify({ tipo: "recibos", dados });
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
    tipo: "recibos",
    utilizador: quem.id,
    motor: proveniencia.motor,
  });

  const nome = nomeFicheiro({
    assunto: "mapa de recibos",
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
