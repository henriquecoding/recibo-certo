// ─────────────────────────────────────────────────────────────────────
//  Nomes de ficheiro e entrega
//  ---------------------------------------------------------------------
//  Quem tem doze destes na pasta Transferências tem de saber qual é qual sem
//  os abrir — e um contabilista que receba os quatro formatos tem de perceber,
//  pelo nome, que falam do mesmo documento. Daí a referência ir no nome.
//
//  Sem acentos, sem espaços, tudo em minúsculas, ordenável.
// ─────────────────────────────────────────────────────────────────────

/** Remove acentos e reduz a `[a-z0-9-]`, sem hífenes duplos nem nas pontas. */
export function ascii(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface NomeDocumento {
  /** Ex.: «relatório de vencimento». */
  assunto: string;
  /** Ex.: «julho de 2026». */
  periodo?: string;
  /** Referência do documento (vai no nome, para os formatos se reconhecerem). */
  referencia: string;
  /** Sufixo antes da referência — ex.: «dados» no CSV de máquina. */
  variante?: string;
  extensao: "pdf" | "csv" | "xlsx";
}

/**
 * `recibocerto-relatorio-de-vencimento-julho-de-2026-dados-RC-2026-VNC-8F3K2M.csv`
 *
 * A referência mantém as maiúsculas: é para ser lida em voz alta e comparada
 * com a que está impressa no documento.
 */
export function nomeFicheiro(nome: NomeDocumento): string {
  const partes = ["recibocerto", ascii(nome.assunto)];
  if (nome.periodo) partes.push(ascii(nome.periodo));
  if (nome.variante) partes.push(ascii(nome.variante));
  return `${partes.join("-")}-${nome.referencia}.${nome.extensao}`;
}

/** Tipos MIME por extensão, com o charset onde ele importa. */
export const MIME = {
  pdf: "application/pdf",
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/**
 * `Content-Disposition` com as duas formas (RFC 6266 + RFC 5987).
 *
 * Sem o `filename` simples, browsers antigos ignoram o cabeçalho; sem o
 * `filename*`, o Safari descarrega «route» sem extensão. Os nossos nomes já
 * são ASCII, mas as duas formas mantêm-se porque o custo é nulo e a falha,
 * quando acontece, é invisível para quem a programou.
 */
export function contentDisposition(nomeDoFicheiro: string): string {
  const simples = nomeDoFicheiro.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `attachment; filename="${simples}"; filename*=UTF-8''${encodeURIComponent(nomeDoFicheiro)}`;
}

/** Descarrega um conteúdo no browser. Sem efeito no servidor. */
export function descarregar(conteudo: BlobPart, nomeDoFicheiro: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoFicheiro;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // O revoke imediato cancela o descarregamento em Safari; um tick chega.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
