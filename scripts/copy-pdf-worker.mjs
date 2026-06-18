// Copia o worker do pdf.js para `public/` para ser servido na mesma origem
// (sem CDN externo — privacidade) e referenciado por workerSrc = "/pdf.worker.min.mjs".
// Corre no postinstall e no prebuild; não falha o install se a origem faltar.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const src = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
const dest = "public/pdf.worker.min.mjs";

try {
  if (!existsSync(src)) {
    console.warn(`[pdf-worker] origem não encontrada (${src}) — ignorado.`);
    process.exit(0);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[pdf-worker] copiado para ${dest}`);
} catch (e) {
  console.warn(`[pdf-worker] falha a copiar: ${e.message}`);
}
