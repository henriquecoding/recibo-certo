// Verificação 4 da lista: nenhuma palavra soletrada pelo extrator de texto.
//
// Acima de 0,09 em de entreletra, o extrator insere espaços ENTRE GLIFOS e um
// leitor de ecrã soletra o título. Medido: a 0,12 em, «COPILOTO FISCAL» sai
// como «C O P I LOTO  F I S C A L».
//
// Corre em Node porque o pdfjs-dist já é dependência do projeto (o importador
// de recibos usa-o para ler PDF) e não precisa de nada instalado à parte.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";

const SOLETRADO = /\b(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ] ){3,}/g;

let falhou = false;
for (const caminho of process.argv.slice(2)) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(caminho)), useSystemFonts: false }).promise;
  let texto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const conteudo = await (await doc.getPage(i)).getTextContent();
    texto += conteudo.items.map((item) => item.str).join(" ") + "\n";
  }
  const soletradas = texto.match(SOLETRADO) ?? [];
  const palavras = texto.split(/\s+/).filter(Boolean).length;
  if (soletradas.length > 0) {
    console.error(`✗ ${caminho}: texto soletrado — ${JSON.stringify(soletradas.slice(0, 3))}`);
    falhou = true;
  } else {
    console.log(`  · ${caminho}: ${palavras} palavras extraídas, nenhuma soletrada`);
  }
  // Um documento que não extrai texto nenhum não é pesquisável nem copiável.
  if (palavras < 50) {
    console.error(`✗ ${caminho}: só ${palavras} palavras extraídas — o texto não está a sair`);
    falhou = true;
  }
}
process.exit(falhou ? 1 : 0);
