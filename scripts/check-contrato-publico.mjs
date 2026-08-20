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
//    node scripts/check-contrato-publico.mjs [--exigir-ambiente]
//
//  Sem as variáveis, diz que ficou por verificar. Não finge que passou.
//  Com `--exigir-ambiente`, a ausência delas passa a ser uma FALHA — é o
//  que o job de CI que deve validar produção tem de usar. Um verificador
//  que salta em silêncio no sítio onde é obrigatório é indistinguível de
//  um verificador que passa, e foi assim que o P0 abaixo sobreviveu a
//  meses de CI verde.
//
//  ── O que se verifica, e porquê nas duas direções ───────────────────
//
//  POSITIVO: a view devolve as colunas que o diretório pede. Se falhar, o
//  diretório está em baixo para toda a gente.
//
//  NEGATIVO: a TABELA `contabilistas` recusa `anon`, e a view não tem os
//  canais diretos. Sem isto, o verificador dizia «contrato público
//  verificado» enquanto um `GET /rest/v1/contabilistas?select=telefone`
//  devolvia o telefone de toda a gente aprovada — que foi exatamente o
//  que aconteceu. Um contrato só está verificado quando se prova também o
//  que ele NÃO deixa passar.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";

const VISTA = "contabilistas_publico";
const TABELA = "contabilistas";
const FONTE = "src/lib/contabilistas/diretorio.ts";

/**
 * As colunas que nunca podem sair para quem não tem relação.
 *
 * Os três canais diretos abrem-se com a aceitação; os identificadores
 * internos não pertencem a ninguém de fora. `linkedin_url` NÃO está aqui
 * de propósito: é público por decisão, porque é a validação profissional
 * que não depende de nós.
 */
const PROIBIDAS = [
  "email_contacto", "telefone", "website",
  "linkedin_subject", "pedido_id", "estado",
];

const exigirAmbiente = process.argv.includes("--exigir-ambiente");

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
  for (const o of oks) console.log(`  ok   · ${o}`);
  const frase =
    "Sem NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não se fala " +
    "com a base de dados. O contrato público ficou POR VERIFICAR — não " +
    "confundas isso com estar bem.";

  if (exigirAmbiente) {
    console.error(`  FALHA· ${frase}`);
    console.error(
      "\nEste job existe para validar o ambiente real. Saltar aqui é dizer\n" +
        "«verificado» sobre uma coisa que ninguém foi ver.",
    );
    process.exit(1);
  }
  console.warn(`  aviso· ${frase}`);
  process.exit(0);
}

const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };

// ── O pedido do browser, tal e qual ────────────────────────────────────
//
// Pede-se uma linha só (`limit=1`): o que se verifica é o CONTRATO, não os
// dados. Zero contabilistas é uma resposta legítima e tem de passar — foi
// precisamente por não distinguir «vazio» de «avariado» que isto doeu.
const pedido = `${url}/rest/v1/${VISTA}?select=${campos.join(",")}&limit=1`;
const res = await fetch(pedido, { headers: cabecalhos });

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

// ── E agora ao contrário: o que a fronteira TEM de recusar ─────────────
//
// ⚠️ Esta metade é a que faltava, e a que teria apanhado o P0.
//
// A política `contabilistas_diretorio_publico` dava a `anon` a LINHA
// INTEIRA de qualquer contabilista aprovado. RLS escolhe linhas, não
// colunas: a interface não mostrava o telefone, mas um `GET` mostrava.
// Enquanto este verificador só perguntava pela view, dizia «verificado»
// todos os dias por cima disso.
for (const coluna of PROIBIDAS) {
  const alvo = `${url}/rest/v1/${TABELA}?select=${coluna}&limit=1`;
  const r = await fetch(alvo, { headers: cabecalhos });

  if (r.ok) {
    problemas.push(
      `${TABELA}.${coluna} SAI para quem não tem sessão (HTTP 200).\n` +
        "         A tabela não é o contrato público — a view é. Retira a política\n" +
        "         de SELECT aberta a anon e revoga-lhe os privilégios:\n" +
        "         ver `20260820090000_o_contrato_publico_fecha_a_tabela.sql`.",
    );
  } else {
    oks.push(`${TABELA}.${coluna} recusado a anon (HTTP ${r.status})`);
  }
}

// E a view não pode ter ganho os canais diretos pela porta das traseiras.
for (const coluna of PROIBIDAS) {
  const alvo = `${url}/rest/v1/${VISTA}?select=${coluna}&limit=1`;
  const r = await fetch(alvo, { headers: cabecalhos });

  if (r.ok) {
    problemas.push(
      `${VISTA}.${coluna} existe e é legível sem sessão.\n` +
        "         O contrato público é nome, OCC e LinkedIn. Um canal direto\n" +
        "         abre-se com a aceitação, não com a pesquisa.",
    );
  } else {
    oks.push(`${VISTA} não tem ${coluna}`);
  }
}

// O LinkedIn é a exceção deliberada: público, e tem de continuar a sair.
// Uma correção de privacidade que o apagasse não seria uma correção — era
// tirar às pessoas a única validação profissional que não depende de nós.
{
  const alvo = `${url}/rest/v1/${VISTA}?select=nome,occ,linkedin_url&limit=1`;
  const r = await fetch(alvo, { headers: cabecalhos });
  if (r.ok) oks.push(`${VISTA} continua a dar nome, OCC e LinkedIn a quem não tem sessão`);
  else problemas.push(
    `${VISTA} deixou de dar nome/OCC/LinkedIn (HTTP ${r.status}). O diretório ficou sem identidade.`,
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
