// ═══════════════════════════════════════════════════════════════════════
//  Os motores de personalização, testados no ponto de tensão
//  ---------------------------------------------------------------------
//  Abrir o perfil só é defensável se a abertura não puder ser usada para
//  publicar afirmações falsas nem para partir o diretório. É isso que
//  estes testes verificam — não a mecânica dos campos.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  ESQUEMAS, MAX_BLOCOS, blocosPublicaveis, escreverBlocos, lerBlocos,
  moverBloco, novoBloco, tiposDisponiveis, validarBloco, validarBlocos,
  type Bloco,
} from "@/lib/contabilistas/personalizacao/blocos";
import {
  COBERTURA_VAZIA, alcanceDaCobertura, cobreConcelho, descreverCobertura,
  escreverCobertura, lerCobertura, validarCobertura,
} from "@/lib/contabilistas/personalizacao/cobertura";
import { avaliarCampos, avaliarTexto } from "@/lib/contabilistas/personalizacao/guardiao";
import {
  MAX_TERMOS, acrescentarTermo, areaDoTermo, areasEfetivas, sugerirAreas,
} from "@/lib/contabilistas/personalizacao/taxonomia";

// ─── Guardião ──────────────────────────────────────────────────────────

describe("guardião de afirmações", () => {
  it("bloqueia superlativos que ninguém mediu", () => {
    const p = avaliarTexto("Sou o melhor contabilista de Lisboa.");
    expect(p.bloqueado).toBe(true);
    expect(p.achados[0].sugestao).toBeTruthy();
  });

  it("bloqueia promessas sobre decisões da Autoridade Tributária", () => {
    expect(avaliarTexto("Garanto o reembolso do IRS.").bloqueado).toBe(true);
    expect(avaliarTexto("Trabalho sem multas nunca.").bloqueado).toBe(true);
  });

  it("bloqueia poupanças quantificadas e avais oficiais inexistentes", () => {
    expect(avaliarTexto("Poupe 40% no seu IRS.").bloqueado).toBe(true);
    expect(avaliarTexto("Certificado pelas Finanças.").bloqueado).toBe(true);
  });

  it("deixa passar compromissos de serviço legítimos", () => {
    const bons = [
      "Garanto que respondo no próprio dia útil.",
      "Acompanho o ano todo, não só na altura do IRS.",
      "Explico as contas em vez de mandar um número seco.",
      "Trabalho com trabalhadores independentes e micro-empresas do Porto.",
    ];
    for (const t of bons) expect(avaliarTexto(t).bloqueado).toBe(false);
  });

  it("avisa sem bloquear onde é exagero e não falsidade", () => {
    const p = avaliarTexto("Últimas vagas para este mês.");
    expect(p.bloqueado).toBe(false);
    expect(p.avisos).toBe(1);
  });

  it("apanha todos os achados de uma vez, e é idempotente", () => {
    const t = "Sou o melhor e garanto o reembolso.";
    const a = avaliarTexto(t);
    const b = avaliarTexto(t);
    expect(a.achados.length).toBe(2);
    // O `lastIndex` dos regexes globais é estado partilhado: sem reposição,
    // a segunda passagem no mesmo texto perdia achados.
    expect(b.achados.length).toBe(a.achados.length);
  });

  it("as regras funcionam com acentos — e o excerto sai com eles", () => {
    // O `\b` do JavaScript é ASCII: sem dobrar o texto, nenhuma destas
    // frases era apanhada, porque começam ou passam por letras acentuadas.
    const p = avaliarTexto("Últimas vagas: poupança de 40% garantida.");
    expect(p.achados.length).toBeGreaterThanOrEqual(2);
    expect(p.bloqueado).toBe(true);
    expect(p.achados[0].excerto).toContain("Últimas");
  });

  it("não bloqueia «número» quando não é um ranking", () => {
    expect(avaliarTexto("Explico cada número da declaração.").bloqueado).toBe(false);
    expect(avaliarTexto("Sou o nº 1 do distrito.").bloqueado).toBe(true);
  });

  it("diz em que campo está o problema", () => {
    const r = avaliarCampos([
      { id: "bio", rotulo: "Apresentação", texto: "Explico as contas com calma." },
      { id: "curta", rotulo: "Uma linha", texto: "O melhor do país." },
    ]);
    expect(r.porCampo.bio.bloqueado).toBe(false);
    expect(r.porCampo.curta.bloqueado).toBe(true);
    expect(r.bloqueado).toBe(true);
  });
});

// ─── Taxonomia ─────────────────────────────────────────────────────────

describe("taxonomia de áreas", () => {
  it("liga o vocabulário das pessoas ao eixo do diretório", () => {
    expect(areaDoTermo("nómadas digitais")).toBe("Clientes internacionais");
    expect(areaDoTermo("ato isolado")).toBe("Recibos verdes");
    expect(areaDoTermo("anexo B")).toBe("IRS");
    expect(areaDoTermo("penhora")).toBe("Dívidas e execuções");
  });

  it("não classifica por acidente de contenção", () => {
    // «IVA» está dentro de «privativa» — a correspondência é por palavra.
    expect(areaDoTermo("consulta privativa")).toBeNull();
    expect(areaDoTermo("")).toBeNull();
  });

  it("um termo próprio descreve mas nunca cria filtro novo", () => {
    const r = acrescentarTermo([], "Freelancers de design");
    expect(r.ok).toBe(true);
    expect(r.termo?.texto).toBe("Freelancers de design");
    expect(r.termo?.area).toBe("Recibos verdes");

    const solto = acrescentarTermo([], "Atletas de alta competição");
    expect(solto.ok).toBe(true);
    expect(solto.termo?.area).toBeNull();
  });

  it("recusa duplicados, excessos e termos iguais a áreas", () => {
    const um = acrescentarTermo([], "Cripto").termo!;
    expect(acrescentarTermo([um], "cripto").motivo).toBe("duplicado");
    expect(acrescentarTermo([], "IRS").motivo).toBe("igual_a_area");
    expect(acrescentarTermo([], "x".repeat(200)).motivo).toBe("longo_demais");
    expect(acrescentarTermo([], "   ").motivo).toBe("vazio");

    const cheio = Array.from({ length: MAX_TERMOS }, (_, i) => ({ texto: `t${i}`, area: null }));
    expect(acrescentarTermo(cheio, "mais um").motivo).toBe("limite_atingido");
  });

  it("as áreas efectivas juntam o escolhido ao implícito, em ordem estável", () => {
    const a = areasEfetivas(["IRS"], [{ texto: "nómadas digitais", area: "Clientes internacionais" }]);
    expect(a).toEqual(["IRS", "Clientes internacionais"]);
    // A ordem é a do eixo, não a de inserção — duas leituras dão o mesmo.
    const b = areasEfetivas(["Clientes internacionais"], [{ texto: "anexo B", area: "IRS" }]);
    expect(b).toEqual(a);
  });

  it("sugere apenas áreas do eixo, e nunca as já escolhidas", () => {
    const s = sugerirAreas("iva", []);
    expect(s).toContain("IVA");
    expect(sugerirAreas("iva", ["IVA"])).not.toContain("IVA");
  });
});

// ─── Blocos ────────────────────────────────────────────────────────────

function bloco(over: Partial<Bloco> = {}): Bloco {
  return {
    id: "b1", tipo: "texto", titulo: "Como trabalho",
    itens: [{ principal: "Explico as contas com calma.", secundario: null }],
    ...over,
  };
}

describe("motor de blocos", () => {
  it("um bloco válido passa", () => {
    expect(validarBloco(bloco()).ok).toBe(true);
  });

  it("o guardião corre dentro dos blocos", () => {
    const v = validarBloco(bloco({
      itens: [{ principal: "Sou o melhor de Lisboa.", secundario: null }],
    }));
    expect(v.ok).toBe(false);
    expect(v.achados[0].achado.gravidade).toBe("bloqueio");
  });

  it("uma FAQ sem resposta não passa", () => {
    const v = validarBloco({
      id: "f", tipo: "faq", titulo: "Perguntas",
      itens: [{ principal: "Preciso de contabilista?", secundario: "" }],
    });
    expect(v.ok).toBe(false);
  });

  it("recusa exceder o máximo de entradas do tipo", () => {
    const n = ESQUEMAS.lista.maxItens + 1;
    const v = validarBloco({
      id: "l", tipo: "lista", titulo: "O que trato",
      itens: Array.from({ length: n }, () => ({ principal: "Item", secundario: null })),
    });
    expect(v.erros.some((e) => e.campo === "bloco")).toBe(true);
  });

  it("apanha os problemas de conjunto que nenhum bloco isolado revela", () => {
    const repetidos: Bloco[] = [
      { id: "a", tipo: "faq", titulo: "FAQ 1", itens: [{ principal: "P", secundario: "R" }] },
      { id: "b", tipo: "faq", titulo: "FAQ 2", itens: [{ principal: "P", secundario: "R" }] },
    ];
    expect(validarBlocos(repetidos).gerais.some((g) => g.includes("uma vez"))).toBe(true);

    const mesmoTitulo = [bloco({ id: "a" }), bloco({ id: "b" })];
    expect(validarBlocos(mesmoTitulo).gerais.some((g) => g.includes("dois blocos"))).toBe(true);

    const demais = Array.from({ length: MAX_BLOCOS + 1 }, (_, i) => bloco({ id: `b${i}`, titulo: `T${i}` }));
    expect(validarBlocos(demais).gerais.some((g) => g.includes("máximo"))).toBe(true);
  });

  it("o perfil público ignora blocos vazios ou bloqueados", () => {
    const lista: Bloco[] = [
      bloco({ id: "ok" }),
      bloco({ id: "vazio", titulo: "Vazio", itens: [] }),
      bloco({ id: "mau", titulo: "Mau", itens: [{ principal: "Garanto o reembolso.", secundario: null }] }),
    ];
    expect(blocosPublicaveis(lista).map((b) => b.id)).toEqual(["ok"]);
  });

  it("guardar preserva o rascunho a meio — não é o mesmo que publicar", () => {
    const meio: Bloco[] = [bloco({ id: "m", titulo: "A meio", itens: [] })];
    // Não se publica…
    expect(blocosPublicaveis(meio)).toHaveLength(0);
    // …mas não se perde.
    expect(escreverBlocos(meio)).toHaveLength(1);
  });

  it("ler tolera lixo em vez de deixar o perfil em branco", () => {
    const lidos = lerBlocos([
      { tipo: "texto", titulo: "Bom", itens: [{ principal: "Sim" }] },
      { tipo: "inexistente", titulo: "Mau", itens: [] },
      "não é um objeto",
      null,
    ]);
    expect(lidos).toHaveLength(1);
    expect(lidos[0].id).toBeTruthy();
    expect(lerBlocos("nada disto")).toEqual([]);
  });

  it("mover fora dos limites devolve a lista intacta", () => {
    const l = [bloco({ id: "a" }), bloco({ id: "b" })];
    expect(moverBloco(l, 0, 1).map((b) => b.id)).toEqual(["b", "a"]);
    expect(moverBloco(l, 0, 9).map((b) => b.id)).toEqual(["a", "b"]);
    expect(moverBloco(l, -1, 0).map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("os tipos não repetíveis desaparecem depois de usados", () => {
    const comFaq = [novoBloco("faq")];
    expect(tiposDisponiveis(comFaq)).not.toContain("faq");
    expect(tiposDisponiveis(comFaq)).toContain("texto");
    const cheio = Array.from({ length: MAX_BLOCOS }, () => novoBloco("texto"));
    expect(tiposDisponiveis(cheio)).toEqual([]);
  });
});

// ─── Cobertura ─────────────────────────────────────────────────────────

describe("motor de cobertura", () => {
  it("«todo o país» exige atendimento online", () => {
    const c = { ...COBERTURA_VAZIA, modo: "pais" as const };
    expect(validarCobertura(c, ["presencial"]).some((p) => p.campo === "modo")).toBe(true);
    expect(validarCobertura(c, ["online"])).toHaveLength(0);
  });

  it("quem atende presencialmente tem de dizer onde", () => {
    const c = { ...COBERTURA_VAZIA, modo: "local" as const };
    expect(validarCobertura(c, ["presencial"]).some((p) => p.campo === "distrito")).toBe(true);
  });

  it("recusa distritos fora da lista", () => {
    const c = { ...COBERTURA_VAZIA, modo: "distritos" as const, distritos: ["Barcelona"] };
    expect(validarCobertura(c, ["online"]).some((p) => p.campo === "distritos")).toBe(true);
  });

  it("descreve o território de uma só maneira", () => {
    const local = { ...COBERTURA_VAZIA, distrito: "Porto", concelho: "Matosinhos" };
    expect(descreverCobertura(local, ["presencial"])).toBe("Matosinhos, Porto");
    expect(descreverCobertura(local, ["presencial", "online"])).toContain("presencial e online");

    const multi = { ...COBERTURA_VAZIA, modo: "distritos" as const, distritos: ["Porto", "Braga"] };
    expect(descreverCobertura(multi, ["online"])).toContain("Porto e Braga");
  });

  it("o alcance inclui sempre o distrito do escritório", () => {
    const c = {
      ...COBERTURA_VAZIA, modo: "concelhos" as const,
      distrito: "Lisboa", concelho: "Sintra", concelhos: ["Amadora", "Cascais"],
    };
    const a = alcanceDaCobertura(c);
    expect(a.distritos).toContain("Lisboa");
    expect(a.concelhos).toEqual(expect.arrayContaining(["Sintra", "Amadora", "Cascais"]));
    expect(cobreConcelho(c, "cascais")).toBe(true);
    expect(cobreConcelho(c, "Évora")).toBe(false);
  });

  it("cobertura nacional cobre tudo", () => {
    const c = { ...COBERTURA_VAZIA, modo: "pais" as const };
    expect(cobreConcelho(c, "Bragança")).toBe(true);
  });

  it("gravar limpa o território do modo que já não está escolhido", () => {
    const c = {
      ...COBERTURA_VAZIA, modo: "local" as const,
      concelhos: ["Amadora"], distritos: ["Porto"], distrito: "Lisboa",
    };
    const gravado = escreverCobertura(c);
    expect(gravado.concelhos).toEqual([]);
    expect(gravado.distritos).toEqual([]);
    expect(gravado.distrito).toBe("Lisboa");
  });

  it("ler tolera lixo e desduplica", () => {
    const c = lerCobertura({
      modo: "concelhos", concelhos: ["Porto", "porto", "  Braga ", 42],
      distritos: ["Porto", "Inexistente"],
    });
    expect(c.concelhos).toEqual(["Porto", "Braga"]);
    expect(c.distritos).toEqual(["Porto"]);
    expect(lerCobertura(null).modo).toBe("local");
  });
});
