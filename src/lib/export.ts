// Exportação de recibos em CSV.
//
// O PDF saía daqui por `window.print()` e passou para `/api/documentos/recibos`:
// composto no servidor, com as fontes da marca, PDF/A-2a + PDF/UA-1 e uma
// referência verificável. Ver `src/lib/export/documento-recibos.ts`.
//
// A serialização, o arredondamento e a formatação vêm de `src/lib/export/*`.
// Um formatador de dinheiro por ficheiro é como se chegava a «2051,58 €» numa
// linha e «24 748,00 €» na seguinte, dentro do mesmo documento.
//
// Os VALORES vêm do contrato único (`resultadoDoRecibo`), o mesmo que o painel
// e as páginas consomem. E as colunas passam a distinguir a retenção
// efetivamente feita do IRS anual estimado: eram a mesma coluna com nomes
// diferentes em sítios diferentes, e por isso o dashboard e o ficheiro
// entregue ao contabilista discordavam (RC-P0-02).

import { resultadoDoRecibo, METODOLOGIA_VERSION, type Recibo } from "@/lib/recibos-contrato";
import { META_TIPO } from "@/lib/fiscal-data";
import {
  dinheiro,
  escreverCSV,
  texto,
  numero,
  data as celulaData,
  vazio,
  type DialetoCSV,
  type TabelaCSV,
} from "@/lib/export/csv";
import { MIME, descarregar } from "@/lib/export/nomes";

/** Uma tabela, um cabeçalho — códigos estáveis ao lado dos rótulos legíveis. */
const COLUNAS_RECIBOS = [
  { codigo: "data", rotulo: "Data" },
  { codigo: "ano_fiscal", rotulo: "Ano fiscal" },
  { codigo: "cliente", rotulo: "Cliente" },
  { codigo: "tipo", rotulo: "Tipo" },
  { codigo: "bruto_eur", rotulo: "Valor" },
  { codigo: "iva_cobrado_eur", rotulo: "IVA cobrado" },
  { codigo: "retencao_efetiva_eur", rotulo: "Retenção IRS efetiva" },
  { codigo: "irs_estimado_eur", rotulo: "IRS anual estimado" },
  { codigo: "seguranca_social_eur", rotulo: "Segurança Social" },
  { codigo: "liquido_eur", rotulo: "Líquido" },
  { codigo: "metodologia", rotulo: "Versão da metodologia" },
] as const;

export function recibosTabela(recibos: Recibo[]): TabelaCSV {
  return {
    colunas: COLUNAS_RECIBOS,
    linhas: recibos.map((r) => {
      const c = resultadoDoRecibo(r);
      return [
        celulaData(r.data),
        numero(c.anoFiscal),
        texto(r.cliente || ""),
        texto(META_TIPO[r.tipo].label),
        dinheiro(c.bruto),
        dinheiro(c.ivaCobrado),
        dinheiro(c.retencaoEfetiva),
        // Sem instantâneo da simulação anual não há IRS estimado por recibo.
        // Escrever aqui a retenção seria repetir o erro que esta coluna existe
        // para corrigir.
        c.irsEstimado === null ? vazio() : dinheiro(c.irsEstimado),
        dinheiro(c.segurancaSocialEstimada),
        dinheiro(c.liquido),
        texto(METODOLOGIA_VERSION),
      ];
    }),
  };
}

export function recibosToCSV(recibos: Recibo[], dialeto: DialetoCSV = "humano"): string {
  return escreverCSV(recibosTabela(recibos), { dialeto });
}

export function downloadCSV(recibos: Recibo[], filename = "recibos.csv", dialeto: DialetoCSV = "humano"): void {
  descarregar(recibosToCSV(recibos, dialeto), filename, MIME.csv);
}
