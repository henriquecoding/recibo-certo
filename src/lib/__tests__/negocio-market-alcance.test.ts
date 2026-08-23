// ═══════════════════════════════════════════════════════════════════════
//  O TERRITÓRIO ALCANÇÁVEL — a geografia que faltava ao motor
//  ---------------------------------------------------------------------
//  Estes testes prendem a correção de um defeito que foi MEDIDO antes de
//  ser escrito. Com tudo o resto fixo, mudando um controlo de cada vez:
//
//    alcance   concelho = região = nacional → resultado IDÊNTICO
//    raio      10 = 25 = 40 = 80 km → idêntico, exceto 10 km em rural
//
//  Ou seja, três dos quatro alcances e três dos quatro raios não faziam
//  nada, em contexto nenhum. A interface dizia «não muda nada» e tinha
//  razão. O que faltava era geografia: o motor sabia a que REGIÃO cada
//  concelho pertence e não sabia ONDE ele fica.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  SEDES,
  SEDES_FONTE,
  TEM_GEOGRAFIA,
  concelhoMaisProximo,
  concelhosNoRaio,
  distanciaKm,
  escalaDoTerritorio,
  territorioAlcancavel,
} from "@/lib/negocio/market/alcance";
import { CONCELHOS, CONCELHO_POR_CODIGO, concelhosDaRegiao } from "@/lib/negocio/market/concelhos";

/** Códigos INE usados nos testes, com o nome à frente para se ler. */
const LOULE = "1500808";
const LISBOA = "1A01106";
const FUNCHAL = "3003103";
const IDANHA = "1950505";

describe("sedes · o ficheiro cobre o país inteiro", () => {
  it("tem uma sede para cada um dos 308 concelhos", () => {
    // A regra é tudo-ou-nada por construção: sem os 308, `SEDES` fica
    // vazio de propósito. Meia geografia daria raios certos numa parte
    // do país e errados na outra — sem dar sinal nenhum.
    expect(TEM_GEOGRAFIA).toBe(true);
    expect(SEDES.size).toBe(CONCELHOS.length);
    for (const concelho of CONCELHOS) {
      expect(SEDES.has(concelho.codigo), concelho.nome).toBe(true);
    }
  });

  it("todas as sedes caem dentro dos limites de Portugal", () => {
    // Inclui os arquipélagos: os Açores vão até aos -31,3° de longitude
    // e a Madeira até aos 30,0° de latitude (Selvagens).
    for (const sede of SEDES.values()) {
      const nome = CONCELHO_POR_CODIGO.get(sede.codigo)?.nome ?? sede.codigo;
      expect(sede.lat, nome).toBeGreaterThan(29.5);
      expect(sede.lat, nome).toBeLessThan(43);
      expect(sede.lng, nome).toBeGreaterThan(-32);
      expect(sede.lng, nome).toBeLessThan(-6);
    }
  });

  it("declara de onde veio e sob que licença", () => {
    // Um ponto sem proveniência é um número com ar de facto. A regra da
    // casa vale para coordenadas como vale para taxas.
    expect(SEDES_FONTE.fonte).toMatch(/OpenStreetMap/i);
    expect(SEDES_FONTE.licenca).toBeTruthy();
    expect(SEDES_FONTE.metodo.length).toBeGreaterThan(40);
  });

  it("a sede do Funchal é a cidade, não o meio da caixa", () => {
    // ┌──────────────────────────────────────────────────────────────┐
    // │ O CASO QUE OBRIGOU A MUDAR O MÉTODO DE VALIDAÇÃO             │
    // │                                                              │
    // │ A relação administrativa do Funchal inclui as Ilhas          │
    // │ Selvagens, 250 km a sul. O centro da caixa envolvente cai no │
    // │ mar, a 148 km da cidade — e a primeira versão do gerador     │
    // │ RECUSOU o ponto certo por o comparar com essa referência.    │
    // └──────────────────────────────────────────────────────────────┘
    const funchal = SEDES.get(FUNCHAL)!;
    expect(distanciaKm(funchal, { lat: 32.65, lng: -16.91 })).toBeLessThan(5);
  });
});

describe("distâncias · a conta é a conta", () => {
  it("Lisboa–Porto dá os ~275 km que se sabem de cor", () => {
    const km = distanciaKm(SEDES.get(LISBOA)!, SEDES.get("11A1312")!);
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(300);
  });

  it("um ponto sobre uma sede resolve para esse concelho", () => {
    const sede = SEDES.get(LOULE)!;
    expect(concelhoMaisProximo({ lat: sede.lat, lng: sede.lng })).toBe(LOULE);
  });
});

describe("o círculo · quatro raios, quatro respostas", () => {
  it("cada raio maior apanha pelo menos tantos concelhos como o anterior", () => {
    const contagens = [10, 25, 40, 80].map((km) => concelhosNoRaio(LOULE, km).length);
    for (let indice = 1; indice < contagens.length; indice += 1) {
      expect(contagens[indice]!).toBeGreaterThanOrEqual(contagens[indice - 1]!);
    }
    // E não são todos iguais — que era exatamente o defeito.
    expect(new Set(contagens).size).toBeGreaterThan(1);
  });

  it("o próprio concelho vem sempre, e vem a zero quilómetros", () => {
    const dentro = concelhosNoRaio(IDANHA, 10);
    expect(dentro[0]?.codigo).toBe(IDANHA);
    expect(dentro[0]?.distanciaKm).toBe(0);
  });

  it("o resultado vem ordenado por distância", () => {
    const dentro = concelhosNoRaio(LISBOA, 60);
    expect(dentro.length).toBeGreaterThan(5);
    for (let indice = 1; indice < dentro.length; indice += 1) {
      expect(dentro[indice]!.distanciaKm).toBeGreaterThanOrEqual(dentro[indice - 1]!.distanciaKm);
    }
  });

  it("um raio sem centro não inventa um círculo", () => {
    expect(concelhosNoRaio("codigo-que-nao-existe", 25)).toHaveLength(0);
    expect(concelhosNoRaio(LOULE, 0)).toHaveLength(0);
  });
});

describe("o território · o alcance decide a zona analisada", () => {
  const base = { regiao: "algarve", concelho: LOULE } as const;

  it("os quatro alcances dão quatro territórios diferentes", () => {
    // ┌──────────────────────────────────────────────────────────────┐
    // │ O TESTE QUE PRENDE A QUEIXA                                   │
    // │                                                              │
    // │ «Onde vai operar diz que nada do que configurar importa.»    │
    // │ Media-se, e era verdade: concelho, região e nacional davam   │
    // │ resultado idêntico. Se voltarem a dar, este teste falha.      │
    // └──────────────────────────────────────────────────────────────┘
    const tamanhos = (["concelho", "regiao", "nacional", "online"] as const).map(
      (alcance) => territorioAlcancavel({ ...base, alcance }).codigos.length,
    );
    expect(tamanhos[0]).toBe(1);
    expect(tamanhos[1]).toBe(concelhosDaRegiao("algarve").length);
    expect(tamanhos[2]).toBe(CONCELHOS.length);
    expect(tamanhos[3]).toBe(CONCELHOS.length);
    expect(new Set(tamanhos).size).toBeGreaterThanOrEqual(3);
  });

  it("o raio recorta, e nunca ultrapassa a fronteira do alcance", () => {
    const soConcelho = territorioAlcancavel({ ...base, alcance: "concelho", raioKm: 80 });
    // Quem disse «o meu concelho» não passou a querer trabalhar a 80 km.
    expect(soConcelho.codigos).toEqual([LOULE]);

    const naRegiao = territorioAlcancavel({ ...base, alcance: "regiao", raioKm: 25 });
    expect(naRegiao.base).toBe("raio");
    expect(naRegiao.codigos.length).toBeGreaterThan(1);
    expect(naRegiao.codigos.length).toBeLessThan(concelhosDaRegiao("algarve").length);
    for (const codigo of naRegiao.codigos) {
      expect(CONCELHO_POR_CODIGO.get(codigo)?.regiao).toBe("algarve");
    }
  });

  it("um trabalho remoto não é limitado pelo raio, e diz porquê", () => {
    const remoto = territorioAlcancavel(
      { ...base, alcance: "nacional", raioKm: 10 },
      { entregaRemota: true },
    );
    expect(remoto.base).toBe("pais");
    expect(remoto.raioIgnorado).toMatch(/sem deslocação/i);
  });

  it("«só online» ignora o raio mesmo numa variante presencial", () => {
    const online = territorioAlcancavel({ ...base, alcance: "online", raioKm: 10 });
    expect(online.base).toBe("pais");
    expect(online.raioIgnorado).toMatch(/online/i);
  });

  it("sem concelho não há centro, e o raio é recusado com a razão à vista", () => {
    const semCentro = territorioAlcancavel({ regiao: "algarve", alcance: "concelho", raioKm: 25 });
    expect(semCentro.base).toBe("regiao");
    expect(semCentro.raioIgnorado).toMatch(/centro/i);
  });

  it("sem zona nem concelho o território é o país, e não fica vazio", () => {
    const nenhum = territorioAlcancavel({ regiao: "portugal", alcance: "regiao" });
    expect(nenhum.codigos).toHaveLength(CONCELHOS.length);
    expect(nenhum.nome).toBe("todo o país");
  });
});

describe("a escala · quanta gente cabe lá dentro", () => {
  it("um concelho grande tem percentil alto e um pequeno tem baixo", () => {
    const lisboa = escalaDoTerritorio({ codigos: [LISBOA] })!;
    const pequeno = escalaDoTerritorio({ codigos: ["1C20204"] })!; // Barrancos
    expect(lisboa.percentil).toBeGreaterThan(90);
    expect(pequeno.percentil).toBeLessThan(10);
    expect(lisboa.residentes).toBeGreaterThan(pequeno.residentes);
  });

  it("um território soma os concelhos que o compõem", () => {
    const algarve = concelhosDaRegiao("algarve").map((item) => item.codigo);
    const soma = escalaDoTerritorio({ codigos: algarve })!;
    const umSo = escalaDoTerritorio({ codigos: [LOULE] })!;
    expect(soma.residentes).toBeGreaterThan(umSo.residentes);
    // O percentil de um TERRITÓRIO compara-se com concelhos
    // individuais — é uma leitura legítima e é outra coisa. Um
    // território com dezasseis concelhos tem de estar no topo.
    expect(soma.percentil).toBe(100);
  });

  it("um território sem concelhos não devolve zero — devolve nada", () => {
    // Zero residentes lê-se como «não vive lá ninguém», que é uma
    // afirmação sobre o mundo. Ausência é uma afirmação sobre nós.
    expect(escalaDoTerritorio({ codigos: [] })).toBeNull();
    expect(escalaDoTerritorio({ codigos: ["nao-existe"] })).toBeNull();
  });
});
