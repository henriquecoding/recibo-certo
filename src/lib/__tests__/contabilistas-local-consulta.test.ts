// ═══════════════════════════════════════════════════════════════════════
//  ONDE É A CONSULTA — a gramática do canal
//  ---------------------------------------------------------------------
//  O campo `local_ou_ligacao` era texto solto e passou a ter regras. Estes
//  testes fixam essas regras, e cada um deles corresponde a uma maneira
//  concreta de o cliente ficar sem saber onde é:
//
//   · um link com uma gralha que o cliente clica e não abre;
//   · um `javascript:` colado por engano (ou não) num campo que o cliente
//     vai clicar;
//   · uma morada sem ponto, que mandava o cliente pesquisar às cegas;
//   · meia coordenada, que aponta para o meio do Atlântico.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  MAX_LOCAL, PREFIXO_TEL,
  dentroDePortugal, ehTelefone, examinarLigacao, examinarTelefone,
  formatarCoordenadas, formatarTelefone, lerLocal, ligacoesDeMapa, moradaCurta,
  nomeDoCanal, plataformaDoLink, pontoValido,
} from "../contabilistas/local-consulta";
import { resumirAgenda } from "@/components/contabilistas/ResumoDaAgenda";
import { distribuir } from "@/components/contabilistas/GrelhaSemanal";
import type { Agendamento } from "../contabilistas/tipos";

// ─── Ligações ──────────────────────────────────────────────────────────

describe("local-consulta: a ligação da chamada", () => {
  it("reconhece as plataformas do catálogo, com e sem subdomínio", () => {
    expect(plataformaDoLink("https://meet.google.com/abc-defg-hij")?.nome).toBe("Google Meet");
    expect(plataformaDoLink("https://empresa.zoom.us/j/123456")?.nome).toBe("Zoom");
    expect(plataformaDoLink("https://teams.microsoft.com/l/meetup-join/x")?.nome).toBe("Microsoft Teams");
    expect(plataformaDoLink("https://www.whereby.com/marta")?.nome).toBe("Whereby");
  });

  it("não inventa uma plataforma quando não a conhece", () => {
    expect(plataformaDoLink("https://sala.exemplo.pt/marta")).toBeNull();
    // Um domínio que só CONTÉM o nome não é a plataforma: `zoom.us.mau.pt`
    // é outro sítio, e dizer «Zoom» ali seria dar confiança a um engano.
    expect(plataformaDoLink("https://zoom.us.exemplo.pt/j/1")).toBeNull();
  });

  it("completa o esquema em falta, porque ninguém escreve https:// de cor", () => {
    const r = examinarLigacao("meet.google.com/abc-defg-hij");
    expect(r.erro).toBeNull();
    expect(r.valor).toBe("https://meet.google.com/abc-defg-hij");
    expect(r.plataforma?.nome).toBe("Google Meet");
  });

  it("recusa esquemas executáveis e marcação", () => {
    for (const mau of [
      "javascript:alert(1)",
      "  JavaScript:alert(1)",
      "vbscript:msgbox",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "https://exemplo.pt/<script>",
    ]) {
      const r = examinarLigacao(mau);
      expect(r.erro, `devia recusar «${mau}»`).not.toBeNull();
      expect(r.valor).toBe("");
    }
  });

  it("recusa um anfitrião sem domínio, que não leva a lado nenhum", () => {
    expect(examinarLigacao("sala-da-marta").erro).not.toBeNull();
    expect(examinarLigacao("localhost:3000").erro).not.toBeNull();
  });

  it("aceita http mas avisa, porque é quase sempre um link copiado de um sítio antigo", () => {
    const r = examinarLigacao("http://sala.exemplo.pt/marta");
    expect(r.erro).toBeNull();
    expect(r.valor).toBe("http://sala.exemplo.pt/marta");
    expect(r.aviso).not.toBeNull();
  });

  it("recusa um endereço maior do que a coluna aguenta", () => {
    const gigante = `https://exemplo.pt/${"a".repeat(MAX_LOCAL)}`;
    expect(examinarLigacao(gigante).erro).not.toBeNull();
  });

  it("um campo vazio não é um erro — é um campo vazio", () => {
    const r = examinarLigacao("   ");
    expect(r.erro).toBeNull();
    expect(r.valor).toBe("");
  });
});

// ─── Telefone ──────────────────────────────────────────────────────────

describe("local-consulta: o número de telefone", () => {
  it("põe o indicativo num número português escrito à portuguesa", () => {
    expect(examinarTelefone("912 345 678").valor).toBe("+351912345678");
    expect(examinarTelefone("912345678").valor).toBe("+351912345678");
    expect(examinarTelefone("+351 912 345 678").valor).toBe("+351912345678");
  });

  it("aceita indicativos estrangeiros sem lhes mexer", () => {
    expect(examinarTelefone("+34 600 000 000").valor).toBe("+34600000000");
  });

  it("recusa o que não é um número", () => {
    expect(examinarTelefone("liga-me").erro).not.toBeNull();
    expect(examinarTelefone("91234").erro).not.toBeNull();
  });

  it("mostra o número como se lê", () => {
    expect(formatarTelefone("+351912345678")).toBe("+351 912 345 678");
  });

  it("distingue um telefone de uma sala pelo prefixo guardado", () => {
    expect(ehTelefone(`${PREFIXO_TEL}+351912345678`)).toBe(true);
    expect(ehTelefone("https://meet.google.com/x")).toBe(false);
  });
});

// ─── O ponto no mapa ───────────────────────────────────────────────────

describe("local-consulta: o ponto", () => {
  it("aceita coordenadas que existem à face da Terra", () => {
    expect(pontoValido(41.1836, -8.6929)).toBe(true);
    expect(pontoValido(38.7223, -9.1393)).toBe(true);
  });

  it("recusa o que não é um par de números úteis", () => {
    expect(pontoValido(null, null)).toBe(false);
    expect(pontoValido(41.18, null)).toBe(false);
    expect(pontoValido(NaN, -8.69)).toBe(false);
    expect(pontoValido(91, 0)).toBe(false);
    expect(pontoValido(0, 181)).toBe(false);
    // (0, 0) é o que sai de um campo por preencher, e fica no Atlântico.
    expect(pontoValido(0, 0)).toBe(false);
  });

  it("sabe o que cai dentro de Portugal, ilhas incluídas", () => {
    expect(dentroDePortugal({ lat: 41.1836, lng: -8.6929 })).toBe(true); // Matosinhos
    expect(dentroDePortugal({ lat: 32.6669, lng: -16.9241 })).toBe(true); // Funchal
    expect(dentroDePortugal({ lat: 37.7412, lng: -25.6756 })).toBe(true); // Ponta Delgada
    expect(dentroDePortugal({ lat: 40.4168, lng: -3.7038 })).toBe(false); // Madrid
  });

  it("escreve as coordenadas à portuguesa, com casas que chegam para a porta", () => {
    expect(formatarCoordenadas({ lat: 41.1836, lng: -8.6929 })).toBe("41,18360, -8,69290");
  });
});

// ─── Ligações de mapa ──────────────────────────────────────────────────

describe("local-consulta: como se chega lá", () => {
  it("com ponto, manda para o ponto — e diz que é exato", () => {
    const l = ligacoesDeMapa("Rua Brito Capelo, Matosinhos", { lat: 41.1836, lng: -8.6929 });
    expect(l.exato).toBe(true);
    expect(l.google).toContain("41.1836%2C-8.6929");
    expect(l.osm).toContain("mlat=41.1836");
    expect(l.apple).toContain("ll=41.1836");
  });

  it("sem ponto, faz uma pesquisa pela morada — e não finge que sabe onde é", () => {
    const l = ligacoesDeMapa("Rua de exemplo, 1 · Matosinhos", null);
    expect(l.exato).toBe(false);
    expect(l.google).toContain(encodeURIComponent("Rua de exemplo, 1 · Matosinhos"));
  });

  it("um ponto inválido vale o mesmo que nenhum ponto", () => {
    expect(ligacoesDeMapa("Rua X", { lat: 0, lng: 0 }).exato).toBe(false);
  });
});

// ─── Leitura do que está guardado ──────────────────────────────────────

describe("local-consulta: ler o que ficou gravado", () => {
  it("lê uma sala de videochamada com plataforma e botão", () => {
    const l = lerLocal("online", "https://meet.google.com/abc-defg-hij");
    expect(l?.tipo).toBe("video");
    expect(l?.ligacao).toBe("https://meet.google.com/abc-defg-hij");
    expect(nomeDoCanal(l!)).toBe("Google Meet");
  });

  it("lê um telefone guardado com prefixo", () => {
    const l = lerLocal("online", `${PREFIXO_TEL}+351912345678`);
    expect(l?.tipo).toBe("telefone");
    expect(l?.texto).toBe("+351 912 345 678");
    expect(l?.ligacao).toBe("tel:+351912345678");
  });

  it("não transforma em ligação clicável o que não passou no exame", () => {
    const l = lerLocal("online", "javascript:alert(1)");
    expect(l?.ligacao).toBeNull();
  });

  it("a modalidade manda: um link numa presencial continua a ser uma morada", () => {
    const l = lerLocal("presencial", "https://meet.google.com/x");
    expect(l?.tipo).toBe("presencial");
    expect(l?.ligacao).toBeNull();
  });

  it("lê uma morada com ponto e outra sem, sem confundir as duas", () => {
    const com = lerLocal("presencial", "Rua Brito Capelo, Matosinhos", 41.1836, -8.6929);
    expect(com?.ponto).toEqual({ lat: 41.1836, lng: -8.6929 });

    const sem = lerLocal("presencial", "Rua de exemplo, 1", null, null);
    expect(sem?.ponto).toBeNull();

    // Meia coordenada não é meio ponto: é ponto nenhum.
    const meia = lerLocal("presencial", "Rua de exemplo, 1", 41.1836, null);
    expect(meia?.ponto).toBeNull();
  });

  it("um local vazio é ausência, não um cartão em branco", () => {
    expect(lerLocal("online", null)).toBeNull();
    expect(lerLocal("presencial", "   ")).toBeNull();
  });
});

describe("local-consulta: a morada legível", () => {
  it("tira o país e encurta o que o geocodificador devolve por extenso", () => {
    const bruta =
      "25, Rua Brito Capelo, Matosinhos e Leça da Palmeira, Matosinhos, Porto, 4450-073, Portugal";
    const curta = moradaCurta(bruta);
    expect(curta).not.toContain("Portugal");
    expect(curta).toContain("Rua Brito Capelo");
    expect(curta.split(",").length).toBeLessThanOrEqual(4);
  });

  it("deixa em paz uma morada que já é curta", () => {
    expect(moradaCurta("Rua Brito Capelo, 4450-073 Matosinhos")).toBe(
      "Rua Brito Capelo, 4450-073 Matosinhos"
    );
  });
});

// ─── O topo da agenda ──────────────────────────────────────────────────

const AGORA = new Date("2026-08-17T09:00:00Z");

function consulta(p: Partial<Agendamento> & { id: string; inicio: string }): Agendamento {
  return {
    contabilistaId: "cc",
    clienteId: "cl",
    fim: new Date(Date.parse(p.inicio) + 3600_000).toISOString(),
    estado: "confirmado",
    modalidade: "online",
    assunto: null,
    localOuLigacao: "https://meet.google.com/x",
    localLat: null,
    localLng: null,
    criadoEm: "2026-08-01T09:00:00Z",
    ...p,
  };
}

describe("resumo da agenda: o que exige alguma coisa de ti", () => {
  it("põe na fila os pedidos que ainda vão acontecer, por ordem de data", () => {
    const r = resumirAgenda(
      [
        consulta({ id: "b", inicio: "2026-08-20T10:00:00Z", estado: "pedido" }),
        consulta({ id: "a", inicio: "2026-08-18T10:00:00Z", estado: "pedido" }),
      ],
      AGORA
    );
    expect(r.porConfirmar.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("não pede para confirmar uma consulta de ontem — isso é história, não trabalho", () => {
    const r = resumirAgenda(
      [consulta({ id: "velha", inicio: "2026-08-10T10:00:00Z", estado: "pedido" })],
      AGORA
    );
    expect(r.porConfirmar).toHaveLength(0);
  });

  it("a próxima é a primeira que ainda não acabou, confirmada ou por confirmar", () => {
    const r = resumirAgenda(
      [
        consulta({ id: "ja-acabou", inicio: "2026-08-17T07:00:00Z" }),
        consulta({ id: "a-decorrer", inicio: "2026-08-17T08:30:00Z" }),
        consulta({ id: "depois", inicio: "2026-08-19T10:00:00Z" }),
      ],
      AGORA
    );
    expect(r.proxima?.id).toBe("a-decorrer");
  });

  it("cancelada não é próxima nem entra nas contas da semana", () => {
    const r = resumirAgenda(
      [
        consulta({ id: "morta", inicio: "2026-08-18T10:00:00Z", estado: "cancelado_cliente" }),
        consulta({ id: "viva", inicio: "2026-08-19T10:00:00Z" }),
      ],
      AGORA
    );
    expect(r.proxima?.id).toBe("viva");
    expect(r.confirmadasNaSemana).toBe(1);
  });

  it("conta só os sete dias seguintes, e não a agenda inteira", () => {
    const r = resumirAgenda(
      [
        consulta({ id: "esta-semana", inicio: "2026-08-19T10:00:00Z" }),
        consulta({ id: "para-o-mes-que-vem", inicio: "2026-09-15T10:00:00Z" }),
      ],
      AGORA
    );
    expect(r.confirmadasNaSemana).toBe(1);
  });

  it("assinala as confirmadas em que o cliente sabe a hora e não sabe onde é", () => {
    const r = resumirAgenda(
      [
        consulta({ id: "muda", inicio: "2026-08-19T10:00:00Z", localOuLigacao: null }),
        consulta({ id: "so-espacos", inicio: "2026-08-20T10:00:00Z", localOuLigacao: "   " }),
        consulta({ id: "dita", inicio: "2026-08-21T10:00:00Z" }),
        // Um pedido ainda por confirmar não conta: o local pede-se ao
        // confirmar, e cobrá-lo antes seria ruído.
        consulta({ id: "pedido", inicio: "2026-08-22T10:00:00Z", estado: "pedido", localOuLigacao: null }),
      ],
      AGORA
    );
    expect(r.semLocal.map((c) => c.id)).toEqual(["muda", "so-espacos"]);
  });
});

// ─── Sobreposições na grelha ───────────────────────────────────────────

describe("grelha semanal: duas consultas à mesma hora", () => {
  it("uma consulta sozinha ocupa a coluna inteira", () => {
    const [p] = distribuir([consulta({ id: "a", inicio: "2026-08-18T10:00:00Z" })]);
    expect(p.coluna).toBe(0);
    expect(p.colunas).toBe(1);
  });

  it("duas sobrepostas repartem a largura em vez de se taparem", () => {
    const d = distribuir([
      consulta({ id: "a", inicio: "2026-08-18T10:00:00Z" }),
      consulta({ id: "b", inicio: "2026-08-18T10:30:00Z" }),
    ]);
    expect(d.every((p) => p.colunas === 2)).toBe(true);
    expect(new Set(d.map((p) => p.coluna))).toEqual(new Set([0, 1]));
  });

  it("consultas seguidas sem sobreposição continuam à largura toda", () => {
    const d = distribuir([
      consulta({ id: "a", inicio: "2026-08-18T10:00:00Z" }),
      consulta({ id: "b", inicio: "2026-08-18T11:00:00Z" }),
    ]);
    expect(d.every((p) => p.colunas === 1)).toBe(true);
  });

  it("reutiliza a faixa que já vagou, em vez de estreitar o dia inteiro", () => {
    // a: 10–11 · b: 10:30–11:30 · c: 11:15–12:15
    // As três encadeiam-se, mas nunca há mais de duas ao mesmo tempo.
    const d = distribuir([
      consulta({ id: "a", inicio: "2026-08-18T10:00:00Z" }),
      consulta({ id: "b", inicio: "2026-08-18T10:30:00Z" }),
      consulta({ id: "c", inicio: "2026-08-18T11:15:00Z" }),
    ]);
    expect(d.every((p) => p.colunas === 2)).toBe(true);
    expect(d.find((p) => p.agendamento.id === "c")?.coluna).toBe(0);
  });

  it("devolve todas as consultas que recebeu, sem perder nenhuma", () => {
    const entrada = [
      consulta({ id: "a", inicio: "2026-08-18T09:00:00Z" }),
      consulta({ id: "b", inicio: "2026-08-18T09:00:00Z" }),
      consulta({ id: "c", inicio: "2026-08-18T14:00:00Z" }),
    ];
    expect(distribuir(entrada).map((p) => p.agendamento.id).sort()).toEqual(["a", "b", "c"]);
  });
});
