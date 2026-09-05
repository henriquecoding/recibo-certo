import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════
//  QUEM EMPRESTA O PAINEL NÃO O PERDE PARA QUEM O RECEBEU
//  ---------------------------------------------------------------------
//  `PATCH /api/admin/contas` promovia e despromovia sem olhar a quem.
//  A única trava era não ficar a base sem administrador nenhum — o que,
//  com dois, não trava nada: o segundo despromovia o primeiro e ficava
//  sozinho no painel, sem caminho de volta pela aplicação para quem lhe
//  tinha dado a chave.
//
//  A correção tem três camadas, e este teste existe porque duas delas são
//  invisíveis a olho nu:
//
//    · a rota compara ATOR com ALVO e recusa com 403;
//    · o gatilho `profiles_protegido_lock` fecha a escrita direta;
//    · o ecrã não desenha botão nenhum na conta dona.
//
//  A primeira é a que importa, e é a mais fácil de perder: a rota fala com
//  a base como `service_role`, onde `auth.uid()` é nulo e o gatilho deixa
//  passar de propósito (é o caminho de recuperação). Se a verificação sair
//  da rota — numa refatoração, num merge, a apagar uma linha que parecia
//  redundante — nada falha, nada avisa, e a proteção desaparece inteira
//  enquanto a coluna, o gatilho e o ecrã continuam lá a sugerir que existe.
//
//  Por isso o teste é estrutural: não prova que o 403 é devolvido em
//  runtime (isso é do arreio de RLS e do smoke), prova que o código que o
//  devolve continua escrito, e no sítio certo — ANTES da escrita.
// ═══════════════════════════════════════════════════════════════════════

const ROTA = join(process.cwd(), "src/app/api/admin/contas/route.ts");
const ECRA = join(process.cwd(), "src/app/admin/contas/page.tsx");
const MIGRACOES = join(process.cwd(), "supabase/migrations");

const rota = readFileSync(ROTA, "utf-8");
const ecra = readFileSync(ECRA, "utf-8");

/** O corpo do PATCH, que é o único método que altera papéis. */
function corpoDoPatch(): string {
  const i = rota.indexOf("export async function PATCH");
  expect(i, "o PATCH de /api/admin/contas desapareceu").toBeGreaterThan(-1);
  return rota.slice(i);
}

describe("RC-SEC-014 · a conta dona do projeto", () => {
  it("o contrato da conta publica a marca `protegido`", () => {
    // Sem isto no tipo, o ecrã não tem por onde saber, e a UI passa a
    // mostrar um botão que a rota vai recusar — o pior dos dois mundos.
    expect(rota).toMatch(/protegido:\s*boolean/);
  });

  it("a leitura de contas traz `protegido` da base", () => {
    // Um SELECT que não peça a coluna devolve-a como `undefined`, e
    // `undefined === true` é falso: a proteção evaporava-se em silêncio,
    // sem erro de tipo e sem teste vermelho.
    expect(rota).toMatch(/\.select\(\s*"[^"]*\bprotegido\b[^"]*"\s*\)/);
  });

  it("o PATCH recusa alterar o papel da conta dona por outro administrador", () => {
    const patch = corpoDoPatch();
    expect(patch).toMatch(/protegido\s*===\s*true/);
    expect(patch).toMatch(/ator\.id\s*!==\s*id/);
    expect(patch).toMatch(/status:\s*403/);
  });

  it("a recusa vem ANTES da escrita, não depois", () => {
    // Uma verificação a seguir ao UPDATE não é uma verificação: é um
    // relatório sobre uma alteração que já aconteceu.
    const patch = corpoDoPatch();
    const recusa = patch.indexOf("protegido === true");
    const escrita = patch.search(/\.update\(\s*\{\s*role\s*\}\s*\)/);

    expect(recusa, "a recusa da conta dona não foi encontrada").toBeGreaterThan(-1);
    expect(escrita, "o UPDATE do papel não foi encontrado").toBeGreaterThan(-1);
    expect(recusa).toBeLessThan(escrita);
  });

  it("a própria conta dona não fica trancada fora da sua decisão", () => {
    // A condição tem de ser «protegido E não é ele», nunca só «protegido».
    // Quem quiser sair da administração pode — e a trava do último
    // administrador continua a valer para esse caso.
    const patch = corpoDoPatch();
    const linha = patch.split("\n").find((l) => l.includes("protegido === true"));
    expect(linha, "a condição da conta dona não foi encontrada").toBeDefined();
    expect(linha!).toMatch(/ator\.id\s*!==\s*id/);
  });

  it("a trava do último administrador não foi perdida no caminho", () => {
    // As duas travas resolvem problemas diferentes e nenhuma substitui a
    // outra: esta impede ficar sem administração, aquela impede perder-se
    // a de quem a concedeu.
    expect(corpoDoPatch()).toMatch(/status:\s*409/);
  });

  it("a base tem o gatilho que fecha a escrita direta", () => {
    const sql = readdirSync(MIGRACOES)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(MIGRACOES, f), "utf-8"))
      .join("\n");

    expect(sql).toMatch(/CREATE TRIGGER profiles_protegido_lock/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS protegido/);
    // A marca não se levanta pela aplicação: sem isto, a proteção era
    // contornável em dois pedidos — levantar a marca, depois despromover.
    expect(sql).toMatch(/NEW\.protegido IS DISTINCT FROM OLD\.protegido/);
  });

  it("o ecrã não desenha botão de papel na conta dona", () => {
    // Não é cosmética: um botão que existe e falha ensina a pessoa a
    // desconfiar do painel. O ecrã diz o que a rota faz.
    expect(ecra).toMatch(/detalhe\.protegido/);
    const i = ecra.indexOf("detalhe.protegido");
    // A CHAMADA do botão, não a definição de `mudarPapel` — que está no
    // topo do ficheiro e apareceria sempre primeiro.
    const j = ecra.search(/onClick=\{\s*\(\)\s*=>\s*mudarPapel\(/);
    expect(i, "a UI não distingue a conta dona").toBeGreaterThan(-1);
    expect(j, "o botão de mudar papel desapareceu").toBeGreaterThan(-1);
    // A ramificação da conta dona vem antes do botão: é um ramo alternativo
    // do mesmo ternário, não um adorno a seguir.
    expect(i).toBeLessThan(j);
  });
});
