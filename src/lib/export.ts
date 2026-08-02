// Exportação de recibos em CSV.
//
// O PDF saía daqui por `window.print()` e passou para `/api/documentos/recibos`:
// composto no servidor, com as fontes da marca, PDF/A-2a + PDF/UA-1 e uma
// referência verificável. Ver `src/lib/export/documento-recibos.ts`.
//
// A serialização, o arredondamento e a formatação vêm de `src/lib/export/*`.
// Um formatador de dinheiro por ficheiro é como se chegava a «2051,58 €» numa
// linha e «24 748,00 €» na seguinte, dentro do mesmo documento.

import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { META_TIPO } from "@/lib/fiscal-data";
import {
  dinheiro,
  escreverCSV,
  texto,
  data as celulaData,
  type DialetoCSV,
  type TabelaCSV,
} from "@/lib/export/csv";
import { MIME, descarregar } from "@/lib/export/nomes";

/** Uma tabela, um cabeçalho — códigos estáveis ao lado dos rótulos legíveis. */
const COLUNAS_RECIBOS = [
  { codigo: "data", rotulo: "Data" },
  { codigo: "cliente", rotulo: "Cliente" },
  { codigo: "tipo", rotulo: "Tipo" },
  { codigo: "bruto_eur", rotulo: "Valor" },
  { codigo: "iva_eur", rotulo: "IVA" },
  { codigo: "retencao_irs_eur", rotulo: "Retenção IRS" },
  { codigo: "seguranca_social_eur", rotulo: "Segurança Social" },
  { codigo: "liquido_eur", rotulo: "Líquido" },
] as const;

export function recibosTabela(recibos: Recibo[]): TabelaCSV {
  return {
    colunas: COLUNAS_RECIBOS,
    linhas: recibos.map((r) => {
      const c = calcularRecibo(r);
      return [
        celulaData(r.data),
        texto(r.cliente || ""),
        texto(META_TIPO[r.tipo].label),
        dinheiro(c.bruto),
        dinheiro(c.iva),
        dinheiro(c.retencaoIRS),
        dinheiro(c.segSocial),
        dinheiro(c.liquido),
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
