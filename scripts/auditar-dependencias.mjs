#!/usr/bin/env node
/**
 * PORTÃO: zero vulnerabilidades de severidade alta nas dependências.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO DEIXOU DE SER UM `npm audit` DIRETO NO WORKFLOW          │
 * │                                                                     │
 * │ `npm audit` devolve 1 em dois casos que não têm nada a ver um com o  │
 * │ outro:                                                              │
 * │                                                                     │
 * │   · encontrou vulnerabilidades — o portão a fazer o seu trabalho;    │
 * │   · não conseguiu FALAR com o registo — 503, 5xx, DNS, ligação       │
 * │     cortada. Não encontrou nada porque não chegou a procurar.        │
 * │                                                                     │
 * │ O workflow tratava os dois como o mesmo, e a 04/09 o segundo caso    │
 * │ reprovou DOIS jobs seguidos com «503 Service Unavailable - POST      │
 * │ registry.npmjs.org/-/npm/v1/security/advisories/bulk». No mesmo      │
 * │ minuto, a mesma auditoria localmente dava `found 0 vulnerabilities`. │
 * │                                                                     │
 * │ Um portão que fica vermelho por causa da infraestrutura de outra     │
 * │ pessoa ensina a equipa a carregar em «re-run» sem ler — e a partir   │
 * │ daí deixa de proteger o que quer que seja.                          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * A distinção que este guião faz, e que o `npm audit` sozinho não faz:
 *
 *   ① Vulnerabilidade encontrada → reprova JÁ. Sem repetições: repetir uma
 *     auditoria que respondeu é só esperar que ela mude de ideias.
 *   ② Registo inalcançável → tenta outra vez (3 tentativas, 5s/15s/45s).
 *   ③ Registo inalcançável nas três → NÃO reprova, e também NÃO diz que
 *     está tudo bem. Diz o que é: a auditoria não foi feita. É a mesma
 *     regra de `check-supabase.mjs` e `check-stripe-config.mjs` — «ficou
 *     POR VERIFICAR; não confundas isso com estar bem» — e a rede de
 *     segurança é o `security-audit.yml` agendado, que volta a correr
 *     sozinho e abre issue se encontrar alguma coisa.
 *
 * Uso:  node scripts/auditar-dependencias.mjs
 * Saída: 0 = sem vulnerabilidades altas, ou registo inalcançável (com aviso)
 *        1 = vulnerabilidades altas encontradas
 */

import { spawnSync } from "node:child_process";

const TENTATIVAS = 3;
const ESPERA_MS = [5_000, 15_000, 45_000];

/**
 * As assinaturas de «não falei com o registo».
 *
 * Deliberadamente estreitas: qualquer coisa que não esteja aqui é tratada
 * como resultado da auditoria e reprova. Uma lista larga transformava este
 * guião num `|| true` com passos extra.
 */
const FALHA_DE_REDE = [
  /audit endpoint returned an error/i,
  /\b5\d{2}\b\s+(service unavailable|bad gateway|gateway time-?out|internal server error)/i,
  /request to https?:\/\/[^\s]*registry\.npmjs\.org[^\s]* failed/i,
  /ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i,
  /network|offline mode/i,
];

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function auditar() {
  const r = spawnSync("npm", ["audit", "--audit-level=high"], {
    encoding: "utf8",
    // `npm audit` escreve o relatório em stdout e os erros em stderr; os
    // dois interessam, e o segundo é onde o 503 aparece.
    stdio: ["ignore", "pipe", "pipe"],
  });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { codigo: r.status ?? 1, saida };
}

let ultima = "";

for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
  const { codigo, saida } = auditar();
  ultima = saida;
  process.stdout.write(saida);

  if (codigo === 0) {
    console.log(`\nAuditoria de dependências: sem vulnerabilidades de severidade alta.`);
    process.exit(0);
  }

  const foiARede = FALHA_DE_REDE.some((p) => p.test(saida));
  if (!foiARede) {
    // ① O registo respondeu, e a resposta foi má. É para isto que o portão
    //    existe — e não se repete uma resposta que se obteve.
    console.error(
      "\n::error::npm audit encontrou vulnerabilidades de severidade high ou superior. " +
        "Resolver antes de fazer merge. Evitar `npm audit fix --force` sem verificar mudanças disruptivas.",
    );
    process.exit(1);
  }

  if (tentativa < TENTATIVAS) {
    const espera = ESPERA_MS[tentativa - 1];
    console.error(
      `\nO registo do npm não respondeu (tentativa ${tentativa}/${TENTATIVAS}). ` +
        `Nova tentativa em ${espera / 1000}s — isto não é um resultado da auditoria.`,
    );
    await dormir(espera);
  }
}

// ③ Três tentativas, nenhuma resposta. Não se reprova o que não foi
//    verificado — e também não se diz que passou.
console.error(
  "\n::warning::A auditoria de dependências NÃO foi feita: o registo do npm não respondeu em " +
    `${TENTATIVAS} tentativas. Isto não quer dizer que não haja vulnerabilidades — quer dizer que ` +
    "ninguém as procurou. O `security-audit.yml` agendado volta a tentar e abre issue se encontrar.",
);
console.error(`\nÚltima resposta do npm:\n${ultima.trim().slice(-500)}`);
process.exit(0);
