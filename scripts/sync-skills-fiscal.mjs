#!/usr/bin/env node
/**
 * Sincronização das skills do Claude com a fonte de verdade fiscal
 * ----------------------------------------------------------------------
 * As skills em `.claude/skills/` documentam os valores-chave para o agente.
 * Esses valores TÊM de coincidir sempre com `src/lib/fiscal-data.ts` — caso
 * contrário o agente raciocinaria sobre números desatualizados.
 *
 * Este script EXTRAI os valores de `fiscal-data.ts` (nunca os redigita) e
 * regenera o bloco delimitado pelos marcadores AUTO-GERADO na skill
 * `fiscalidade-pt-2026`. Assim, qualquer alteração aos dados propaga-se
 * automaticamente para a skill — uma única fonte de verdade.
 *
 * Uso:
 *   node scripts/sync-skills-fiscal.mjs           # reescreve o bloco
 *   node scripts/sync-skills-fiscal.mjs --check    # falha (exit 1) se desatualizado
 *
 * Falha-seguro: se algum valor esperado não for encontrado em fiscal-data.ts,
 * o script aborta SEM escrever, em vez de produzir um bloco com lacunas.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "src", "lib", "fiscal-data.ts");
// FISCAL_YEAR vive num módulo leve à parte; fiscal-data.ts apenas o re-exporta.
const FISCAL_YEAR_FILE = join(ROOT, "src", "lib", "fiscal-year.ts");
const SKILL_FILE = join(ROOT, ".claude", "skills", "fiscalidade-pt-2026", "SKILL.md");

const START = "<!-- AUTO-GERADO:valores-fiscais — não editar à mão. Atualizado por `npm run skills:sync`. -->";
const END = "<!-- /AUTO-GERADO:valores-fiscais -->";

const checkOnly = process.argv.slice(2).includes("--check");

/** Extrai o primeiro grupo de captura; aborta se não encontrar (falha-seguro). */
function grab(src, regex, label) {
  const m = src.match(regex);
  if (!m) {
    console.error(`[sync-skills] Valor não encontrado em fiscal-data.ts: ${label}.`);
    process.exit(2);
  }
  return m[1];
}

/** Número pt-PT com separador de milhares e, opcionalmente, casas decimais. */
function eur(n) {
  return `${Number(n).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

/** Fração (0–1) → percentagem pt-PT (0.115 → "11,5%"). */
function pct(frac) {
  const v = Number(frac) * 100;
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

/** Coeficiente do regime simplificado em notação decimal pt-PT (0.3 → "0,30"). */
function coef(frac) {
  return Number(frac).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const src = await readFile(DATA_FILE, "utf8");
  const yearSrc = await readFile(FISCAL_YEAR_FILE, "utf8");

  const fiscalYear = grab(yearSrc, /FISCAL_YEAR\s*=\s*(\d{4})/, "FISCAL_YEAR");
  const lastReview = grab(src, /DATA_LAST_REVIEW\s*=\s*"(\d{4}-\d{2}-\d{2})"/, "DATA_LAST_REVIEW");

  const ias = grab(src, /export const IAS = sv\(\s*([\d.]+)/, "IAS");
  const ret151 = grab(src, /art151: sv\(\s*([\d.]+)/, "RETENCAO.art151");
  const retOutros = grab(src, /outros: sv\(\s*([\d.]+)/, "RETENCAO.outros");
  const retAutor = grab(src, /diretosAutor: sv\(\s*([\d.]+)/, "RETENCAO.diretosAutor");
  const dispensa = grab(src, /DISPENSA_RETENCAO_LIMITE = sv\(\s*([\d.]+)/, "DISPENSA_RETENCAO_LIMITE");
  const ivaLimite = grab(src, /IVA_ISENCAO_LIMITE = sv\(\s*([\d.]+)/, "IVA_ISENCAO_LIMITE");
  const ivaExcesso = grab(src, /IVA_ISENCAO_EXCESSO = sv\(\s*([\d.]+)/, "IVA_ISENCAO_EXCESSO");
  const ssTaxa = grab(src, /SS_TAXA = sv\(\s*([\d.]+)/, "SS_TAXA");

  // Taxas de IVA por região — lidas da fonte de verdade, nunca hardcoded.
  const ivaTrio = (regiao) => {
    const m = src.match(
      new RegExp(`${regiao}: sv\\(\\s*\\{ reduzida: ([\\d.]+), intermedia: ([\\d.]+), normal: ([\\d.]+) \\}`)
    );
    if (!m) {
      console.error(`[sync-skills] Não foi possível ler IVA_TAXAS.${regiao}.`);
      process.exit(2);
    }
    return m.slice(1, 4).map((v) => Math.round(Number(v) * 100)).join("/");
  };

  // Coeficientes de subsídios e categoria F (novos regimes).
  const coefSubNao = grab(src, /coefSubsidiosNaoExploracao: sv\(\s*([\d.]+)/, "coefSubsidiosNaoExploracao");
  const coefSubExpl = grab(src, /coefSubsidiosExploracao: sv\(\s*([\d.]+)/, "coefSubsidiosExploracao");
  const catFHab = grab(src, /taxaHabitacao: sv\(\s*([\d.]+)/, "CATEGORIA_F.taxaHabitacao");
  const catFNaoHab = grab(src, /taxaNaoHabitacao: sv\(\s*([\d.]+)/, "CATEGORIA_F.taxaNaoHabitacao");

  // O mínimo de existência deixou de ser um literal: o Art. 70.º n.º 1 manda
  // usar o MAIOR entre um piso fixo e 1,5 × 14 × IAS. Extraímos as três peças e
  // repetimos a conta — assim o bloco gerado acompanha automaticamente uma
  // subida do IAS, em vez de ficar preso ao valor de um ano.
  const minExistPiso = grab(src, /MINIMO_EXISTENCIA_PISO = ([\d.]+)/, "MINIMO_EXISTENCIA_PISO");
  const minExistMult = grab(src, /MINIMO_EXISTENCIA_IAS_MULT = ([\d.]+)/, "MINIMO_EXISTENCIA_IAS_MULT");
  const minExistMeses = grab(src, /MINIMO_EXISTENCIA_IAS_MESES = ([\d.]+)/, "MINIMO_EXISTENCIA_IAS_MESES");
  const minExist =
    Math.round(
      Math.max(Number(minExistPiso), Number(minExistMult) * Number(minExistMeses) * Number(ias)) * 100
    ) / 100;
  const ircGeral = grab(src, /IRC_TAXA_GERAL = sv\(\s*([\d.]+)/, "IRC_TAXA_GERAL");
  const ircPme = grab(src, /IRC_TAXA_PME = sv\(\s*([\d.]+)/, "IRC_TAXA_PME");
  const ircLimite = grab(src, /IRC_LIMITE_PME = sv\(\s*([\d.]+)/, "IRC_LIMITE_PME");
  const dividendos = grab(src, /DIVIDENDOS_TAXA = sv\(\s*([\d.]+)/, "DIVIDENDOS_TAXA");

  // Escalões de IRS: taxa do 1.º e do último escalão.
  const escaloesBloco = grab(src, /ESCALOES_IRS = sv<EscalaoIRS\[\]>\(\s*\[([\s\S]*?)\]/, "ESCALOES_IRS");
  const taxasEscaloes = [...escaloesBloco.matchAll(/taxa:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  if (taxasEscaloes.length === 0) {
    console.error("[sync-skills] Não foi possível ler as taxas dos escalões de IRS.");
    process.exit(2);
  }
  const escaloesMin = pct(Math.min(...taxasEscaloes));
  const escaloesMax = pct(Math.max(...taxasEscaloes));

  // Redução regional das taxas do Art. 68.º (Lei das Finanças das Regiões
  // Autónomas). Lida da fonte, não escrita à mão: se um orçamento regional
  // mudar o diferencial, a skill acompanha sem ninguém se lembrar dela.
  const reducaoBloco = grab(
    src,
    /REDUCAO_IRS_REGIOES_AUTONOMAS = sv[\s\S]*?\{([\s\S]*?)\}/,
    "REDUCAO_IRS_REGIOES_AUTONOMAS"
  );
  const reducaoMadeira = Number(grab(reducaoBloco, /madeira:\s*([\d.]+)/, "reducao madeira"));
  const reducaoAcores = Number(grab(reducaoBloco, /acores:\s*([\d.]+)/, "reducao acores"));
  const escaloesMinRA = pct(Math.min(...taxasEscaloes) * (1 - reducaoMadeira));
  const escaloesMaxRA = pct(Math.max(...taxasEscaloes) * (1 - reducaoMadeira));

  // Total de atividades no catálogo.
  const totalAtividades = [...src.matchAll(/^\s*(?:a\(|\{ label:|\{\n\s*label:)/gm)].length;

  const bloco = [
    START,
    `<!-- Ano fiscal ${fiscalYear} · última revisão ${lastReview} · gerado de src/lib/fiscal-data.ts -->`,
    "",
    `- **IAS** ${eur(ias)}.`,
    `- **Retenção na fonte** (cat. B): Art. 151.º ${pct(ret151)} · outros serviços ${pct(retOutros)} · direitos de autor ${pct(retAutor)} · vendas sem retenção. Dispensa abaixo de ${eur(dispensa)}/ano.`,
    `- **Coeficientes do regime simplificado**: serviços 151.º 0,75 · outros 0,35 · vendas/hotelaria 0,15 · propriedade intelectual 0,95 · AL moradia 0,35 (contenção 0,50) · transparência 1,0 · **subsídios não destinados à exploração ${coef(coefSubNao)}** · **subsídios à exploração ${coef(coefSubExpl)}**.`,
    `- **IVA**: isenção até ${eur(ivaLimite)} (excesso ${eur(ivaExcesso)}). Continente ${ivaTrio("continente")}, Madeira ${ivaTrio("madeira")}, Açores ${ivaTrio("acores")}.`,
    `- **Segurança Social**: taxa ${pct(ssTaxa)} sobre 70% (serviços) ou 20% (bens/hotelaria).`,
    `- **Categoria F (rendas puras)**: taxa autónoma habitação ${pct(catFHab)} · não habitacional ${pct(catFNaoHab)}; reduções por duração do contrato habitacional (5–10 anos −10 p.p.; 10–20 −15 p.p.; ≥20 −20 p.p.). Sem SS, sem IVA. Motor próprio \`calcularCategoriaF\`.`,
    `- **IRS**: escalões de ${escaloesMin} a ${escaloesMax}; mínimo de existência ${eur(minExist)}.`,
    `- **IRS nas regiões autónomas**: taxas do Art. 68.º reduzidas em ${pct(reducaoMadeira)} na Madeira e ${pct(reducaoAcores)} nos Açores (de ${escaloesMinRA} a ${escaloesMaxRA}), com os MESMOS limites de escalão. Decide a **residência fiscal**, não a origem do rendimento nem a região do IVA. Motor: \`escaloesIRSDaRegiao()\` + \`irsProgressivo(coletavel, regiao)\`.`,
    `- **IRC** (comparador): geral ${pct(ircGeral)} · PME ${pct(ircPme)} até ${eur(ircLimite)}; dividendos ${pct(dividendos)}.`,
    `- **Catálogo**: ${totalAtividades} atividades (Art. 151.º + regimes especiais + subsídios).`,
    END,
  ].join("\n");

  const skill = await readFile(SKILL_FILE, "utf8");
  const startIdx = skill.indexOf(START);
  const endIdx = skill.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.error(
      `[sync-skills] Marcadores AUTO-GERADO não encontrados em ${SKILL_FILE}. ` +
        `Adiciona uma linha com:\n${START}\n${END}`
    );
    process.exit(2);
  }

  const antes = skill.slice(0, startIdx);
  const depois = skill.slice(endIdx + END.length);
  const novo = antes + bloco + depois;

  if (novo === skill) {
    console.log("[sync-skills] Skill já está sincronizada com fiscal-data.ts.");
    process.exit(0);
  }

  if (checkOnly) {
    console.error(
      "[sync-skills] A skill fiscalidade-pt-2026 está DESATUALIZADA face a fiscal-data.ts.\n" +
        "Corre `npm run skills:sync` e faz commit das alterações."
    );
    process.exit(1);
  }

  await writeFile(SKILL_FILE, novo, "utf8");
  console.log("[sync-skills] Bloco de valores fiscais atualizado na skill fiscalidade-pt-2026.");
}

main().catch((e) => {
  console.error("Erro na sincronização das skills:", e);
  process.exit(2);
});
