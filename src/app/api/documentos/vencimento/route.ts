// ─────────────────────────────────────────────────────────────────────
//  POST /api/documentos/vencimento — o relatório, composto no servidor
//  ---------------------------------------------------------------------
//  Quatro decisões, e as razões:
//
//  1. O CÁLCULO é do servidor. O cliente envia PRESSUPOSTOS, nunca resultados.
//     Se enviasse resultados, o documento assinado pela marca podia dizer
//     qualquer coisa que alguém escrevesse no `fetch`.
//  2. O DIREITO é verificado aqui. Enquanto o PDF era gerado no cliente,
//     `localStorage.clear()` devolvia as exportações todas — o servidor nunca
//     via o pedido.
//  3. 402 quando falta o plano, para o cliente abrir o upsell pelo CÓDIGO e
//     não por comparação de strings.
//  4. SEM RETENÇÃO: nada é escrito além da linha de verificação (referência,
//     digest, data). Não os dados.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assinar, podeExportar, registarEmissao, requerente, urlCompositor } from "@/lib/documentos/emissao";
import { calculateLegacyPayroll, employerCost, includeMonthlyDuodecimos } from "@/lib/payroll-simulator-legacy-adapter";
import { calcularVencimentoAnual } from "@/lib/fiscal-dependente";
import { criarProveniencia } from "@/lib/export/referencia";
import { dadosTypst, type DocumentoVencimento } from "@/lib/export/documento-vencimento";
import { contentDisposition, nomeFicheiro } from "@/lib/export/nomes";
import { DATA_LAST_REVIEW, SS_DEPENDENTE } from "@/lib/fiscal-data";
import { pctDoc } from "@/lib/export/dinheiro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compor um PDF custa CPU; sem teto, um pedido em ciclo esgota a função. */
const LIMITE = { pedidos: 20, janelaMs: 60_000 };

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
    contexto?: Parameters<typeof calculateLegacyPayroll>[0];
    rubricas?: Parameters<typeof calculateLegacyPayroll>[1];
    duodecimos?: boolean;
    periodo?: string;
    pressupostos?: { codigo: string; rotulo: string; valor: string }[];
  };
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: "Corpo não é JSON válido." }, { status: 400 });
  }

  const contexto = corpo.contexto;
  if (!contexto || typeof contexto.baseSalary !== "number") {
    return NextResponse.json({ erro: "Faltam os pressupostos do recibo." }, { status: 400 });
  }

  // ── O cálculo, com o MESMO motor que a interface usa ────────────────────
  const rubricas = includeMonthlyDuodecimos(corpo.rubricas ?? [], contexto.baseSalary, !!corpo.duodecimos);
  const calculo = calculateLegacyPayroll(contexto, rubricas);
  const anual = calcularVencimentoAnual({
    salarioBruto: contexto.baseSalary,
    dependentes: contexto.dependants,
    dependentesDeficientes: contexto.dependantsWithDisability,
    fatorDependenteDeficiente: contexto.disabilityFactor,
    conjugeDeficiente: contexto.spouseDisability,
    estadoCivil: contexto.maritalStatus,
    deficiencia: contexto.disability,
    regiao: contexto.region,
    irsJovemAno: contexto.youthIrsBenefitYear,
    subsidioRefeicaoDia: contexto.meal.enabled ? contexto.meal.dailyAmount : 0,
    subsidioRefeicaoCartao: contexto.meal.card,
    diasUteis: contexto.meal.days,
  });

  const proveniencia = await criarProveniencia("vencimento", { contexto, rubricas });
  const documento: DocumentoVencimento = {
    periodo: corpo.periodo ?? "",
    proveniencia,
    pressupostos: corpo.pressupostos ?? [],
    linhas: calculo.lines,
    mes: calculo.result,
    ano: anual,
    custoEmpresa: employerCost(calculo.result),
    baseLegal: [
      { norma: "Despacho n.º 233-A/2026", determina: "Tabelas de retenção na fonte aplicadas à remuneração do mês e a cada subsídio", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Código Contributivo, arts. 44.º-48.º", determina: "Base de incidência da Segurança Social e taxas do trabalhador e da entidade", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Art. 2.º, n.º 3 CIRS", determina: "Limites isentos do subsídio de refeição e das ajudas de custo", verificadoEm: DATA_LAST_REVIEW },
      { norma: "Art. 99.º-C CIRS", determina: "Retenção autónoma dos subsídios e do trabalho suplementar", verificadoEm: DATA_LAST_REVIEW },
      { norma: "CT arts. 262.º e 271.º", determina: "Retribuição horária que valoriza horas extra, trabalho noturno e faltas", verificadoEm: DATA_LAST_REVIEW },
    ],
    ambito: [
      "Não substitui o recibo emitido pela entidade empregadora.",
      "Mostra a retenção na fonte do mês, não o IRS apurado no ano.",
      "Não modela benefícios em espécie nem instrumentos de regulamentação coletiva mais favoráveis.",
      "O custo da empresa não inclui seguro de acidentes de trabalho, formação nem custos indiretos.",
    ],
    memoria: [
      { rubrica: "Retribuição horária", formula: "(retribuição mensal × 12) ÷ (52 × horas semanais)", valor: calculo.result.retribuicaoHoraria, fonte: "CT art. 271.º" },
      { rubrica: "Base da Segurança Social", formula: "soma das rubricas contributivas do mês", valor: calculo.result.baseSS, fonte: "CRC arts. 44.º-48.º" },
      { rubrica: "Segurança Social do trabalhador", formula: `base × ${pctDoc(SS_DEPENDENTE.trabalhador.value)}`, valor: calculo.result.ssTrabalhador, fonte: "CRC art. 53.º" },
      { rubrica: "Retenção da remuneração mensal", formula: "R × taxa marginal − parcela a abater − parcelas por dependente e incapacidade", valor: calculo.result.irsBaseMensal, fonte: "Despacho 233-A/2026" },
      { rubrica: "Retenção do trabalho suplementar", formula: "suplementar × 50% da taxa efetiva do mês", valor: calculo.result.suplementarIRS, fonte: "Despacho 233-A/2026, n.º 5 al. f)" },
      { rubrica: "Retenção dos subsídios", formula: "imposto do direito completo × fração paga", valor: calculo.result.irsSubsidios, fonte: "Art. 99.º-C, n.º 6 CIRS" },
      { rubrica: "Líquido do mês", formula: "bruto/caixa − Segurança Social − IRS", valor: calculo.result.liquido, fonte: "—" },
    ],
  };

  // ── A composição ────────────────────────────────────────────────────────
  const payload = JSON.stringify({ tipo: "vencimento", dados: dadosTypst(documento) });
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
    return NextResponse.json({ erro: "Não foi possível compor o documento.", detalhe: detalhe.slice(0, 500) }, { status: 502 });
  }

  const pdf = await resposta.arrayBuffer();

  // Perder a linha de verificação é mau; negar o ficheiro já composto é pior.
  const registo = await registarEmissao({
    referencia: proveniencia.referencia,
    digest: proveniencia.digest,
    tipo: "vencimento",
    utilizador: quem.id,
    motor: proveniencia.motor,
  });

  const nome = nomeFicheiro({
    assunto: "relatorio de vencimento",
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
