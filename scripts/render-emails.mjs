// Renderiza TODOS os emails do produto, em todas as variantes, para ficheiros
// HTML — para revisão de design sem precisar de os enviar a ninguém.
//
// Não envia nada e não fala com o Resend. É só o molde a ser preenchido com
// dados de exemplo realistas, que é o que se quer olhar.
//
//   node scripts/render-emails.mjs [pasta-de-saida]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// `sucrase` em vez de `tsx`: é o que o projeto já traz, e o que aqui se
// precisa é só de despir os tipos e resolver o alias `@/`.
const require_ = createRequire(import.meta.url);
require_("sucrase/register");
const Module = require_("node:module");
const resolveOriginal = Module._resolveFilename;
Module._resolveFilename = function (pedido, ...resto) {
  const traduzido = pedido.startsWith("@/")
    ? join(process.cwd(), "src", pedido.slice(2))
    : pedido;
  return resolveOriginal.call(this, traduzido, ...resto);
};

const { EXEMPLOS_DE_EMAIL } = require_("../src/lib/email/exemplos.ts");

const saida = process.argv[2] ?? "emails-preview";
mkdirSync(saida, { recursive: true });

const indice = [];
for (const ex of EXEMPLOS_DE_EMAIL) {
  const { subject, html } = ex.render();
  writeFileSync(join(saida, `${ex.id}.html`), html, "utf8");
  indice.push({
    ficheiro: `${ex.id}.html`,
    rotulo: ex.rotulo,
    quando: ex.quando,
    canal: ex.canal,
    novo: ex.novo === true,
    subject,
    html,
  });
}

writeFileSync(join(saida, "indice.json"), JSON.stringify(indice, null, 2), "utf8");
console.log(`· ${indice.length} emails renderizados para ${saida}/`);
