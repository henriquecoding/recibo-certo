// ═══════════════════════════════════════════════════════════════════════
//  VERIFICAÇÃO DA AUDITORIA DO QUIZ — QZ-01 a QZ-22, ponto a ponto
//  ---------------------------------------------------------------------
//  Uma asserção por achado do relatório, para que a implementação não possa
//  regredir sem alguém dar por isso. Onde o achado é de infraestrutura
//  (policies SQL, rotas de servidor), verifica-se o artefacto: que a
//  migração revoga o que tem de revogar e que a rota existe e não confia no
//  cliente.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { carregarBancoQuiz, getPerguntasComDiagnostico, embaralharOpcoes } from "../quiz-fiscal";
import { calcularPontosPergunta, calcularXPSessao } from "../quiz-fiscal/progresso";
import { TOTAL_PERGUNTAS_META, ESTATISTICAS_BANCO } from "../quiz-fiscal/quiz-meta";
import { verificarSessao } from "../quiz-fiscal/server";
import { DEFAULT_QUIZ_CONFIG } from "@/hooks/useQuizConfig";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("QZ-01 · cupões: verificação no servidor, escrita fechada ao cliente", () => {
  const migracao = "supabase/migrations/024_quiz_premios_so_no_servidor.sql";

  it("existe migração que revoga escrita ao role `authenticated`", () => {
    expect(existsSync(join(raiz, migracao))).toBe(true);
    const sql = ler(migracao);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.quiz_cupoes FROM authenticated/);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.quiz_achievement_progress FROM authenticated/);
    expect(sql).toMatch(/DROP POLICY "quiz_cupoes_own_insert"/);
    expect(sql).toMatch(/DROP POLICY "quiz_achieve_own_insert"/);
  });

  it("`subscriptions` NÃO é aberta ao cliente", () => {
    // Era a «correção óbvia» que transformaria o problema em plano grátis.
    const sql = ler(migracao);
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|ALL).*subscriptions.*authenticated/i);
  });

  it("as rotas de servidor existem", () => {
    expect(existsSync(join(raiz, "src/app/api/quiz/sessao/route.ts"))).toBe(true);
    expect(existsSync(join(raiz, "src/app/api/quiz/cupao/route.ts"))).toBe(true);
  });

  it("o servidor recalcula os acertos e ignora o que o cliente afirma", async () => {
    const banco = await carregarBancoQuiz();
    const dez = banco.slice(0, 10);
    // Todas certas → sessão perfeita.
    const perfeita = await verificarSessao({
      dificuldade: 2,
      respostas: dez.map((p) => ({ perguntaId: p.id, opcaoSelecionada: p.correta })),
    });
    expect(perfeita.acertos).toBe(10);
    expect(perfeita.perfeito).toBe(true);

    // Todas erradas → nenhum acerto, por muito que o cliente quisesse.
    const falhada = await verificarSessao({
      dificuldade: 2,
      respostas: dez.map((p) => ({
        perguntaId: p.id,
        opcaoSelecionada: (p.correta + 1) % p.opcoes.length,
      })),
    });
    expect(falhada.acertos).toBe(0);
    expect(falhada.perfeito).toBe(false);
  });

  it("uma submissão com IDs inventados é rejeitada", async () => {
    const r = await verificarSessao({
      dificuldade: 3,
      respostas: [{ perguntaId: "nao-existe-1", opcaoSelecionada: 0 }],
    });
    expect(r.desconhecidos).toContain("nao-existe-1");
    expect(r.perfeito).toBe(false);
  });

  it("repetir a mesma pergunta não a conta duas vezes", async () => {
    const banco = await carregarBancoQuiz();
    const p = banco[0];
    const r = await verificarSessao({
      dificuldade: 2,
      respostas: Array.from({ length: 10 }, () => ({ perguntaId: p.id, opcaoSelecionada: p.correta })),
    });
    expect(r.totalPerguntas).toBe(1);
    expect(r.perfeito).toBe(false);
  });

  it("`ativarCupao` devolve erro em vez de sucesso incondicional", () => {
    const fonte = ler("src/lib/supabase/quiz-achievements.ts");
    expect(fonte).toMatch(/ativarCupao\(cupaoId: string\)/);
    expect(fonte).toMatch(/erro: corpo\?\.erro/);
    // Deixa de escrever diretamente nas tabelas de prémio.
    expect(fonte).not.toMatch(/from\("subscriptions"\)/);
    expect(fonte).not.toMatch(/from\("quiz_cupoes"\)\s*\.insert/);
  });

  it("nenhuma escrita do Supabase fica com o erro por ler", () => {
    for (const f of [
      "src/app/api/stripe/webhook/route.ts",
      "src/app/api/email/guardiao/route.ts",
      "src/lib/store/quiz-progresso.ts",
    ]) {
      const linhas = ler(f).split("\n");
      const semVerificacao = linhas.filter(
        (l) => /await (sb|getSupabase\(\))\.from\(/.test(l) && !/\{\s*(data|error)/.test(l) && !/const \{/.test(l),
      );
      expect(semVerificacao, f).toEqual([]);
    }
  });
});

describe("QZ-02 · a economia deixa de ser decorativa", () => {
  it("a energia é consumida também ao repetir a partir do resultado", () => {
    const app = ler("src/components/quiz-fiscal/QuizFiscalApp.tsx");
    expect(app).toMatch(/handleJogarNovamente/);
    expect(app).toMatch(/onJogarNovamente=\{handleJogarNovamente\}/);
    const resultado = ler("src/components/quiz-fiscal/Resultado.tsx");
    expect(resultado).toMatch(/onJogarNovamente/);
  });

  it("não há XP de conclusão com zero acertos", () => {
    expect(calcularXPSessao({ pontos: 0, acertos: 0, total: 10 })).toBe(0);
    expect(calcularXPSessao({ pontos: 0, acertos: 5, total: 10 })).toBeGreaterThan(0);
    expect(calcularXPSessao({ pontos: 100, acertos: 10, total: 10 })).toBeGreaterThan(
      calcularXPSessao({ pontos: 100, acertos: 5, total: 10 }),
    );
  });

  it("o relógio da energia pode vir de fora (servidor)", () => {
    expect(ler("src/lib/quiz-fiscal/progresso.ts")).toMatch(/agoraRef\?: Date/);
  });
});

describe("QZ-03 · o quiz deixa de envelhecer em silêncio", () => {
  it("existe o verificador de literais fiscais", () => {
    expect(existsSync(join(raiz, "src/lib/__tests__/quiz-fiscal-check.test.ts"))).toBe(true);
    const pkg = JSON.parse(ler("package.json"));
    expect(pkg.scripts["quiz:fiscal-check"]).toBeTruthy();
    expect(pkg.scripts["quiz:check"]).toBeTruthy();
  });

  it("as perguntas com valores voláteis passaram a importar do motor", () => {
    for (const f of ["src/lib/quiz-fiscal/perguntas-geral.ts", "src/lib/quiz-fiscal/perguntas-regime.ts"]) {
      expect(ler(f), f).toMatch(/from "\.\.\/fiscal-data"/);
    }
  });
});

describe("QZ-04 / QZ-05 · integridade do banco", () => {
  it("nenhuma pergunta tem opções repetidas (era o `rs-98`)", async () => {
    const banco = await carregarBancoQuiz();
    const maus = banco.filter((p) => new Set(p.opcoes.map((o) => o.texto.trim())).size !== p.opcoes.length);
    expect(maus.map((p) => p.id)).toEqual([]);
  });

  it("o `rs-98` tem a resposta certa marcada e uma explicação coerente", async () => {
    const banco = await carregarBancoQuiz();
    const p = banco.find((q) => q.id === "rs-98")!;
    expect(p).toBeDefined();
    expect(p.opcoes[p.correta].texto).toBe("36.000 €");
    expect(p.opcoes[p.correta].porque.startsWith("Correto")).toBe(true);
  });

  it("nenhum enunciado se repete", async () => {
    const banco = await carregarBancoQuiz();
    const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const vistos = new Map<string, string>();
    const dups: string[] = [];
    for (const p of banco) {
      const k = norm(p.pergunta);
      if (vistos.has(k)) dups.push(`${vistos.get(k)} ≡ ${p.id}`);
      else vistos.set(k, p.id);
    }
    expect(dups).toEqual([]);
  });
});

describe("QZ-06 · a dedução da categoria A está certa", () => {
  it("nenhuma pergunta apresenta 4.104 € como dedução da categoria A", async () => {
    const banco = await carregarBancoQuiz();
    const suspeitas: string[] = [];
    for (const p of banco) {
      for (const o of p.opcoes) {
        const texto = `${o.texto} ${o.porque}`;
        if (!texto.includes("4.104")) continue;
        const contextoMax = /max\(|máx\(|8,54/.test(texto);
        const catA = /categoria A|trabalho dependente/i.test(texto);
        if (catA && !contextoMax) suspeitas.push(p.id);
      }
    }
    expect(suspeitas).toEqual([]);
  });
});

describe("QZ-07 · a contagem é regenerável e está em dia", () => {
  it("o gerador existe e a meta bate com o banco", async () => {
    expect(existsSync(join(raiz, "scripts/gen-quiz-meta.mjs"))).toBe(true);
    const banco = await carregarBancoQuiz();
    expect(TOTAL_PERGUNTAS_META).toBe(banco.length);
    const somaCategorias = Object.values(ESTATISTICAS_BANCO).reduce((s, c) => s + c.total, 0);
    expect(somaCategorias).toBe(banco.length);
  });
});

describe("QZ-08 · o tempo escolhido é respeitado", () => {
  it("`tempoPorPergunta` chega ao jogo", () => {
    expect(ler("src/components/quiz-fiscal/SelecaoModo.tsx")).toMatch(/tempoPorPergunta: config\.tempoPorPergunta/);
    expect(ler("src/hooks/useQuizFiscal.ts")).toMatch(/tempoPorPergunta\?: number/);
  });

  it("o bónus de velocidade acompanha o tempo limite", () => {
    const base = { dificuldade: 2 as const, streakAntes: 0, modo: "normal" as const, tempoGastoSeg: 25 };
    // Com 20s de limite, 25s gastos não dão bónus; com 60s, dão.
    const com20 = calcularPontosPergunta({ ...base, tempoLimiteSeg: 20 });
    const com60 = calcularPontosPergunta({ ...base, tempoLimiteSeg: 60 });
    expect(com60).toBeGreaterThan(com20);
    // Modo livre: sem cronómetro, sem bónus de velocidade.
    const livre = calcularPontosPergunta({ ...base, tempoLimiteSeg: 0 });
    expect(livre).toBeLessThanOrEqual(com20);
  });

  it("o default do painel continua a ser 60s", () => {
    expect(DEFAULT_QUIZ_CONFIG.tempoPorPergunta).toBe(60);
  });
});

describe("QZ-09 / QZ-10 · definições ligadas e áudio único", () => {
  it("`useGameJuice` respeita som e vibração", () => {
    const f = ler("src/hooks/useGameJuice.ts");
    expect(f).toMatch(/somAtivo/);
    expect(f).toMatch(/vibracaoAtiva/);
    expect(f).toMatch(/if \(!somAtivo\) return;/);
    expect(f).toMatch(/if \(!vibracaoAtiva\) return;/);
  });

  it("há um só AudioContext, reutilizado e fechado", () => {
    const f = ler("src/hooks/useGameJuice.ts");
    expect(f).toMatch(/ctxRef/);
    expect(f).toMatch(/ctx\.close\(\)/);
    // Já não se cria um contexto por tom.
    expect(f).not.toMatch(/const ctx = new AC\(\) as AudioContext;/);
  });

  it("as restantes três definições são lidas pelo jogo", () => {
    const quiz = ler("src/components/quiz-fiscal/Quiz.tsx");
    expect(quiz).toMatch(/config\.animacoesAtivas/);
    expect(quiz).toMatch(/config\.atalhosTeclado/);
    expect(quiz).toMatch(/prefers-reduced-motion/);
    expect(ler("src/hooks/useQuizFiscal.ts")).toMatch(/explicacoesAutomaticas/);
  });
});

describe("QZ-11 a QZ-19 · lógica de jogo", () => {
  it("QZ-11 · pular regista a pergunta", () => {
    const f = ler("src/hooks/useQuizFiscal.ts");
    expect(f).toMatch(/pulada: true/);
    expect(f).toMatch(/const novasRespostas = \[\.\.\.respostas, registo\];[\s\S]{0,200}irParaProxima\(novasRespostas\)/);
  });

  it("QZ-12 · a sequência é lida de `streakAoResponder` (o Escudo conta)", () => {
    const f = ler("src/hooks/useQuizFiscal.ts");
    expect(f).toMatch(/function streakActualDe[\s\S]{0,200}streakAoResponder/);
    expect(f).toMatch(/function streakMaximoDe[\s\S]{0,200}streakAoResponder/);
  });

  it("QZ-13 · o timeout da pausa é cancelável", () => {
    const f = ler("src/hooks/useQuizFiscal.ts");
    expect(f).toMatch(/pausaFeedbackRef/);
    expect(f).toMatch(/clearTimeout\(pausaFeedbackRef\.current\)/);
  });

  it("QZ-14 · a deduplicação de XP usa um ID de sessão", () => {
    expect(ler("src/hooks/useQuizFiscal.ts")).toMatch(/sessaoId/);
    expect(ler("src/components/quiz-fiscal/QuizFiscalApp.tsx")).toMatch(
      /sessaoRegistadaRef\.current === quiz\.sessaoId/,
    );
  });

  it("QZ-15 · há anti-repetição entre sessões", () => {
    expect(existsSync(join(raiz, "src/lib/quiz-fiscal/vistas.ts"))).toBe(true);
    expect(ler("src/hooks/useQuizFiscal.ts")).toMatch(/excluirIds: lerVistas\(\)/);
  });

  it("QZ-16 · o fallback fica na categoria e é comunicado", async () => {
    // Categoria pequena, sessão maior do que ela: tem de ceder alguma coisa,
    // mas a categoria é a ÚLTIMA a ceder.
    const r = await getPerguntasComDiagnostico({ quantidade: 10, categoria: "dep_irs", dificuldade: 3 });
    expect(r.perguntas).toHaveLength(10);
    expect(r.perguntas.every((p) => p.categoria === "dep_irs")).toBe(true);
    expect(r.diagnostico.foraDaCategoria).toBe(0);
    // E a interface tem como o dizer.
    expect(ler("src/components/quiz-fiscal/QuizNormal.tsx")).toMatch(/descreverCedencia/);
  });

  it("QZ-16 · exclusões não empurram a sessão para fora da categoria", async () => {
    const banco = await carregarBancoQuiz();
    const daCategoria = banco.filter((p) => p.categoria === "prazos").map((p) => p.id);
    // Excluir quase tudo: prefere-se repetir dentro da categoria a sair dela.
    const r = await getPerguntasComDiagnostico({
      quantidade: 10,
      categoria: "prazos",
      excluirIds: daCategoria.slice(0, daCategoria.length - 2),
    });
    expect(r.perguntas).toHaveLength(10);
    expect(r.perguntas.every((p) => p.categoria === "prazos")).toBe(true);
    expect(r.diagnostico.repetidas).toBeGreaterThan(0);
  });

  it("QZ-17 · a seleção usa `Set` em vez de `includes`", () => {
    const f = ler("src/lib/quiz-fiscal/index.ts");
    expect(f).toMatch(/const excluidos = new Set\(excluirIds\)/);
    expect(f).not.toMatch(/excluirIds\.includes/);
  });

  it("QZ-18 · o cronómetro deriva de um deadline", () => {
    const f = ler("src/hooks/useQuizFiscal.ts");
    expect(f).toMatch(/deadlineRef/);
    expect(f).toMatch(/setInterval/);
    expect(f).not.toMatch(/setTimeout\(\(\) => setTempoRestante\(\(s\) => s - 1\), 1000\)/);
  });

  it("QZ-19 · «Eliminar 2» acumula com a Segunda Chance", () => {
    const f = ler("src/hooks/useQuizFiscal.ts");
    expect(f).toMatch(/setEliminadas\(\(prev\) => \{/);
    expect(f).toMatch(/new Set\(\[\.\.\.prev/);
  });

  it("o embaralhamento devolve os índices originais (verificação no servidor)", async () => {
    const banco = await carregarBancoQuiz();
    const p = banco[0];
    const { opcoes, correta, indicesOriginais } = embaralharOpcoes(p);
    expect(indicesOriginais).toHaveLength(p.opcoes.length);
    expect(indicesOriginais[correta]).toBe(p.correta);
    expect(opcoes[correta].texto).toBe(p.opcoes[p.correta].texto);
  });
});

describe("QZ-20 / QZ-21 / QZ-22 · SEO, metadata e acessibilidade", () => {
  it("QZ-20 · há rotas estáticas por categoria com JSON-LD", () => {
    const rota = "src/app/quiz-fiscal/[categoria]/page.tsx";
    expect(existsSync(join(raiz, rota))).toBe(true);
    const f = ler(rota);
    expect(f).toMatch(/generateStaticParams/);
    expect(f).toMatch(/generateQuizSchema/);
    expect(f).toMatch(/generateBreadcrumbSchema/);
    expect(f).toMatch(/application\/ld\+json/);
    // Renderiza conteúdo real, não uma casca.
    expect(f).toMatch(/legalBasis/);
    expect(f).toMatch(/fonte\.url/);
  });

  it("QZ-20 · o layout do quiz deixou de ser cliente sem necessidade", () => {
    expect(ler("src/app/quiz-fiscal/layout.tsx")).not.toMatch(/^"use client"/m);
  });

  it("QZ-20 · as categorias entram no sitemap", async () => {
    const { PUBLIC_ROUTES } = await import("@/lib/seo");
    const rotas = PUBLIC_ROUTES.map((r) => r.path);
    expect(rotas).toContain("/quiz-fiscal/retencao");
    expect(rotas).toContain("/quiz-fiscal/iva");
    expect(rotas.filter((r) => r.startsWith("/quiz-fiscal/"))).toHaveLength(
      Object.keys(ESTATISTICAS_BANCO).length,
    );
  });

  it("QZ-21 · a metadata tem acentos e o número certo", () => {
    const f = ler("src/app/quiz-fiscal/page.tsx");
    expect(f).toMatch(/Segurança Social/);
    expect(f).toMatch(/cronómetro/);
    expect(f).toMatch(/explicações/);
    expect(f).toMatch(/sessões/);
    // Nada de «em sessoes de 60»: a interface oferece 5/10/15/20.
    expect(f).not.toMatch(/sessoes de 60/);
    expect(f).toMatch(/TOTAL_PERGUNTAS_META/);
  });

  it("QZ-22 · há `aria-live`, `radiogroup` e respeito por reduced-motion", () => {
    const f = ler("src/components/quiz-fiscal/Quiz.tsx");
    expect(f).toMatch(/aria-live="polite"/);
    expect(f).toMatch(/role="radiogroup"/);
    expect(f).toMatch(/role="radio"/);
    expect(f).toMatch(/aria-checked=/);
    expect(f).toMatch(/prefers-reduced-motion/);
  });
});
