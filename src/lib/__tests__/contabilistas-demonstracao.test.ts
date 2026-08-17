// ═══════════════════════════════════════════════════════════════════════
//  O PAINEL SIMULADO É O PAINEL A SÉRIO
//  ---------------------------------------------------------------------
//  A demonstração serve para uma coisa: validar o painel de gestão dos
//  contabilistas sem abrir a conta de nenhum. Isso só é verdade enquanto o
//  que a administração vê for o MESMO código — e é exatamente essa a parte
//  que se perde sozinha, em silêncio, à segunda alteração.
//
//  Por isso este ficheiro vigia duas coisas diferentes:
//
//   1. ESTRUTURA — as rotas de `/admin/contabilista` são reexportações das
//      páginas reais, e nenhuma página do painel voltou a falar diretamente
//      com a camada de acesso a dados. Se alguém escrever um ecrã só para a
//      administração, ou reintroduzir um `import ... from "../dados"` numa
//      página, isto falha aqui em vez de falhar meses depois, quando a
//      demonstração já estiver a mentir.
//
//   2. LÓGICA — a loja de demonstração aplica as mesmas precondições das
//      RPC (migrações 042 e 047): confirmar exige «por confirmar», concluir
//      exige que já tenha começado, o carimbo passa por `aplicarCarimbo`,
//      e um cupão validado fica gasto.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  BASE_DEMONSTRACAO, BASE_PAINEL, basePainel, eDemonstracao, hrefNoPainel,
  modoCorrente, modoDoCaminho,
} from "../contabilistas/demonstracao/rotas";
import { semear } from "../contabilistas/demonstracao/semente";
import * as loja from "../contabilistas/demonstracao/loja";

const SRC = join(process.cwd(), "src");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

// ─── 1. As duas moradas ────────────────────────────────────────────────

describe("as duas moradas do painel", () => {
  it.each([
    ["/contabilista", false],
    ["/contabilista/agenda", false],
    ["/contabilistas", false],
    ["/admin", false],
    // A lista de candidaturas da administração NÃO é o painel simulado.
    // Confundi-las punha a administração a gerir contabilistas reais num
    // ecrã que diz «dados inventados».
    ["/admin/contabilistas", false],
    ["/admin/contabilistas/algo", false],
    ["/admin/contabilista", true],
    ["/admin/contabilista/casos", true],
  ])("%s é demonstração? %s", (caminho, esperado) => {
    expect(eDemonstracao(caminho)).toBe(esperado);
    expect(modoDoCaminho(caminho)).toBe(esperado ? "demonstracao" : "real");
    expect(basePainel(caminho)).toBe(esperado ? BASE_DEMONSTRACAO : BASE_PAINEL);
  });

  it("sem caminho nenhum, o modo é o real", () => {
    expect(eDemonstracao(null)).toBe(false);
    expect(eDemonstracao(undefined)).toBe(false);
    expect(eDemonstracao("")).toBe(false);
    // Fora do browser não há endereço: nenhum render no servidor pode
    // servir dados inventados por omissão.
    expect(modoCorrente()).toBe("real");
  });

  it("as ligações do painel seguem a base onde ele está aberto", () => {
    expect(hrefNoPainel("/contabilista", BASE_DEMONSTRACAO)).toBe("/admin/contabilista");
    expect(hrefNoPainel("/contabilista/agenda", BASE_DEMONSTRACAO)).toBe("/admin/contabilista/agenda");
    expect(hrefNoPainel("/contabilista/clientes/abc", BASE_DEMONSTRACAO)).toBe("/admin/contabilista/clientes/abc");
  });

  it("o que não é do painel nunca é reescrito", () => {
    // O diretório público, a área do cliente e a administração vivem fora
    // do painel. Reescrevê-los levava a demonstração para endereços que
    // não existem.
    for (const fora of ["/contabilistas", "/contabilistas/marta-nogueira", "/dashboard", "/admin"]) {
      expect(hrefNoPainel(fora, BASE_DEMONSTRACAO)).toBe(fora);
    }
  });

  it("no painel real nada é reescrito", () => {
    expect(hrefNoPainel("/contabilista/agenda", BASE_PAINEL)).toBe("/contabilista/agenda");
  });
});

// ─── 2. Uma só implementação ───────────────────────────────────────────

const ROTAS_DEMO = join(SRC, "app", "admin", "contabilista");

function ficheirosEm(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...ficheirosEm(caminho));
    else if (/\.tsx?$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

describe("a demonstração não tem interface própria", () => {
  const rotas = ficheirosEm(ROTAS_DEMO);

  it("existem rotas de demonstração para verificar", () => {
    expect(rotas.length).toBeGreaterThanOrEqual(10);
  });

  it.each(rotas.map((f) => [f.replace(SRC, "src")] as const))(
    "%s é uma reexportação do painel real",
    (relativo) => {
      const fonte = readFileSync(join(SRC, relativo.replace(/^src/, "")), "utf8");
      expect(fonte).toMatch(/export \{ default \} from "@\/app\/contabilista/);
      // Nenhum JSX próprio: se alguém começar a desenhar aqui, a
      // demonstração deixa de dizer a verdade sobre o painel real.
      expect(fonte).not.toMatch(/<[A-Za-z]/);
    },
  );

  it("cada ecrã do painel real tem morada na demonstração", () => {
    const reais = ficheirosEm(join(SRC, "app", "contabilista"))
      .filter((f) => /page\.tsx$/.test(f))
      .map((f) => f.replace(join(SRC, "app", "contabilista"), ""));
    const simulados = rotas
      .filter((f) => /page\.tsx$/.test(f))
      .map((f) => f.replace(ROTAS_DEMO, ""));
    expect(simulados.sort()).toEqual(reais.sort());
  });
});

/**
 * Tudo o que o painel alcança, seguindo os imports a partir dos seus ecrãs.
 *
 * A lista não é escrita à mão de propósito: um componente novo entra nela
 * sozinho, e é exatamente aí que a regra costuma escapar — alguém acrescenta
 * uma peça ao painel, importa `dados.ts` porque é o que se importava antes, e
 * a demonstração fica com um ecrã morto que ninguém nota.
 *
 * A pasta `fonte/` é o fim da linha: é ela que pode — e tem de — importar os
 * módulos reais.
 */
function alcancadoPeloPainel(): string[] {
  const entradas = ficheirosEm(join(SRC, "app", "contabilista"));
  const vistos = new Set<string>();
  const fila = [...entradas];

  const resolver = (especificador: string, deQue: string): string | null => {
    let bruto: string;
    if (especificador.startsWith("@/")) bruto = join(SRC, especificador.slice(2));
    else if (especificador.startsWith(".")) bruto = join(deQue, "..", especificador);
    else return null;

    for (const tentativa of [
      `${bruto}.ts`, `${bruto}.tsx`,
      join(bruto, "index.ts"), join(bruto, "index.tsx"),
    ]) {
      try {
        if (statSync(tentativa).isFile()) return tentativa;
      } catch { /* a seguinte */ }
    }
    return null;
  };

  while (fila.length > 0) {
    const ficheiro = fila.pop()!;
    if (vistos.has(ficheiro)) continue;
    vistos.add(ficheiro);

    // A fonte é a fronteira: alcança-se, mas não se atravessa.
    if (ficheiro.includes(join("contabilistas", "fonte"))) continue;

    const fonte = readFileSync(ficheiro, "utf8");
    for (const m of fonte.matchAll(/from\s+"([^"]+)"|import\("([^"]+)"\)/g)) {
      const alvo = resolver(m[1] ?? m[2], ficheiro);
      if (alvo && !vistos.has(alvo)) fila.push(alvo);
    }
  }

  return [...vistos].filter((f) => !f.includes(join("contabilistas", "fonte")));
}

describe("o painel fala pela fonte, não pela base de dados", () => {
  const alcancados = alcancadoPeloPainel();

  // Os módulos que falam com o Supabase. Os puros — `agenda`, `resumo`,
  // `vinculo`, `fidelidade`, `tipos`, `catalogo` — ficam de fora: não têm
  // dois modos porque não tocam em dados.
  const COM_BASE_DE_DADOS = [
    "@/lib/contabilistas/dados",
    "@/lib/contabilistas/casos",
    "@/lib/contabilistas/conversa",
    "@/lib/contabilistas/trabalho",
    "@/lib/contabilistas/linkedin",
    "@/lib/supabase/client",
  ];

  it("o painel alcança mais do que as próprias páginas", () => {
    expect(alcancados.length).toBeGreaterThan(20);
  });

  it.each(alcancados.map((f) => [f.replace(SRC + "/", "")] as const))(
    "%s não importa a camada de acesso a dados diretamente",
    (relativo) => {
      const fonte = readFileSync(join(SRC, relativo), "utf8");
      for (const proibido of COM_BASE_DE_DADOS) {
        expect(
          fonte.includes(`"${proibido}"`),
          `${relativo} importa ${proibido} — usa @/lib/contabilistas/fonte/… para o painel funcionar nos dois modos`,
        ).toBe(false);
      }
    },
  );
});

// ─── 3. As mesmas regras ───────────────────────────────────────────────

describe("a loja de demonstração aplica as regras do servidor", () => {
  beforeEach(() => { loja.reporDemonstracao(); });

  it("o consultório inventado tem trabalho por fazer", async () => {
    // Uma demonstração onde está tudo respondido não mostra o painel: o
    // painel existe para mostrar o que falta.
    const c = await loja.contagensDoPainel();
    expect(c.pedidos).toBeGreaterThan(0);
    expect(c.partilhasPorLer).toBeGreaterThan(0);
    expect(c.consultasPorConfirmar).toBeGreaterThan(0);
  });

  it("a ficha simulada está aprovada — senão o painel nem abre", async () => {
    const ficha = await loja.obterMinhaFicha();
    expect(ficha.estado).toBe("aprovado");
    expect(ficha.nome).toContain("demonstração");
  });

  it("confirmar exige que a consulta esteja por confirmar", async () => {
    const [porConfirmar] = (await loja.listarAgendamentos()).filter((a) => a.estado === "pedido");
    expect(porConfirmar).toBeDefined();

    expect(await loja.decidirConsulta(porConfirmar.id, "confirmado")).toEqual({ fidelidade: null });

    // A segunda vez encontra-a já confirmada, e recusa com a frase da RPC.
    const segunda = await loja.decidirConsulta(porConfirmar.id, "confirmado");
    expect(segunda.erro).toBe("Esta consulta já não estava por confirmar.");
  });

  it("não se conclui uma consulta que ainda não começou", async () => {
    const futura = (await loja.listarAgendamentos()).find(
      (a) => (a.estado === "pedido" || a.estado === "confirmado") && Date.parse(a.inicio) > Date.now(),
    );
    expect(futura).toBeDefined();
    const r = await loja.decidirConsulta(futura!.id, "realizada", undefined, { precoCents: 6500 });
    expect(r.erro).toBe("Só se conclui uma consulta que já começou e ainda está aberta.");
  });

  it("uma consulta realizada carimba o cartão; uma falta não", async () => {
    // Uma consulta já começada, com cartão a meio.
    const estado = loja.semearPara(new Date());
    const cliente = estado.cartoes[0].clienteId;
    const antes = estado.cartoes[0].carimbos;
    estado.agendamentos.push({
      id: "teste-carimbo",
      contabilistaId: estado.ficha.userId,
      clienteId: cliente,
      inicio: new Date(Date.now() - 3600_000).toISOString(),
      fim: new Date(Date.now() - 1800_000).toISOString(),
      estado: "confirmado",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null, localLat: null, localLng: null,
      criadoEm: new Date().toISOString(),
    });

    const r = await loja.decidirConsulta("teste-carimbo", "realizada", undefined, { precoCents: 6500 });
    expect(r.erro).toBeUndefined();
    expect(r.fidelidade?.carimbos).toBe(antes + 1);
  });

  it("completar o cartão emite um cupão e abre outro", async () => {
    const estado = loja.semearPara(new Date());
    const cartao = estado.cartoes[0];
    cartao.carimbos = cartao.meta - 1;
    const cupoesAntes = estado.cupoes.length;

    estado.agendamentos.push({
      id: "teste-completa",
      contabilistaId: estado.ficha.userId,
      clienteId: cartao.clienteId,
      inicio: new Date(Date.now() - 3600_000).toISOString(),
      fim: new Date(Date.now() - 1800_000).toISOString(),
      estado: "confirmado",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null, localLat: null, localLng: null,
      criadoEm: new Date().toISOString(),
    });

    const r = await loja.decidirConsulta("teste-completa", "realizada", undefined, { precoCents: 6500 });
    expect(r.fidelidade?.completou).toBe(true);
    // A percentagem é a CONGELADA no cartão, não a da ficha de agora.
    expect(r.fidelidade?.percentagem).toBe(cartao.descontoPct);
    expect((await loja.meusCupoes()).length).toBe(cupoesAntes + 1);
    expect((await loja.cartoesAbertos(cartao.clienteId)).length).toBe(1);
  });

  it("concluir com presença sem preço é recusado, como a RPC recusa", async () => {
    // Fidelidade V2: `concluir_consulta` devolve `preco_obrigatorio` sem
    // preço, porque o desconto incide sobre o valor REAL da consulta e não
    // sobre o preço global do perfil (§14.1). A demonstração bate contra a
    // mesma parede — se aceitasse, mentia sobre o painel real.
    const estado = loja.semearPara(new Date());
    const injetar = (id: string) => estado.agendamentos.push({
      id,
      contabilistaId: estado.ficha.userId,
      clienteId: estado.cartoes[0]!.clienteId,
      inicio: new Date(Date.now() - 3600_000).toISOString(),
      fim: new Date(Date.now() - 1800_000).toISOString(),
      estado: "confirmado",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null, localLat: null, localLng: null,
      criadoEm: new Date().toISOString(),
    });

    injetar("teste-sem-preco");
    const semPreco = await loja.decidirConsulta("teste-sem-preco", "realizada");
    expect(semPreco.erro).toMatch(/valor real/i);
    // E a consulta continua aberta: uma recusa não pode fechar nada.
    expect((await loja.listarAgendamentos()).find((a) => a.id === "teste-sem-preco")?.estado)
      .toBe("confirmado");

    // Uma falta continua a fechar sem preço: não há nada a cobrar.
    injetar("teste-falta-sem-preco");
    const falta = await loja.decidirConsulta("teste-falta-sem-preco", "nao_compareceu");
    expect(falta.erro).toBeUndefined();
  });

  it("com o cartão desligado, uma consulta realizada não carimba", async () => {
    const estado = loja.semearPara(new Date());
    estado.ficha.fidelidadeAtiva = false;
    estado.agendamentos.push({
      id: "teste-sem-cartao",
      contabilistaId: estado.ficha.userId,
      clienteId: estado.vinculos[0].clienteId,
      inicio: new Date(Date.now() - 3600_000).toISOString(),
      fim: new Date(Date.now() - 1800_000).toISOString(),
      estado: "confirmado",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null, localLat: null, localLng: null,
      criadoEm: new Date().toISOString(),
    });

    const r = await loja.decidirConsulta("teste-sem-cartao", "realizada", undefined, { precoCents: 6500 });
    expect(r.fidelidade?.ok).toBe(false);
    expect(r.fidelidade?.motivo).toBe("fidelidade_inativa");
  });

  it("as transições do vínculo têm precondição de estado", async () => {
    const pendente = (await loja.meusClientes()).find((v) => v.estado === "pendente");
    expect(pendente).toBeDefined();

    expect(await loja.decidirVinculo(pendente!.id, "reativar")).toEqual({
      erro: "Este acompanhamento já não estava nesse estado.",
    });
    expect(await loja.decidirVinculo(pendente!.id, "aceitar")).toEqual({});
    expect(await loja.decidirVinculo(pendente!.id, "aceitar")).toEqual({
      erro: "Este acompanhamento já não estava nesse estado.",
    });
  });

  it("terminar apaga o nome e o email, como na migração 043", async () => {
    const ativo = (await loja.meusClientes()).find((v) => v.estado === "ativo");
    expect(ativo?.nomeCliente).toBeTruthy();

    await loja.decidirVinculo(ativo!.id, "terminar");

    const depois = (await loja.meusClientes()).find((v) => v.id === ativo!.id);
    expect(depois?.estado).toBe("terminado");
    expect(depois?.nomeCliente).toBeNull();
  });

  it("validar um cupão gasta-o, e não há como o espreitar sem o gastar", async () => {
    const disponivel = (await loja.meusCupoes()).find((c) => c.estado === "disponivel");
    expect(disponivel).toBeDefined();

    const r = await loja.usarCupao(disponivel!.codigo.toLowerCase().replace(/-/g, " "));
    expect(r.erro).toBeUndefined();
    expect(r.percentagem).toBe(disponivel!.percentagem);
    expect(r.finalCents).toBeLessThan(r.baseCents!);

    expect((await loja.usarCupao(disponivel!.codigo)).erro).toBe("Este cupão já foi usado.");
  });

  it("uma mensagem do contabilista num caso nasce por rever", async () => {
    const [caso] = await loja.listarCasos();
    await loja.submeterMensagem(caso.id, "eu", "contabilista", "Pode enviar-me o documento?");
    const mensagens = await loja.listarMensagensDoCaso(caso.id);
    const minha = mensagens[mensagens.length - 1];
    expect(minha.estado).toBe("submetida");
    expect(minha.corpoEncaminhado).toBeNull();
  });

  it("uma proposta sem valor não segue", async () => {
    const [caso] = await loja.listarCasos();
    const r = await loja.enviarProposta({
      casoId: caso.id, contabilistaId: "eu", corpo: "Faço isto e aquilo.",
      valorCents: 0, ivaIncluido: false,
    });
    expect(r.erro).toBe("Diz que valor propões.");
  });

  it("os ficheiros são recusados com a razão à frente, não fingidos", async () => {
    expect((await loja.envioRecusado()).erro).toContain("não guarda ficheiros");
    expect(await loja.semFicheiro()).toBeNull();
  });

  it("ler não altera a loja", async () => {
    const antes = (await loja.meusClientes())[0];
    antes.nomeCliente = "Alterado por fora";
    const depois = (await loja.meusClientes())[0];
    expect(depois.nomeCliente).not.toBe("Alterado por fora");
  });
});

describe("a semente acompanha o calendário de quem a abre", () => {
  it("a próxima consulta é sempre no futuro, seja qual for o dia", () => {
    for (const quando of ["2026-01-15T09:00:00Z", "2027-08-30T18:30:00Z"]) {
      const estado = semear(new Date(quando));
      const base = Date.parse(quando);
      const futuras = estado.agendamentos.filter(
        (a) => (a.estado === "pedido" || a.estado === "confirmado") && Date.parse(a.inicio) >= base - 12 * 3600_000,
      );
      expect(futuras.length, `sem consultas futuras em ${quando}`).toBeGreaterThan(0);
    }
  });

  it("há sempre uma tarefa fora do prazo e uma por entregar", () => {
    const estado = semear(new Date("2026-05-04T10:00:00Z"));
    const hoje = "2026-05-04";
    expect(estado.tarefas.some((t) => t.estado !== "entregue" && t.prazo !== null && t.prazo < hoje)).toBe(true);
    expect(estado.tarefas.some((t) => t.estado === "entregue")).toBe(true);
  });
});

// ─── 4. A moldura ──────────────────────────────────────────────────────

describe("a moldura diz onde a pessoa está", () => {
  const LAYOUT_PAINEL = ler("app", "contabilista", "layout.tsx");
  const LAYOUT_ADMIN = ler("app", "admin", "layout.tsx");

  it("a demonstração é anunciada em todos os ecrãs do painel", () => {
    // No layout, e não em cada página: quem entra por ligação direta no
    // separador dos casos não passou por nenhum aviso de entrada.
    expect(LAYOUT_PAINEL).toContain("FaixaDemonstracao");
    expect(LAYOUT_PAINEL).toMatch(/painel\.demonstracao && <FaixaDemonstracao \/>/);
    expect(LAYOUT_PAINEL).toContain("os dados são inventados");
  });

  it("a administração não põe a sua moldura à volta do painel simulado", () => {
    // Duas barras no topo e duas navegações fixas no fundo do telemóvel.
    expect(LAYOUT_ADMIN).toContain("eDemonstracao(pathname)");
  });

  it("o painel simulado leva de volta à administração, não à conta pessoal", () => {
    expect(LAYOUT_PAINEL).toContain('painel.demonstracao ? "/admin" : "/dashboard"');
  });
});
