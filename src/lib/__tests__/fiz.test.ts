import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
      cabecalhos({
        "fiz-webhook-id": "evt_1",
        "fiz-webhook-timestamp": ts,
        "fiz-webhook-signature": assinar(corpo, ts),
      }),
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
      cabecalhos({
        "fiz-webhook-id": "evt_1",
        "fiz-webhook-timestamp": antigo,
        "fiz-webhook-signature": assinar(corpo, antigo),
      }),
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
      cabecalhos({
        "fiz-webhook-id": "evt_1",
        "fiz-webhook-timestamp": ts,
        "fiz-webhook-signature": assinar(corpo, ts),
      }),
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
    const { limparTokenParceiro } = await import("@/lib/fiz/client.server");
    // Sem autorizar `taxpayerNumber`, o NIF proposto tem de ficar para trás.
    // A API é simulada: este teste de fronteira nunca depende da rede e
    // inspeciona o pedido que sairia realmente do servidor.
    limparTokenParceiro();
    const fetchAnterior = globalThis.fetch;
    const fetchSimulado = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-de-teste", expires_in: 300 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "h_1", url: "https://app.fiz.co/handoffs/h_1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    globalThis.fetch = fetchSimulado as typeof fetch;

    try {
      await criarHandoff(
        {
          intent: "CONFIGURE_VAT",
          campos: ["entityType", "taxpayerNumber"],
          profile: { entityType: "INDIVIDUAL" },
          identity: { taxpayerNumber: "123456789" },
        },
        ["entityType"],
      );
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
      const pedido = JSON.parse(String(fetchSimulado.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
      expect(pedido.profile).toEqual({ entityType: "INDIVIDUAL" });
      expect(pedido).not.toHaveProperty("identity");
      expect(JSON.stringify(pedido)).not.toContain("123456789");
    } finally {
      globalThis.fetch = fetchAnterior;
      limparTokenParceiro();
    }
  });

  it("recusa autorizar um campo que nunca foi apresentado", async () => {
    const { criarHandoff } = await import("@/lib/fiz/handoff.server");
    await expect(
      criarHandoff({ intent: "CONFIGURE_VAT", campos: ["entityType"], profile: { entityType: "INDIVIDUAL" } }, [
        "entityType",
        "taxpayerNumber",
      ]),
    ).rejects.toThrow(/não foram apresentados/i);
  });

  it("um NIF com dígito de controlo errado não é enviado", async () => {
    const { nifValido } = await import("@/lib/fiz/handoff.server");
    // 123456789 fecha o módulo 11 (soma 156, resto 2, controlo 9).
    expect(nifValido("123456789")).toBe(true);
    expect(nifValido("123 456 789")).toBe(true);
    expect(nifValido("123456788")).toBe(false); // controlo errado
    expect(nifValido("12345678")).toBe(false); // curto demais
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
      expect(
        CAMPOS_VALIDOS.some((c) => CAMPOS[c].grupo === g.id),
        g.id,
      ).toBe(true);
    }
  });

  it("todo o grupo declara se abre por omissão, e a identificação não abre", async () => {
    const { GRUPOS } = await import("@/lib/fiz/handoff-fields");
    for (const g of GRUPOS) {
      expect(typeof g.abertoPorOmissao, g.id).toBe("boolean");
      expect(g.resumo.length, g.id).toBeGreaterThan(10);
    }
    // O atrito tem de ser proporcional à sensibilidade: abrir a secção da
    // identificação é um gesto próprio, não o estado de chegada.
    expect(GRUPOS.find((g) => g.id === "identificacao")?.abertoPorOmissao).toBe(false);
    // E o essencial tem de estar à vista, senão volta a haver um beco.
    expect(GRUPOS.find((g) => g.id === "enquadramento")?.abertoPorOmissao).toBe(true);
  });

  it("o conjunto recomendado nunca arrasta um campo que te identifica", async () => {
    const { CAMPOS, CAMPOS_VALIDOS, CAMPOS_IDENTIFICAVEIS } = await import("@/lib/fiz/handoff-fields");
    // O diálogo constrói a recomendação como "tudo o que não é do grupo
    // identificacao". Esta é a invariante de que essa regra depende: se um
    // campo identificável alguma vez mudasse de grupo, o botão de atalho
    // passaria a marcar o NIF sem o utilizador reparar.
    const recomendados = CAMPOS_VALIDOS.filter((c) => CAMPOS[c].grupo !== "identificacao");
    for (const c of recomendados) {
      expect(CAMPOS_IDENTIFICAVEIS, `${c} entrou na recomendação`).not.toContain(c);
    }
    expect(recomendados.length).toBeGreaterThan(0);
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

describe("bandeira e pré-visualização", () => {
  it("fora da Vercel, NODE_ENV=production continua a ser produção", async () => {
    // `NEXT_PUBLIC_VERCEL_ENV` só existe na Vercel. Num servidor próprio vinha
    // vazia e a pré-visualização — catálogo simulado — ficava permitida em
    // produção real.
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    const anterior = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
      const { ehProducao, previewPermitidoNoCliente } = await import("@/lib/fiz/flag");
      expect(ehProducao()).toBe(true);
      expect(previewPermitidoNoCliente()).toBe(false);
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", { value: anterior, configurable: true });
    }
  });

  it("num deploy de ramo da Vercel a pré-visualização continua a funcionar", async () => {
    // Numa build de ramo o NODE_ENV também é "production" — se as duas
    // condições fossem somadas, desligava-se exatamente onde faz falta.
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    const anterior = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
      const { ehProducao, previewPermitidoNoCliente, fizAtiva } = await import("@/lib/fiz/flag");
      expect(ehProducao()).toBe(false);
      expect(previewPermitidoNoCliente()).toBe(true);
      // ⚠️ RC-FIZ-002: a bandeira deixou de se ligar sozinha. Num deploy de
      // ramo continua a ser possível pré-visualizar — mas é preciso DIZER que
      // se quer, o que é o ponto: um ambiente sem configuração não nasce com
      // a integração ligada.
      delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
      expect(fizAtiva()).toBe(false);
      process.env.NEXT_PUBLIC_FIZ_ENABLED = "true";
      expect(fizAtiva()).toBe(true);
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", { value: anterior, configurable: true });
    }
  });

  it("em produção nada liga por omissão, e a pré-visualização nunca", async () => {
    // ⚠️ A EXPECTATIVA MUDOU — RC-FIZ-002.
    //
    // Este teste afirmava que em produção a parceria ligava por omissão. A
    // razão está escrita acima e era boa: a regra anterior fazia deploys
    // aparecerem vazios, porque `NEXT_PUBLIC_FIZ_ENABLED` é inlined no build e
    // ninguém a definia.
    //
    // Mas o remédio deixava qualquer ambiente sem configuração a nascer com a
    // integração LIGADA. A resposta certa à falha silenciosa é outra: falhar
    // fechado e tornar a má configuração ruidosa — `diagnosticoFiz()` enumera
    // o que falta, capacidade a capacidade, em vez de deixar adivinhar.
    //
    // O que NÃO muda, e é o que a regra sempre protegeu de facto: o catálogo
    // SIMULADO nunca chega a utilizadores reais.
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
    delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
    const { fizAtiva, previewPermitidoNoCliente } = await import("@/lib/fiz/flag");
    expect(fizAtiva()).toBe(false);
    expect(previewPermitidoNoCliente()).toBe(false);

    // E com o interruptor ligado, liga — sem nunca abrir a pré-visualização.
    process.env.NEXT_PUBLIC_FIZ_ENABLED = "true";
    expect(fizAtiva()).toBe(true);
    expect(previewPermitidoNoCliente()).toBe(false);
  });

  it("continua a haver um interruptor explícito para desligar", async () => {
    process.env.NEXT_PUBLIC_FIZ_ENABLED = "false";
    const { fizAtiva } = await import("@/lib/fiz/flag");
    expect(fizAtiva()).toBe(false);
    delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
  });
});

describe("destinos devolvidos pela FIZ", () => {
  it("recusa qualquer domínio que não seja da FIZ", async () => {
    const { destinoFizValido } = await import("@/lib/fiz/contracts");
    for (const mau of [
      "https://fiz.co.malicioso.example/x",
      "https://malicioso.example/fiz.co",
      "https://notfiz.co/x",
      "http://app.fiz.co/x",
      "javascript:alert(1)",
      "//app.fiz.co/x",
    ]) {
      expect(destinoFizValido(mau), mau).toBe(false);
    }
    for (const bom of ["https://app.fiz.co/onboarding", "https://fiz.co/x", "https://sub.app.fiz.co/y"]) {
      expect(destinoFizValido(bom), bom).toBe(true);
    }
  });

  it("dados pessoais também não podem ir no fragmento", async () => {
    const { urlSemDadosSensiveis } = await import("@/lib/fiz/contracts");
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?ref=abc")).toBe(true);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?nif=123456789")).toBe(false);
    // O fragmento nunca chega ao servidor — mas fica no histórico e é legível
    // por qualquer script da página.
    expect(urlSemDadosSensiveis("https://app.fiz.co/x#nif=123456789")).toBe(false);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x#email=a@b.pt")).toBe(false);
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
    // `emitidoEm` é acrescentado ao selar — é o prazo, e vive dentro da carga
    // assinada para não poder ser alterado.
    expect(abrirEstado(selarEstado(estado))).toMatchObject(estado);
  });

  it("um estado antigo é recusado mesmo com assinatura válida", async () => {
    const { selarEstado, abrirEstado, DURACAO_COOKIE_SEGUNDOS } = await import("@/lib/fiz/oauth.server");
    const selado = selarEstado({
      state: "abc",
      nonce: "def",
      codeVerifier: "ghi",
      userId: "user-1",
      regressoInterno: "/dashboard",
    });

    // O Max-Age do cookie é uma instrução ao browser, não uma verificação
    // nossa: quem guarde o valor pode reapresentá-lo mais tarde. O prazo tem
    // de ser imposto aqui.
    const agora = Date.now;
    Date.now = () => agora() + (DURACAO_COOKIE_SEGUNDOS + 60) * 1000;
    try {
      expect(() => abrirEstado(selado)).toThrow(/expirou/i);
    } finally {
      Date.now = agora;
    }
  });

  it("um estado sem prazo — de uma versão anterior — é recusado", async () => {
    const { abrirEstado } = await import("@/lib/fiz/oauth.server");
    const { createHmac } = await import("node:crypto");
    const carga = Buffer.from(
      JSON.stringify({ state: "a", nonce: "b", codeVerifier: "c", userId: "u", regressoInterno: "/" }),
      "utf8",
    ).toString("base64url");
    const assinatura = createHmac("sha256", process.env.FIZ_CLIENT_SECRET as string)
      .update(carga)
      .digest("base64url");
    expect(() => abrirEstado(`${carga}.${assinatura}`)).toThrow(/expirou/i);
  });

  it("o destino é revalidado à saída, não só à entrada", async () => {
    const { selarEstado, abrirEstado } = await import("@/lib/fiz/oauth.server");
    // Estado assinado por nós mas com um destino externo — cenário de uma
    // versão anterior do filtro, ou de um erro futuro na criação.
    const selado = selarEstado({
      state: "abc",
      nonce: "def",
      codeVerifier: "ghi",
      userId: "user-1",
      regressoInterno: "https://malicioso.example",
    });
    expect(abrirEstado(selado).regressoInterno).toBe("/dashboard");
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
    expect(regressoSeguro("/dashboard/prazos?a=1#b")).toBe("/dashboard/prazos?a=1#b");
    expect(regressoSeguro("https://malicioso.example")).toBe("/dashboard");
    expect(regressoSeguro("//malicioso.example")).toBe("/dashboard");
    expect(regressoSeguro(null)).toBe("/dashboard");
  });

  it("a barra invertida não é uma forma de sair do site", async () => {
    const { regressoSeguro } = await import("@/lib/fiz/oauth.server");
    // O WHATWG URL normaliza `\` para `/` em esquemas especiais: `/\evil.com`
    // resolvia para `https://evil.com/` e passava num teste de `startsWith`.
    for (const tentativa of [
      "/\\malicioso.example",
      "/\\/malicioso.example",
      "/\\\\malicioso.example",
      "\\\\malicioso.example",
    ]) {
      const seguro = regressoSeguro(tentativa);
      expect(seguro, tentativa).toBe("/dashboard");
    }
  });

  it("todo o destino aceite resolve dentro do nosso site", async () => {
    const { regressoSeguro } = await import("@/lib/fiz/oauth.server");
    const NOSSA = "https://www.recibocerto.pt";
    const tentativas = [
      "/dashboard",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "https://evil.com",
      "/..//evil.com",
      "/dashboard?next=https://evil.com",
      "javascript:alert(1)",
      "/dashboard\u0009/evil",
      "  /dashboard",
      "/",
    ];
    for (const t of tentativas) {
      const destino = new URL(regressoSeguro(t), NOSSA);
      expect(destino.origin, `${t} escapou`).toBe(NOSSA);
    }
  });
});
