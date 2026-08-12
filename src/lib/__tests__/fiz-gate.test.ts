// RC-FIZ-002 — a integração FIZ tem de falhar FECHADA.
//
// O relatório mestre de 11-08-2026 encontrou `fizAtiva()` a devolver `true`
// quando `NEXT_PUBLIC_FIZ_ENABLED` está ausente. A intenção original era boa —
// a regra anterior ("ligada em preview, desligada em produção") tinha causado
// um deploy silenciosamente vazio, porque ninguém definira a variável — mas a
// resposta a uma falha silenciosa não é abrir a porta por omissão: é fechá-la e
// tornar a má configuração RUIDOSA.
//
// E havia um segundo buraco, maior: as rotas `/api/integrations/fiz/*` não
// consultavam bandeira nenhuma. Aceitavam dados independentemente do estado da
// integração — e a bandeira do cliente é `NEXT_PUBLIC_`, ou seja, fica gravada
// no build. Um build antigo com a integração ligada continuava a poder falar
// com o servidor mesmo depois de alguém a desligar.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
  delete process.env.FIZ_ENABLED;
});

async function flag() {
  const mod = await import("@/lib/fiz/flag");
  return mod;
}

async function gate() {
  const mod = await import("@/lib/fiz/gate.server");
  return mod;
}

describe("RC-FIZ-002 · bandeira de apresentação", () => {
  it("SÓ a string 'true' liga a integração", async () => {
    const { fizAtiva } = await flag();
    for (const valor of ["true"]) {
      process.env.NEXT_PUBLIC_FIZ_ENABLED = valor;
      expect(fizAtiva(), `"${valor}" devia ligar`).toBe(true);
    }
  });

  it("qualquer outro valor — ou a ausência — deixa desligada", async () => {
    const { fizAtiva } = await flag();
    // A matriz que o relatório pede: ausente, vazio, false, lixo, e as
    // variações de caixa que um humano escreve à pressa num painel.
    delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
    expect(fizAtiva(), "ausente devia desligar").toBe(false);

    for (const valor of ["", "false", "FALSE", "0", "no", "sim", "TRUE", "True", " true", "true "]) {
      process.env.NEXT_PUBLIC_FIZ_ENABLED = valor;
      expect(fizAtiva(), `"${valor}" não devia ligar`).toBe(false);
    }
  });
});

describe("RC-FIZ-002 · porta do servidor, independente do build", () => {
  it("está fechada quando FIZ_ENABLED está ausente", async () => {
    const { fizAtivaNoServidor } = await gate();
    expect(fizAtivaNoServidor()).toBe(false);
  });

  it("SÓ a string 'true' a abre", async () => {
    const { fizAtivaNoServidor } = await gate();
    process.env.FIZ_ENABLED = "true";
    expect(fizAtivaNoServidor()).toBe(true);
    for (const valor of ["", "false", "1", "yes", "TRUE", "true "]) {
      process.env.FIZ_ENABLED = valor;
      expect(fizAtivaNoServidor(), `"${valor}" não devia abrir`).toBe(false);
    }
  });

  it("NÃO herda a bandeira do cliente", async () => {
    // É o ponto que interessa: `NEXT_PUBLIC_FIZ_ENABLED` é inlined no build.
    // Se o servidor a lesse, um build antigo mantinha a porta aberta depois de
    // alguém desligar a integração.
    const { fizAtivaNoServidor } = await gate();
    process.env.NEXT_PUBLIC_FIZ_ENABLED = "true";
    expect(fizAtivaNoServidor()).toBe(false);
  });

  it("devolve 503 controlado, sem aceitar dados, quando fechada", async () => {
    const { portaFechada } = await gate();
    const resposta = portaFechada();
    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("cache-control")).toContain("no-store");
    const corpo = await resposta.json();
    expect(corpo.codigo).toBe("desligada");
    // Nada de detalhes de configuração na resposta pública.
    expect(JSON.stringify(corpo)).not.toMatch(/FIZ_ENABLED|client_secret|token/i);
  });
});

describe("RC-FIZ-002 · a má configuração é ruidosa, não silenciosa", () => {
  it("o diagnóstico enumera capability a capability", async () => {
    const { diagnosticoFiz } = await gate();
    process.env.FIZ_ENABLED = "true";
    const d = diagnosticoFiz();
    expect(d.ativa).toBe(true);
    // As cinco capacidades do relatório: connect, read, handoff, webhook, revoke.
    for (const cap of ["connect", "read", "handoff", "webhook", "revoke"] as const) {
      expect(d.capacidades[cap]).toBeDefined();
      expect(Array.isArray(d.capacidades[cap].emFalta)).toBe(true);
    }
    // Sem credenciais nenhumas, nenhuma capacidade pode estar pronta.
    expect(Object.values(d.capacidades).every((c) => !c.pronta)).toBe(true);
    expect(d.pronta).toBe(false);
  });

  it("o diagnóstico não expõe o valor dos segredos", async () => {
    process.env.FIZ_ENABLED = "true";
    process.env.FIZ_CLIENT_SECRET = "segredo-mesmo-secreto";
    const { diagnosticoFiz } = await gate();
    expect(JSON.stringify(diagnosticoFiz())).not.toContain("segredo-mesmo-secreto");
  });
});

describe("RC-FIZ-002 · as rotas que transportam dados estão guardadas", () => {
  it("toda rota que aceita ou envia dados chama guardaFiz() antes de ler o corpo", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const base = join(__dirname, "..", "..", "app", "api", "integrations", "fiz");

    // As que transportam dados de uma pessoa, falam com o parceiro, ou
    // recebem dele. `guide-route`/`simulator-route` só resolvem uma rota
    // interna e `capabilities` tem de continuar a poder DIZER que está
    // desligada — por isso ficam de fora, de propósito.
    const guardadas = [
      "action", "callback", "connect", "deadlines", "declarations",
      "disconnect", "handoff", "invoice-draft", "obligations", "webhooks",
    ];

    for (const nome of guardadas) {
      const caminho = join(base, nome, "route.ts");
      expect(existsSync(caminho), `${nome}/route.ts não existe`).toBe(true);
      const fonte = readFileSync(caminho, "utf8");
      expect(fonte, `${nome} não importa a guarda`).toMatch(/guardaFiz/);

      // E a guarda tem de vir ANTES de qualquer leitura do corpo: ler o
      // pedido já é aceitar dados.
      const handler = fonte.slice(fonte.search(/export async function (POST|GET|DELETE|PUT|PATCH)\(/));
      const posGuarda = handler.indexOf("guardaFiz()");
      const posCorpo = handler.search(/req\.json\(\)|request\.json\(\)|req\.text\(\)|request\.text\(\)/);
      expect(posGuarda, `${nome}: guarda em falta no handler`).toBeGreaterThan(-1);
      if (posCorpo > -1) {
        expect(posGuarda, `${nome}: lê o corpo antes de guardar`).toBeLessThan(posCorpo);
      }
    }
  });
});
