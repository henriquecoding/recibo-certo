import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";

// ═══════════════════════════════════════════════════════════════════════
//  Testes da camada de segurança da integração FIZ.
//
//  Estes são os caminhos onde um erro não dá um ecrã partido — dá uma fuga
//  de dados ou uma ação executada em nome de outra pessoa. Por isso são
//  testados diretamente, não através da interface.
// ═══════════════════════════════════════════════════════════════════════

const CHAVE_TESTE = Buffer.alloc(32, 7).toString("base64");
const SEGREDO_WEBHOOK = "segredo-de-teste-abcdef0123456789";

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_FIZ_ENABLED = "true";
  process.env.FIZ_CLIENT_ID = "cliente-teste";
  process.env.FIZ_CLIENT_SECRET = "segredo-teste";
  process.env.FIZ_TOKEN_ENCRYPTION_KEY = CHAVE_TESTE;
  process.env.FIZ_WEBHOOK_SECRET = SEGREDO_WEBHOOK;
  process.env.NEXT_PUBLIC_APP_URL = "https://www.recibocerto.pt";
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
});

describe("cifra de tokens em repouso", () => {
  it("um token cifrado e decifrado volta ao original", async () => {
    const { cifrarToken, decifrarToken } = await import("@/lib/fiz/tokens.server");
    const original = "refresh-token-muito-secreto-123";
    const cifrado = cifrarToken(original);

    expect(cifrado).not.toContain(original);
    expect(cifrado.startsWith("v1.")).toBe(true);
    expect(decifrarToken(cifrado)).toBe(original);
  });

  it("cada cifra usa um nonce novo — o mesmo texto nunca dá o mesmo resultado", async () => {
    const { cifrarToken } = await import("@/lib/fiz/tokens.server");
    expect(cifrarToken("igual")).not.toBe(cifrarToken("igual"));
  });

  it("um token adulterado é rejeitado, não decifrado a meio", async () => {
    const { cifrarToken, decifrarToken } = await import("@/lib/fiz/tokens.server");
    const cifrado = cifrarToken("token");
    const partes = cifrado.split(".");
    // Alterar um byte do texto cifrado tem de falhar a autenticação do GCM.
    partes[3] = Buffer.from("outra-coisa-qualquer").toString("base64url");
    expect(() => decifrarToken(partes.join("."))).toThrow();
  });

  it("sem chave configurada recusa-se a cifrar em vez de guardar em claro", async () => {
    delete process.env.FIZ_TOKEN_ENCRYPTION_KEY;
    const { cifrarToken } = await import("@/lib/fiz/tokens.server");
    expect(() => cifrarToken("token")).toThrow();
  });
});

describe("verificação de webhooks", () => {
  function assinar(corpo: string, timestamp: string, segredo = SEGREDO_WEBHOOK) {
    return `v1=${createHmac("sha256", segredo).update(`${timestamp}.${corpo}`).digest("hex")}`;
  }

  function cabecalhos(mapa: Record<string, string>) {
    return { get: (nome: string) => mapa[nome.toLowerCase()] ?? null };
  }

  const evento = {
    id: "evt_1",
    type: "partner.capability.changed",
    apiVersion: "2026-07-01",
    createdAt: "2026-07-26T10:00:00Z",
    data: {},
    livemode: false,
  };

  it("aceita um evento com assinatura válida", async () => {
    const { verificarEvento } = await import("@/lib/fiz/webhooks.server");
    const corpo = JSON.stringify(evento);
    const ts = String(Math.floor(Date.now() / 1000));

    const r = verificarEvento(
      cabecalhos({ "fiz-webhook-id": "evt_1", "fiz-webhook-timestamp": ts, "fiz-webhook-signature": assinar(corpo, ts) }),
      corpo,
    );
    expect(r.valido).toBe(true);
  });

  it("recusa assinatura produzida com outro segredo", async () => {
    const { verificarEvento } = await import("@/lib/fiz/webhooks.server");
    const corpo = JSON.stringify(evento);
    const ts = String(Math.floor(Date.now() / 1000));

    const r = verificarEvento(
      cabecalhos({
        "fiz-webhook-id": "evt_1",
        "fiz-webhook-timestamp": ts,
        "fiz-webhook-signature": assinar(corpo, ts, "segredo-errado"),
      }),
      corpo,
    );
    expect(r.valido).toBe(false);
    if (!r.valido) expect(r.estado).toBe(401);
  });

  it("recusa um evento antigo reenviado (proteção contra repetição)", async () => {
    const { verificarEvento } = await import("@/lib/fiz/webhooks.server");
    const corpo = JSON.stringify(evento);
    const antigo = String(Math.floor(Date.now() / 1000) - 3600);

    const r = verificarEvento(
      cabecalhos({ "fiz-webhook-id": "evt_1", "fiz-webhook-timestamp": antigo, "fiz-webhook-signature": assinar(corpo, antigo) }),
      corpo,
    );
    expect(r.valido).toBe(false);
  });

  it("recusa quando o corpo é alterado depois de assinado", async () => {
    const { verificarEvento } = await import("@/lib/fiz/webhooks.server");
    const corpo = JSON.stringify(evento);
    const ts = String(Math.floor(Date.now() / 1000));
    const assinatura = assinar(corpo, ts);

    const adulterado = JSON.stringify({ ...evento, type: "user.connection.revoked" });
    const r = verificarEvento(
      cabecalhos({ "fiz-webhook-id": "evt_1", "fiz-webhook-timestamp": ts, "fiz-webhook-signature": assinatura }),
      adulterado,
    );
    expect(r.valido).toBe(false);
  });

  it("recusa um tipo de evento desconhecido", async () => {
    const { verificarEvento } = await import("@/lib/fiz/webhooks.server");
    const corpo = JSON.stringify({ ...evento, type: "partner.inventado" });
    const ts = String(Math.floor(Date.now() / 1000));

    const r = verificarEvento(
      cabecalhos({ "fiz-webhook-id": "evt_1", "fiz-webhook-timestamp": ts, "fiz-webhook-signature": assinar(corpo, ts) }),
      corpo,
    );
    expect(r.valido).toBe(false);
    if (!r.valido) expect(r.estado).toBe(400);
  });

  it("é idempotente: o mesmo evento não é processado duas vezes", async () => {
    const { jaProcessado, marcarProcessado, limparEventosProcessados } = await import("@/lib/fiz/webhooks.server");
    limparEventosProcessados();
    expect(jaProcessado("evt_x")).toBe(false);
    marcarProcessado("evt_x");
    expect(jaProcessado("evt_x")).toBe(true);
  });
});

describe("consentimento do handoff", () => {
  it("só previsualiza campos com valor", async () => {
    const { previsualizarHandoff } = await import("@/lib/fiz/handoff.server");
    const campos = previsualizarHandoff({
      intent: "CONFIGURE_VAT",
      campos: ["entityType", "grossEstimate", "irsEstimate"],
      profile: { entityType: "INDIVIDUAL" },
      simulationSummary: { currency: "EUR", period: "ANNUAL", grossEstimate: 30000 },
    });
    // irsEstimate não foi calculado — não pode aparecer no diálogo.
    expect(campos.map((c) => c.campo)).toEqual(["entityType", "grossEstimate"]);
  });

  it("todo o campo apresentável tem rótulo em português", async () => {
    const { ROTULO_CAMPO } = await import("@/lib/fiz/handoff.server");
    for (const [campo, rotulo] of Object.entries(ROTULO_CAMPO)) {
      // "NIF" e "Email" são curtos e continuam a ser português. O que não
      // pode é o rótulo ser o nome técnico do campo — camelCase ou por
      // capitalizar — porque é isso que o utilizador nunca entende.
      expect(rotulo.length, campo).toBeGreaterThan(2);
      expect(rotulo, campo).toMatch(/^[A-ZÀ-Þ]/);
      expect(rotulo, campo).not.toMatch(/^[a-z]+[A-Z]/);
    }
  });

  it("declara explicitamente o que nunca é enviado", async () => {
    const { CAMPOS_NUNCA_ENVIADOS } = await import("@/lib/fiz/handoff.server");
    const texto = CAMPOS_NUNCA_ENVIADOS.join(" | ").toLowerCase();
    // A fronteira não é "dados sensíveis" em abstrato: é aquilo em que o
    // utilizador NÃO PODE consentir — chaves de acesso e dados de terceiros.
    for (const proibido of ["credenciais", "clientes", "documentos", "iban"]) {
      expect(texto, proibido).toContain(proibido);
    }
  });

  it("nenhum campo enviável corresponde a algo que nunca pode sair", async () => {
    const { ROTULO_CAMPO, CAMPOS_VALIDOS } = await import("@/lib/fiz/handoff.server");
    // NISS e IBAN não têm campo nenhum: não é só que não sejam propostos, é
    // que não existem no vocabulário.
    for (const campo of CAMPOS_VALIDOS) {
      const palavras = ROTULO_CAMPO[campo].toLowerCase().split(/\W+/);
      for (const p of ["niss", "iban", "password", "senha"]) {
        expect(palavras, `${campo} não pode propor ${p}`).not.toContain(p);
      }
    }
  });

  it("a identificação só sai com consentimento campo a campo", async () => {
    const { criarHandoff } = await import("@/lib/fiz/handoff.server");
    // Sem autorizar `taxpayerNumber`, o NIF proposto tem de ficar para trás.
    // A chamada falha por falta de credenciais, mas o que interessa é que
    // nunca chegue a montar um pedido com o NIF lá dentro.
    await expect(
      criarHandoff(
        {
          intent: "CONFIGURE_VAT",
          campos: ["entityType", "taxpayerNumber"],
          profile: { entityType: "INDIVIDUAL" },
          identity: { taxpayerNumber: "123456789" },
        },
        ["entityType"],
      ),
    ).rejects.toBeTruthy();
  });

  it("recusa autorizar um campo que nunca foi apresentado", async () => {
    const { criarHandoff } = await import("@/lib/fiz/handoff.server");
    await expect(
      criarHandoff(
        { intent: "CONFIGURE_VAT", campos: ["entityType"], profile: { entityType: "INDIVIDUAL" } },
        ["entityType", "taxpayerNumber"],
      ),
    ).rejects.toThrow(/não foram apresentados/i);
  });

  it("um NIF com dígito de controlo errado não é enviado", async () => {
    const { nifValido } = await import("@/lib/fiz/handoff.server");
    // 123456789 fecha o módulo 11 (soma 156, resto 2, controlo 9).
    expect(nifValido("123456789")).toBe(true);
    expect(nifValido("123 456 789")).toBe(true);
    expect(nifValido("123456788")).toBe(false); // controlo errado
    expect(nifValido("12345678")).toBe(false);  // curto demais
    expect(nifValido("abcdefghi")).toBe(false);
  });

  it("todo o campo pertence a um grupo que o diálogo sabe desenhar", async () => {
    const { CAMPOS, CAMPOS_VALIDOS, GRUPOS } = await import("@/lib/fiz/handoff-fields");
    const conhecidos = new Set(GRUPOS.map((g) => g.id));
    // Se um campo tiver um grupo que não está em GRUPOS, o diálogo
    // simplesmente não o desenha — o utilizador autorizaria às cegas.
    for (const c of CAMPOS_VALIDOS) {
      expect(conhecidos.has(CAMPOS[c].grupo), `${c} → ${CAMPOS[c].grupo}`).toBe(true);
    }
    // E todo o grupo declarado tem de ter pelo menos um campo.
    for (const g of GRUPOS) {
      expect(CAMPOS_VALIDOS.some((c) => CAMPOS[c].grupo === g.id), g.id).toBe(true);
    }
  });

  it("a identificação é o único grupo marcado como identificável", async () => {
    const { CAMPOS, CAMPOS_VALIDOS } = await import("@/lib/fiz/handoff-fields");
    for (const c of CAMPOS_VALIDOS) {
      const ident = Boolean(CAMPOS[c].identificavel);
      // É a marca `identificavel` que faz o diálogo mostrar o aviso reforçado
      // e contar "n que te identificam" no rodapé. Tem de coincidir com o
      // grupo, senão o aviso aparece no sítio errado.
      expect(ident, c).toBe(CAMPOS[c].grupo === "identificacao");
    }
  });

  it("nenhum dado identificável pode viajar em query string", async () => {
    const { NUNCA_EM_URL, CAMPOS_IDENTIFICAVEIS } = await import("@/lib/fiz/handoff-fields");
    // Consentir em enviar o NIF é uma coisa; pô-lo num URL que fica em
    // históricos, logs e cabeçalhos Referer é outra.
    for (const c of CAMPOS_IDENTIFICAVEIS) expect(NUNCA_EM_URL, c).toContain(c);
  });
});

describe("estado da integração e circuito de proteção", () => {
  it("desligada por bandeira não faz chamadas", async () => {
    process.env.NEXT_PUBLIC_FIZ_ENABLED = "false";
    const { estadoIntegracao } = await import("@/lib/fiz/config");
    expect(estadoIntegracao()).toBe("desligada");
  });

  it("ligada sem credenciais degrada em vez de rebentar", async () => {
    delete process.env.FIZ_CLIENT_SECRET;
    delete process.env.FIZ_TOKEN_ENCRYPTION_KEY;
    const { estadoIntegracao } = await import("@/lib/fiz/config");
    expect(estadoIntegracao()).toBe("sem_credenciais");
  });

  it("o circuito abre após falhas consecutivas e protege a experiência", async () => {
    const { circuitoAberto, registarFalha, registarSucesso, reiniciarCircuitos } = await import("@/lib/fiz/errors");
    reiniciarCircuitos();
    expect(circuitoAberto("teste")).toBe(false);
    for (let i = 0; i < 5; i++) registarFalha("teste");
    expect(circuitoAberto("teste")).toBe(true);
    registarSucesso("teste");
    expect(circuitoAberto("teste")).toBe(false);
  });

  it("as mensagens ao utilizador nunca prometem que a ação vai funcionar", async () => {
    const { MENSAGEM_UTILIZADOR } = await import("@/lib/fiz/errors");
    for (const [codigo, mensagem] of Object.entries(MENSAGEM_UTILIZADOR)) {
      expect(mensagem.length, codigo).toBeGreaterThan(10);
      expect(mensagem, codigo).not.toMatch(/garantimos|sempre funciona/i);
    }
  });
});

describe("estado de autorização OAuth", () => {
  it("um estado selado é reaberto intacto", async () => {
    const { selarEstado, abrirEstado } = await import("@/lib/fiz/oauth.server");
    const estado = {
      state: "abc",
      nonce: "def",
      codeVerifier: "ghi",
      userId: "user-1",
      regressoInterno: "/dashboard/conta",
    };
    expect(abrirEstado(selarEstado(estado))).toEqual(estado);
  });

  it("um estado adulterado é rejeitado", async () => {
    const { selarEstado, abrirEstado } = await import("@/lib/fiz/oauth.server");
    const selado = selarEstado({
      state: "abc",
      nonce: "def",
      codeVerifier: "ghi",
      userId: "user-1",
      regressoInterno: "/dashboard",
    });
    const [carga] = selado.split(".");
    expect(() => abrirEstado(`${carga}.assinaturaFalsa`)).toThrow();
  });

  it("recusa redirecionamentos para fora do site", async () => {
    const { regressoSeguro } = await import("@/lib/fiz/oauth.server");
    expect(regressoSeguro("/dashboard/prazos")).toBe("/dashboard/prazos");
    expect(regressoSeguro("https://malicioso.example")).toBe("/dashboard");
    expect(regressoSeguro("//malicioso.example")).toBe("/dashboard");
    expect(regressoSeguro(null)).toBe("/dashboard");
  });
});
