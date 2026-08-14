import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULTS, type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import {
  completude, porResponder, totalAplicavel, SECCOES,
} from "@/components/dashboard/perfil-fiscal/completude";

const RAIZ = process.cwd();
const ler = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

const com = (patch: Partial<PreferenciasFiscais>): PreferenciasFiscais => ({ ...DEFAULTS, ...patch });

describe("perfil fiscal: o que falta responder", () => {
  it("um perfil por estrear tem tudo por responder", () => {
    const e = completude(DEFAULTS);
    expect(e.respondidas).toBe(0);
    expect(e.percentagem).toBe(0);
    expect(e.completo).toBe(false);
  });

  it("«não sei» conta como por responder, não como resposta", () => {
    // É o ponto todo: se «não sei» contasse como resposta, a barra chegava a
    // 100% sem o painel saber nada — e voltávamos a supor em silêncio.
    const e = completude(com({ optouDispensaRetencao: "nao-sei" }));
    expect(e.faltas.retencao).toContain("Dispensa de retenção");
  });

  it("«não» é uma resposta como qualquer outra", () => {
    const e = completude(com({ optouDispensaRetencao: "nao" }));
    expect(e.faltas.retencao).not.toContain("Dispensa de retenção");
  });

  it("zero e «vazio» não são a mesma coisa numa faturação", () => {
    expect(completude(com({ faturacaoAnoAnterior: null })).faltas.iva)
      .toContain("Faturação do ano anterior");
    expect(completude(com({ faturacaoAnoAnterior: 0 })).faltas.iva)
      .not.toContain("Faturação do ano anterior");
  });

  it("o total conta só as perguntas aplicáveis a este caso", () => {
    // Quem não acumula emprego não tem de responder às três condições da
    // acumulação — contá-las era manter a barra permanentemente incompleta.
    expect(totalAplicavel(com({ acumulaEmprego: false, conjunta: false }))).toBe(5);
    expect(totalAplicavel(com({ acumulaEmprego: true, conjunta: false }))).toBe(8);
    expect(totalAplicavel(com({ acumulaEmprego: true, conjunta: true }))).toBe(9);
  });

  it("ligar a acumulação abre perguntas novas e baixa a percentagem", () => {
    const base = com({
      dataInicioAtividade: "2024-03-01",
      regimeIVA: "isento",
      faturacaoAnoAnterior: 12000,
      optouDispensaRetencao: "sim",
      pagamentosPorConta: "nao",
    });
    expect(completude(base).completo).toBe(true);
    expect(completude(base).percentagem).toBe(100);

    const acumula = completude(com({ ...base, acumulaEmprego: true }));
    expect(acumula.completo).toBe(false);
    expect(acumula.faltas["seguranca-social"]).toHaveLength(3);
  });

  it("um perfil respondido de ponta a ponta chega a 100%", () => {
    const tudo = com({
      dataInicioAtividade: "2023-01-15",
      regimeIVA: "normal-trimestral",
      faturacaoAnoAnterior: 40000,
      optouDispensaRetencao: "nao",
      pagamentosPorConta: "sim",
      acumulaEmprego: true,
      acumulacaoEntidadesDistintas: "sim",
      remuneracaoDependenteMensal: 1400,
      rendimentoCategoriaA: 19600,
      conjunta: true,
      rendimentoConjuge: 22000,
    });
    const e = completude(tudo);
    expect(e.porResponderTotal).toBe(0);
    expect(e.percentagem).toBe(100);
    expect(e.completo).toBe(true);
  });

  it("a percentagem nunca sai de 0–100", () => {
    for (const p of [DEFAULTS, com({ acumulaEmprego: true }), com({ conjunta: true })]) {
      const e = completude(p);
      expect(e.percentagem).toBeGreaterThanOrEqual(0);
      expect(e.percentagem).toBeLessThanOrEqual(100);
    }
  });

  it("cada secção declara o que destranca", () => {
    for (const s of SECCOES) {
      expect(s.destranca.length, s.id).toBeGreaterThan(30);
      expect(s.titulo.length, s.id).toBeGreaterThan(2);
    }
  });

  it("as faltas só usam chaves de secções que existem", () => {
    const ids = new Set(SECCOES.map((s) => s.id));
    for (const chave of Object.keys(porResponder(DEFAULTS))) {
      expect(ids, chave).toContain(chave);
    }
  });
});

describe("perfil fiscal: exige sessão iniciada", () => {
  const EDITOR = "src/components/dashboard/PerfilFiscalEditor.tsx";

  it("o editor consulta a sessão antes de mostrar os campos", () => {
    const fonte = ler(EDITOR);
    expect(fonte).toContain('from "@/lib/supabase/auth"');
    expect(fonte).toMatch(/disponivel && !user/);
  });

  it("sem sessão mostra uma porta com entrada, não um formulário vazio", () => {
    const fonte = ler(EDITOR);
    expect(fonte).toContain("PortaFechada");
    expect(fonte).toContain('abrirModal("entrar")');
  });

  it("não bloqueia quando não há sistema de contas configurado", () => {
    // Exigir sessão num ambiente sem Supabase trancava toda a gente fora de
    // uma página que, nesse caso, funciona perfeitamente em modo local.
    const fonte = ler(EDITOR);
    const linha = fonte.split("\n").find((l) => l.includes("disponivel && !user"));
    expect(linha, "o bloqueio tem de depender de `disponivel`").toBeDefined();
  });

  it("a porta fechada não promete que os cálculos exigem conta", () => {
    const fonte = ler(EDITOR);
    expect(fonte).toMatch(/sem conta|sem sessão e sem registo/i);
  });

  it("deixou de dizer que o perfil fica só neste dispositivo", () => {
    // A frase antiga («Fica guardado neste dispositivo») passaria a ser falsa
    // agora que a página exige sessão e sincroniza no plano Plus.
    const fonte = ler(EDITOR);
    expect(fonte).not.toContain("Fica guardado neste dispositivo");
  });
});

describe("sincronização: Plus, nuvem e dispositivo", () => {
  const SUB = "src/lib/stripe/subscription.tsx";
  const PREFS = "src/lib/store/preferencias-fiscais.ts";

  it("o Plus exige estado aceite E preço autorizado", () => {
    // RC-BILL-002: um preço de teste ou um preço de 0 € criado à mão não
    // pode conceder Plus só por a subscrição estar «active».
    // A decisão deixou de ser tomada no cliente: vive no servidor, em
    // billing/access, atrás de /api/entitlements. O cliente não pode decidir.
    const acesso = ler("src/lib/billing/access.ts");
    expect(acesso).toContain("concedePlus");
    expect(acesso).toMatch(/from\("subscriptions"\)/);
    expect(acesso).toMatch(/\.eq\("user_id", userId\)/);
    expect(acesso, "o preço tem de ser confirmado no catálogo").toMatch(/from\("billing_price_catalog"\)/);

    const fonte = ler(SUB);
    expect(fonte, "o cliente pergunta ao servidor").toContain("/api/entitlements");
    expect(fonte, "o cliente não decide sozinho").not.toMatch(/from\("subscriptions"\)/);
  });

  it("o estado da subscrição é revalidado ao voltar ao separador", () => {
    // Mudava fora desta aba — no portal do Stripe, noutro dispositivo, ou
    // por uma renovação falhada — e a aba aberta continuava a conceder ou a
    // negar Plus com o estado de ontem.
    const fonte = ler(SUB);
    expect(fonte).toContain("visibilitychange");
    expect(fonte).toContain("revalidar");
  });

  it("depois do checkout, espera pelo webhook em vez de dizer «Grátis»", () => {
    const fonte = ler(SUB);
    // Voltando do Checkout, o plano ainda pode não estar projetado. Enquanto
    // houver sessão de checkout no URL e o plano não for «plus», volta a
    // perguntar — com um limite de tentativas para não ficar em ciclo.
    expect(fonte).toContain("checkoutSessionId()");
    expect(fonte).toMatch(/result\.plano !== "plus"/);
    expect(fonte, "tem de haver um limite de tentativas").toMatch(/attemptsLeft/);
    expect(fonte).toMatch(/setTimeout\(load/);
  });

  it("as preferências locais sobem para a nuvem na primeira leitura com Plus", () => {
    // Quem preencheu o perfil sem Plus tinha-o em localStorage. Ao ganhar
    // Plus, a coluna continuava vazia até à próxima edição — e o segundo
    // dispositivo mostrava o perfil em branco.
    const fonte = ler(PREFS);
    expect(fonte).toContain("preferencias_fiscais: locais");
    expect(fonte).toContain("vazio(locais)");
  });

  it("um perfil por estrear não é subido por cima do da nuvem", () => {
    const fonte = ler(PREFS);
    expect(fonte).toMatch(/function vazio\(/);
    expect(fonte).toMatch(/every\(\(k\) => p\[k\] === DEFAULTS\[k\]\)/);
  });

  it("a nuvem só entra em jogo com sessão E Plus", () => {
    const fonte = ler(PREFS);
    // A regra é a mesma; o que mudou foi quem a aplica. Enquanto cada
    // repositório a escrevia por si, era feita cedo de mais: `plano`
    // começa em "free" e um assinante do Plus era tratado como grátis até
    // a subscrição responder — e o que guardasse nesse intervalo ficava
    // no aparelho, invisível para a aplicação daí em diante.
    expect(fonte).toContain("destinoDosDados");
    expect(fonte).toMatch(/naNuvem = destino === "nuvem"/);
    expect(fonte, "escreve antes de saber para onde").toContain('destino === "por-decidir"');
  });

  it("uma falha da nuvem não apaga o que está no dispositivo", () => {
    const fonte = ler(PREFS);
    expect(fonte).toContain("setPrefs(ler())");
  });
});
