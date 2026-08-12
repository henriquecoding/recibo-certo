// A experiência da plataforma de contabilistas, fixada em código.
//
// Estas verificações existem porque as regras que fixam são invisíveis quando
// se partem: o ecrã continua a funcionar, continua bonito, e a única
// diferença é que uma pessoa termina um acompanhamento com um toque
// distraído, ou carrega num botão e não acontece nada visível.
//
//  · Nenhuma ação que não se desfaz acontece sem pergunta.
//  · Nenhuma ação fica sem resposta — e a resposta não é um `alert` do
//    browser, que ignora o design system e não se estiliza.
//  · Só existe um `aria-modal` de cada vez: a confirmação disputa a vaga
//    como os outros overlays, e perde apenas para o consentimento de cookies.
//  · O que é guardado sobre uma partilha é o que é mostrado — em especial a
//    nota que o cliente escreve, que já foi escrita para a base de dados e
//    nunca lida de volta.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const LAYOUT = ler("app", "layout.tsx");
const COORDENADOR = ler("components", "overlays", "CoordenadorOverlays.tsx");
const CONFIRMAR = ler("components", "ui", "Confirmar.tsx");
const AVISOS = ler("components", "ui", "Avisos.tsx");
const DADOS = ler("lib", "contabilistas", "dados.ts");

/** Os ecrãs da plataforma, do lado de quem gere e do lado de quem é cliente. */
const ECRAS = {
  agenda: ler("app", "contabilista", "agenda", "page.tsx"),
  clientes: ler("app", "contabilista", "clientes", "page.tsx"),
  fidelidade: ler("app", "contabilista", "fidelidade", "page.tsx"),
  hoje: ler("app", "contabilista", "page.tsx"),
  partilhas: ler("app", "contabilista", "partilhas", "page.tsx"),
  perfil: ler("app", "contabilista", "perfil", "page.tsx"),
  areaCliente: ler("app", "dashboard", "contabilista", "page.tsx"),
  perfilPublico: ler("app", "contabilistas", "[slug]", "PerfilPublico.tsx"),
  admin: ler("app", "admin", "contabilistas", "page.tsx"),
} as const;

/**
 * As escritas que fecham portas, e o ecrã onde vivem.
 *
 * `realizada` está aqui por uma razão que não é óbvia: carimba o cartão de
 * fidelidade, e um carimbo não se descarimba.
 */
const DESTRUTIVAS: [keyof typeof ECRAS, RegExp][] = [
  ["agenda", /cancelado_contabilista|nao_compareceu|"realizada"/],
  ["clientes", /decidirVinculo/],
  ["areaCliente", /terminarVinculo|revogarPartilha|cancelarConsulta/],
  ["fidelidade", /\/api\/contabilistas\/cupao/],
  ["admin", /decisao: "recusar"|decisao: "suspender"/],
];

describe("nada que não se desfaz acontece sem pergunta", () => {
  it.each(DESTRUTIVAS)("%s pede confirmação antes de escrever", (ecra, escrita) => {
    const fonte = ECRAS[ecra];
    expect(fonte, `${ecra} deixou de ter a escrita destrutiva que este teste vigia`).toMatch(escrita);
    expect(fonte, `${ecra} escreve sem confirmar`).toMatch(/useConfirmar/);
  });

  it("a confirmação começa com o foco em cancelar, não em confirmar", () => {
    // Um diálogo que abre com o foco no botão destrutivo transforma um
    // «Enter» distraído numa ação irreversível.
    expect(CONFIRMAR).toMatch(/cancelarRef\.current\?\.focus\(\)/);
  });

  it("uma confirmação que não pode abrir responde «não»", () => {
    // Sem isto, a promessa ficava por resolver e a ação destrutiva
    // suspensa para sempre — sem erro nenhum a dizer porquê.
    expect(CONFIRMAR).toMatch(/if \(ativo !== null && ativo !== "confirmacao"\) responder\(false\)/);
  });
});

/**
 * Os ecrãs onde a pessoa manda escrever alguma coisa.
 *
 * `partilhas` fica de fora, e é uma exclusão com razão: a única escrita que
 * faz é marcar como lida a partilha que a pessoa acabou de abrir. A resposta
 * a isso é o selo «Nova» a desaparecer, à frente dos olhos. Um aviso a dizer
 * «marcado como lido» seria ruído por uma coisa que ninguém pediu.
 */
const ECRAS_QUE_ESCREVEM = Object.entries(ECRAS).filter(([nome]) => nome !== "partilhas");

describe("toda a ação tem resposta, e a resposta é do produto", () => {
  it.each(ECRAS_QUE_ESCREVEM)("%s responde com avisos", (nome, fonte) => {
    expect(fonte, `${nome} não usa a camada de avisos`).toMatch(/useAvisos/);
  });

  it.each(Object.entries(ECRAS))("%s não usa diálogos do browser", (nome, fonte) => {
    // `window.confirm`/`alert` ignoram o design system, não têm modo escuro,
    // não são traduzíveis e bloqueiam a página inteira.
    expect(fonte, `${nome} usa um diálogo do browser`).not.toMatch(/window\.(confirm|alert|prompt)\s*\(/);
  });

  it("os avisos anunciam os erros a interromper, e o resto a esperar", () => {
    expect(AVISOS).toMatch(/aviso\.tom === "erro" \? "alert" : "status"/);
  });

  it("os avisos não desaparecem por baixo da navegação de telemóvel", () => {
    // Três superfícies têm barra fixa no fundo. Um aviso escondido atrás
    // dela é um aviso que não existe.
    expect(AVISOS).toMatch(/pb-\[calc\(4\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  });
});

describe("continua a existir um só `aria-modal` de cada vez", () => {
  it("a confirmação disputa a vaga como qualquer outro overlay", () => {
    expect(CONFIRMAR).toMatch(/useOverlay\("confirmacao"/);
    expect(COORDENADOR).toMatch(/confirmacao: 95/);
  });

  it("só o consentimento de cookies tem prioridade acima da confirmação", () => {
    const bloco = COORDENADOR.slice(
      COORDENADOR.indexOf("export const PRIORIDADE"),
      COORDENADOR.indexOf("export interface PedidoOverlay"),
    );
    const prioridades = [...bloco.matchAll(/(\w+):\s*(\d+)/g)].map(
      ([, nome, valor]) => [nome, Number(valor)] as const,
    );
    const confirmacao = prioridades.find(([n]) => n === "confirmacao")?.[1];
    expect(confirmacao).toBeTypeOf("number");

    const acima = prioridades.filter(([, v]) => v > (confirmacao as number)).map(([n]) => n);
    expect(acima).toEqual(["cookies"]);
  });

  it("os providers estão montados na raiz, dentro do coordenador", () => {
    const dentro = LAYOUT.slice(
      LAYOUT.indexOf("<CoordenadorOverlays>"),
      LAYOUT.indexOf("</CoordenadorOverlays>"),
    );
    expect(dentro).toMatch(/<AvisosProvider>/);
    expect(dentro).toMatch(/<ConfirmacaoProvider>/);
  });
});

describe("o que é guardado é o que é mostrado", () => {
  it("a nota que o cliente escreve é lida de volta", () => {
    // Foi escrita para a base de dados desde o início e nunca lida: o
    // contabilista recebia a simulação sem o recado que a explicava.
    expect(DADOS).toMatch(/nota_cliente: p\.nota/);
    expect(DADOS).toMatch(/nota: \(l\.nota_cliente as string \| null\) \?\? null/);
    expect(ECRAS.partilhas).toMatch(/p\.nota/);
    expect(ECRAS.areaCliente).toMatch(/p\.nota/);
  });

  it("o cupão diz que é gasto ao ser validado", () => {
    // A rota marca-o como usado no mesmo pedido em que o valida. Enquanto o
    // botão dizia só «Validar», a interface prometia uma verificação e fazia
    // uma escrita irreversível.
    expect(ECRAS.fidelidade).toMatch(/Validar e dar por usado/);
    expect(ECRAS.fidelidade).toMatch(/gasto/);
  });
});

describe("marcar consulta continua a não custar nada", () => {
  it("a marcação não sabe o que é um plano", () => {
    const MARCACAO = ler("components", "contabilistas", "Marcacao.tsx");
    for (const proibido of [/useSubscricao/, /entitlement/i, /\bPlus\b/, /ProGate/]) {
      expect(MARCACAO, "a marcação passou a olhar para o plano").not.toMatch(proibido);
    }
  });
});
