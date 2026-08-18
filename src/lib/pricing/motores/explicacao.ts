// ═══════════════════════════════════════════════════════════════════════
//  CAMADA DE EXPLICAÇÃO — «como chegaste a este valor?»
//  ---------------------------------------------------------------------
//  Um resultado que não se consegue explicar é um resultado em que não se
//  pode confiar. Esta camada devolve a memória de cálculo linha a linha,
//  cada uma com a sua PROVENIÊNCIA:
//
//    oficial      vem da lei (via `fiscal-data.ts`)
//    mercado      vem de um preçário de terceiro, com data
//    estimativa   depende de um pressuposto do utilizador
//
//  A distinção não é decorativa. «IVA 23%» e «comissão 15%» parecem a mesma
//  coisa no ecrã e não são: uma é lei, a outra é um contrato que se pode
//  renegociar. Marcar as duas de forma diferente muda a ação que a pessoa
//  toma a seguir.
//
//  A interface NÃO mostra isto por omissão — mostra por trás de «ver
//  cálculo». Divulgação progressiva é princípio 5 do design system.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_TAXAS, SS_COEFICIENTE, SS_TAXA } from "../../fiscal-data";
import type {
  ContextoPreco,
  DetalheFiscalVendedor,
  LinhaExplicacao,
} from "../tipos";
import type { ResultadoCustos } from "./custos";
import type { ResultadoComissoes } from "./comissoes";
import type { SituacaoIVAPreco } from "./iva";
import type { ResultadoTempo } from "./tempo";
import { cent } from "../numeros";

const URL_CIVA_18 =
  "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva18.aspx";
const URL_CIVA_53 =
  "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx";
const URL_CIRS_31 =
  "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx";
const URL_SS = "https://www.seg-social.pt";

export interface EntradaExplicacao {
  contexto: ContextoPreco;
  situacaoIVA: SituacaoIVAPreco;
  custos: ResultadoCustos;
  comissoes: ResultadoComissoes;
  fiscal: DetalheFiscalVendedor;
  tempo: ResultadoTempo | null;
  precoLiquido: number;
  pvp: number;
  fixosPorUnidade: number;
  lucroUnidade: number;
  custoDireto: number;
}

export function construirExplicacao(e: EntradaExplicacao): LinhaExplicacao[] {
  const linhas: LinhaExplicacao[] = [];
  const p = e.precoLiquido;

  // ── O que entra ────────────────────────────────────────────────────
  linhas.push({
    rotulo: "Preço sem IVA",
    valor: cent(p),
    confianca: "estimativa",
    nota: "É esta a tua receita. A margem mede-se sempre sobre este valor, nunca sobre o preço com IVA.",
  });

  if (e.situacaoIVA.liquida) {
    linhas.push({
      rotulo: e.situacaoIVA.regimeMargem ? "IVA sobre a margem" : "IVA",
      valor: cent(e.pvp - p),
      percentagem: e.situacaoIVA.taxaVenda,
      confianca: "oficial",
      fonte: `Art. 18.º CIVA — ${e.situacaoIVA.escalaoVenda}, ${rotuloRegiao(e.contexto.vendedor.regiao)}`,
      fonteUrl: URL_CIVA_18,
      nota: "Não é teu: é cobrado ao cliente e entregue ao Estado.",
    });
  } else {
    linhas.push({
      rotulo: "IVA",
      valor: 0,
      percentagem: 0,
      confianca: "oficial",
      fonte: "Art. 53.º CIVA — isenção",
      fonteUrl: URL_CIVA_53,
      nota: e.situacaoIVA.explicacao,
    });
  }

  linhas.push({
    rotulo: "Preço ao cliente (PVP)",
    valor: cent(e.pvp),
    confianca: "oficial",
    fonte: "DL n.º 138/90 — o preço indicado ao consumidor inclui todos os impostos",
    fonteUrl:
      "https://www.asae.gov.pt/perguntas-frequentes1/area-economica/precos/afixacao-de-precos.aspx",
  });

  // ── O que sai ──────────────────────────────────────────────────────
  if (e.tempo && e.tempo.custoTempoPorUnidade > 0) {
    linhas.push({
      rotulo: `Custo do teu tempo (${e.tempo.horasPorUnidade} h × ${cent(e.tempo.valorHoraLiquido)} €/h)`,
      valor: -cent(e.tempo.custoTempoPorUnidade),
      confianca: "estimativa",
      nota: `Valor/hora LÍQUIDO, calculado sobre ${Math.round(
        e.tempo.horasProdutivasAno,
      )} horas faturáveis por ano — não sobre as horas trabalhadas. Os impostos entram uma só vez, nas linhas abaixo.`,
    });
  } else if (e.custoDireto > 0) {
    linhas.push({
      rotulo: "Custo direto",
      valor: -cent(e.custoDireto),
      confianca: "estimativa",
      nota: e.situacaoIVA.deduz
        ? "Valor sem IVA — deduzes o IVA da compra."
        : "Valor com IVA — como estás isento, não deduzes o IVA que pagas. É esse o custo real.",
    });
  }

  if (e.custos.ivaPresoNoCusto > 0) {
    linhas.push({
      rotulo: "IVA que não consegues deduzir",
      valor: -cent(e.custos.ivaPresoNoCusto),
      confianca: "oficial",
      fonte: "Art. 53.º n.º 3 CIVA — a isenção exclui o direito à dedução",
      fonteUrl: URL_CIVA_53,
      nota: "Já está incluído no custo direto acima. Mostramos à parte porque é o efeito da isenção que mais passa despercebido.",
    });
  }

  if (e.custos.custoDoDesperdicio > 0) {
    linhas.push({
      rotulo: "Desperdício / quebra",
      valor: -cent(e.custos.custoDoDesperdicio),
      confianca: "estimativa",
      nota: "Cada unidade vendida carrega o custo das que se perderam. Já está no custo direto.",
    });
  }

  for (const v of e.custos.variaveisDetalhe) {
    linhas.push({ rotulo: v.rotulo, valor: -cent(v.valor), confianca: "estimativa" });
  }

  for (const c of e.comissoes.detalhe) {
    if (c.base === "mensal") continue;
    const valor =
      c.base === "fixo"
        ? c.fixo ?? 0
        : c.base === "bruto"
          ? (c.percentagem ?? 0) * e.pvp
          : (c.percentagem ?? 0) * p;
    linhas.push({
      rotulo: c.rotulo,
      valor: -cent(valor),
      percentagem: c.percentagem,
      confianca: "mercado",
      nota:
        c.base === "bruto"
          ? "Incide sobre o valor total da encomenda, com IVA incluído."
          : c.base === "liquido"
            ? "Incide sobre o valor sem IVA."
            : undefined,
    });
  }

  if (e.fixosPorUnidade > 0) {
    linhas.push({
      rotulo: "Parte das contas fixas",
      valor: -cent(e.fixosPorUnidade),
      confianca: "estimativa",
      nota: `Renda, contabilidade, software e afins repartidos por ${e.contexto.volume.unidadesMes} vendas por mês. Se venderes menos, esta parcela sobe.`,
    });
  }

  // ── Fiscalidade do vendedor ────────────────────────────────────────
  if (e.fiscal.aplicavel && e.fiscal.ssPorUnidade > 0) {
    const base = e.contexto.vendedor.atividade === "vendas" ? "bens" : "servicos";
    linhas.push({
      rotulo: "Segurança Social",
      valor: -cent(e.fiscal.ssPorUnidade),
      percentagem: e.fiscal.ssFracao,
      confianca: "oficial",
      fonte: `Arts. 162.º e 168.º do Código Contributivo — ${(SS_COEFICIENTE[base].value * 100).toFixed(0)}% de base × ${(SS_TAXA.value * 100).toFixed(1).replace(".", ",")}%`,
      fonteUrl: URL_SS,
      nota: "Incide sobre a faturação, não sobre o lucro. É por isso que aparece aqui e não no fim.",
    });
  }

  if (e.fiscal.aplicavel && e.fiscal.irsPorUnidade > 0) {
    linhas.push({
      rotulo: "IRS (taxa marginal)",
      valor: -cent(e.fiscal.irsPorUnidade),
      percentagem: e.fiscal.irsFracao,
      confianca: "oficial",
      fonte: "Arts. 31.º e 68.º CIRS — coeficiente do regime simplificado e escalões",
      fonteUrl: URL_CIRS_31,
      nota: "Calculado como imposto adicional sobre a tua faturação anual prevista. No regime simplificado, os teus custos não o reduzem.",
    });
  }

  // ── Resultado ──────────────────────────────────────────────────────
  linhas.push({
    rotulo: e.fiscal.aplicavel ? "O que te fica, por venda" : "Lucro por venda",
    valor: cent(e.lucroUnidade),
    confianca: "estimativa",
  });

  if (e.fiscal.aplicavel && e.fiscal.retencaoPorUnidade > 0) {
    linhas.push({
      rotulo: "Retenção na fonte (não é custo)",
      valor: -cent(e.fiscal.retencaoPorUnidade),
      percentagem: e.fiscal.retencaoFracao,
      confianca: "oficial",
      fonte: "Art. 101.º CIRS — retenção pelo adquirente com contabilidade organizada",
      fonteUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101.aspx",
      nota: "Sai da tua tesouraria hoje e volta no acerto do IRS. Não reduz a tua margem — só atrasa o dinheiro.",
    });
  }

  return linhas;
}

const rotuloRegiao = (r: keyof typeof IVA_TAXAS): string =>
  r === "madeira" ? "Madeira" : r === "acores" ? "Açores" : "Continente";
