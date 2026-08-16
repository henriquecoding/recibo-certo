// ═══════════════════════════════════════════════════════════════════════
//  O DIRETÓRIO SEM REACT — filtros, endereço e regras de apresentação
//  ---------------------------------------------------------------------
//  Tudo o que aqui se testa é uma função pura, e é de propósito: são estas
//  que decidem se um link partilhado devolve a mesma lista, se um distrito
//  inventado à mão no URL vira uma consulta, e se uma inscrição escrita
//  num formulário pode aparecer como «verificada».
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  comFiltro, contarFiltros, especialidadesDoCartao, estadoOcc, filtroParaQuery,
  FILTRO_VAZIO, parseFiltro, textoLocalizacao, textoModalidades, textoRespostaCurta,
} from "@/lib/contabilistas/diretorio";

const ler = (query: string) => parseFiltro(new URLSearchParams(query));

describe("estado da procura na barra de endereço", () => {
  it("lê os filtros que a página escreve", () => {
    const f = ler("q=irs&distrito=Lisboa&especialidade=IVA&modalidade=online&vagas=1&pagina=3");

    expect(f.procura).toBe("irs");
    expect(f.distrito).toBe("Lisboa");
    expect(f.especialidade).toBe("IVA");
    expect(f.modalidade).toBe("online");
    expect(f.soAceitaNovos).toBe(true);
    expect(f.pagina).toBe(3);
  });

  it("descarta o que não está nos catálogos fechados", () => {
    const f = ler("distrito=Madrid&especialidade=Astrologia&modalidade=telepatia&idioma=klingon");

    expect(f.distrito).toBe("");
    expect(f.especialidade).toBe("");
    expect(f.modalidade).toBe("");
    expect(f.idioma).toBe("");
  });

  it("aceita distritos e áreas escritos com outra caixa", () => {
    expect(ler("distrito=lisboa").distrito).toBe("Lisboa");
    expect(ler("especialidade=irs").especialidade).toBe("IRS");
  });

  it("nunca devolve uma página que dê um intervalo inválido", () => {
    expect(ler("pagina=0").pagina).toBe(1);
    expect(ler("pagina=-4").pagina).toBe(1);
    expect(ler("pagina=abc").pagina).toBe(1);
    expect(ler("pagina=99999").pagina).toBeLessThanOrEqual(40);
  });

  it("escreve o endereço canónico: só o que difere do vazio", () => {
    expect(filtroParaQuery(FILTRO_VAZIO)).toBe("");

    const query = filtroParaQuery({
      ...FILTRO_VAZIO, procura: "irs", distrito: "Lisboa", soAceitaNovos: true,
    });
    expect(query).toBe("q=irs&distrito=Lisboa&vagas=1");
    // A ordem por omissão não polui o link partilhado.
    expect(query).not.toContain("ordem");
    expect(query).not.toContain("pagina");
  });

  it("a ida e a volta dão o mesmo filtro", () => {
    const original = {
      ...FILTRO_VAZIO,
      procura: "maria", distrito: "Porto", especialidade: "IRS",
      modalidade: "ambos" as const, idioma: "en",
      soAceitaNovos: true, soOccVerificada: true, soLinkedIn: true,
      ordem: "nome" as const, pagina: 2,
    };
    expect(ler(filtroParaQuery(original))).toEqual(original);
  });

  it("mudar um filtro volta à primeira página", () => {
    const em3 = { ...FILTRO_VAZIO, pagina: 3 };
    expect(comFiltro(em3, { distrito: "Braga" }).pagina).toBe(1);
    // ... exceto quando é a própria página que muda («carregar mais»).
    expect(comFiltro(em3, { pagina: 4 }).pagina).toBe(4);
  });

  it("conta os filtros ativos para o botão do telemóvel", () => {
    expect(contarFiltros(FILTRO_VAZIO)).toBe(0);
    expect(contarFiltros({ ...FILTRO_VAZIO, ordem: "nome", pagina: 5 })).toBe(0);
    expect(contarFiltros({ ...FILTRO_VAZIO, distrito: "Faro", soLinkedIn: true })).toBe(2);
    expect(contarFiltros({ ...FILTRO_VAZIO, procura: "   " })).toBe(0);
  });
});

describe("a inscrição na Ordem tem três estados, não dois", () => {
  it("sem número não finge certificação nenhuma", () => {
    const e = estadoOcc({ occ: null, occVerificado: false });
    expect(e.etiqueta).toBe("Perfil profissional aprovado");
    expect(e.etiqueta).not.toMatch(/verificad/i);
  });

  it("um número escrito no formulário é «informada»", () => {
    const e = estadoOcc({ occ: "12345", occVerificado: false });
    expect(e.etiqueta).toBe("OCC n.º 12345 · Informada");
    expect(e.tom).toBe("informada");
  });

  it("«verificada» exige a confirmação administrativa", () => {
    const e = estadoOcc({ occ: "12345", occVerificado: true });
    expect(e.etiqueta).toBe("OCC n.º 12345 · Verificada");
    expect(e.tom).toBe("verificada");
  });
});

describe("o que o cartão diz sobre local, atendimento e áreas", () => {
  it("mostra o que existir da localização, e nada quando não há", () => {
    expect(textoLocalizacao({ concelho: "Sintra", distrito: "Lisboa" })).toBe("Sintra, Lisboa");
    expect(textoLocalizacao({ concelho: null, distrito: "Faro" })).toBe("Faro");
    expect(textoLocalizacao({ concelho: "Braga", distrito: null })).toBe("Braga");
    expect(textoLocalizacao({ concelho: null, distrito: null })).toBeNull();
  });

  it("não inventa modalidade quando o perfil não a declarou", () => {
    expect(textoModalidades(["online", "presencial"])).toBe("Online e presencial");
    expect(textoModalidades(["online"])).toBe("Online");
    expect(textoModalidades(["presencial"])).toBe("Presencial");
    expect(textoModalidades([])).toBe("A combinar");
  });

  it("limita as áreas visíveis e conta as restantes", () => {
    const todas = ["IRS", "IVA", "Recibos verdes", "Sociedades e IRC", "Heranças e sucessões"];

    expect(especialidadesDoCartao([], "")).toEqual({ visiveis: [], restantes: 0 });
    expect(especialidadesDoCartao(["IRS"], "")).toEqual({ visiveis: ["IRS"], restantes: 0 });

    const tres = especialidadesDoCartao(todas, "");
    expect(tres.visiveis).toHaveLength(3);
    expect(tres.restantes).toBe(2);
  });

  it("põe à frente a área que a pessoa está a filtrar", () => {
    const { visiveis } = especialidadesDoCartao(
      ["IRS", "IVA", "Recibos verdes", "Sociedades e IRC"],
      "Sociedades e IRC",
    );
    expect(visiveis[0]).toBe("Sociedades e IRC");
    // E não a duplica no resto da lista.
    expect(visiveis.filter((e) => e === "Sociedades e IRC")).toHaveLength(1);
  });

  it("o tempo de resposta continua a ler-se como declarado", () => {
    expect(textoRespostaCurta(24)).toBe("Normalmente em 24h");
    expect(textoRespostaCurta(4)).toBe("Normalmente em 4h");
    expect(textoRespostaCurta(48)).toBe("Normalmente em 2 dias");
    expect(textoRespostaCurta(null)).toBeNull();
    expect(textoRespostaCurta(0)).toBeNull();
    // Nunca «média», «garantido» ou «verificado» — não medimos isto (§12).
    expect(textoRespostaCurta(24)).not.toMatch(/médi|garant|verificad/i);
  });
});
