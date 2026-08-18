// ═══════════════════════════════════════════════════════════════════════
//  VERIFICADOR DO CONTRATO PÚBLICO
//  ---------------------------------------------------------------------
//  Escrito depois de o diretório público inteiro estar em baixo sem que
//  nada acusasse. O sintoma, para qualquer visitante:
//
//      «Não foi possível carregar o diretório.»
//
//  A causa não estava no código nem nas migrações — estava entre os dois.
//  `CAMPOS_DO_CARTAO` pedia `recebe_pagamentos`; a migração que acrescenta
//  essa coluna à view existe, está correta e consta como aplicada. Mas a
//  view em produção tinha sido reposta por uma definição anterior, fora do
//  histórico de migrações, e ficou sem a coluna. O PostgREST respondia
//  «column does not exist» e o diretório mostrava o estado de erro a toda
//  a gente — não o estado vazio.
//
//  ⚠️ É POR ISSO QUE ISTO NÃO É UM TESTE.
//
//  Um teste contra os ficheiros de migração teria passado o tempo todo: a
//  migração estava certa. O que derivou foi a BASE DE DADOS VIVA. Só se
//  apanha uma deriva dessas perguntando à base de dados que está a servir
//  o site — que é exatamente o que isto faz, com a chave anónima e pelo
//  mesmo caminho que o browser usa.
//
//  ── Como correr ─────────────────────────────────────────────────────
//    NEXT_PUBLIC_SUPABASE_URL=https://… \
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
//    node scripts/check-contrato-publico.mjs
//
//  Sem as variáveis, diz que ficou por verificar. Não finge que passou.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";

const VISTA = "contabilistas_publico";
const FONTE = "src/lib/contabilistas/diretorio.ts";

/**
 * As colunas que o diretório pede, lidas da ÚNICA fonte que importa: o
 * módulo que as pede. Copiá-las para aqui criava a terceira cópia do
 * contrato — e seria a que primeiro ficava para trás.
 */
function camposPedidos() {
  const fonte = readFileSync(FONTE, "utf8");
  const bloco = fonte.split("const CAMPOS_DO_CARTAO =")[1]?.split(";")[0];
  if (!bloco) {
    throw new Error(`Não encontrei CAMPOS_DO_CARTAO em ${FONTE}.`);
  }
  return [...bloco.matchAll(/"([^"]+)"/g)]
    .flatMap((m) => m[1].split(","))
    .map((c) => c.trim())
    .filter(Boolean);
}

const problemas = [];
const oks = [];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const campos = camposPedidos();
oks.push(`${campos.length} colunas pedidas por ${FONTE}`);

if (!url || !chave) {
  console.warn(
    "  aviso· Sem NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não se " +
      "fala com a base de dados. O contrato público ficou POR VERIFICAR — não " +
      "confundas isso com estar bem.",
  );
  for (const o of oks) console.log(`  ok   · ${o}`);
  process.exit(0);
}

// ── O pedido do browser, tal e qual ────────────────────────────────────
//
// Pede-se uma linha só (`limit=1`): o que se verifica é o CONTRATO, não os
// dados. Zero contabilistas é uma resposta legítima e tem de passar — foi
// precisamente por não distinguir «vazio» de «avariado» que isto doeu.
const pedido = `${url}/rest/v1/${VISTA}?select=${campos.join(",")}&limit=1`;
const res = await fetch(pedido, {
  headers: { apikey: chave, Authorization: `Bearer ${chave}` },
});

if (res.ok) {
  const linhas = await res.json();
  oks.push(`${VISTA} responde 200 às ${campos.length} colunas do cartão`);
  oks.push(
    Array.isArray(linhas) && linhas.length === 0
      ? "sem perfis aprovados — o diretório mostra o estado vazio, não um erro"
      : "com perfis aprovados",
  );
} else {
  const corpo = await res.text();
  // A mensagem do PostgREST nomeia a coluna em falta. É a informação toda.
  problemas.push(
    `${VISTA} recusou o pedido do diretório (HTTP ${res.status}): ${corpo.slice(0, 300)}\n` +
      "         Enquanto isto durar, o diretório mostra «Não foi possível carregar\n" +
      "         o diretório» a QUALQUER visitante — mesmo sem nenhum contabilista.\n" +
      "         Se falta uma coluna, a view em produção derivou das migrações:\n" +
      "         reaplica a que a define e confirma com `pg_get_viewdef`.",
  );
}

// ── O relatório ────────────────────────────────────────────────────────
for (const o of oks) console.log(`  ok   · ${o}`);
for (const p of problemas) console.error(`  FALHA· ${p}`);

console.log("");
if (problemas.length > 0) {
  console.error("Contrato público com falhas. O diretório está em baixo para toda a gente.");
  process.exit(1);
}
console.log("Contrato público verificado.");
