// ═══════════════════════════════════════════════════════════════════════
//  O ESTÚDIO NA APLICAÇÃO — persistência, partilha e regressão
//  ---------------------------------------------------------------------
//  §32.3 do relatório, mais os critérios de aceitação do §34 que se podem
//  verificar sem navegador.
//
//  A parte que mais interessa está no fim: a REGRESSÃO. Um módulo novo
//  que parta as três ferramentas que já existiam teria falhado mesmo
//  fazendo tudo o resto bem.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  analisarNegocio,
  contextoNegocioVazio,
  conteudoPartilhaNegocio,
  novaOferta,
  novoCustoEstrutura,
  type ContextoNegocio,
  type OfertaNegocio,
} from "@/lib/negocio";
import { CAMPOS_PARTILHA, ROTULO_PARTILHA, sanitizarConteudoPartilha } from "@/lib/contabilistas/vinculo";
import { DOMINIOS } from "@/lib/store/cofre";
import { META_TIPO_CENARIO, TIPOS_CENARIO } from "@/lib/store/cenarios";
import { FERRAMENTA_DO_FOCO } from "@/components/foco/focos";

const raiz = (p: string) => join(process.cwd(), p);
const ler = (p: string) => readFileSync(raiz(p), "utf8");

function negocioDeTeste(): ContextoNegocio {
  const oferta: OfertaNegocio = {
    ...novaOferta("produto_revenda", { nome: "Camisola", volumeMes: 30 }),
    respondidos: ["custo-direto", "volume"],
  };
  const base = contextoNegocioVazio("ja_vendo");
  return {
    ...base,
    nome: "Estúdio Norte",
    ofertas: [oferta],
    estrutura: { ...base.estrutura, overheadMensal: [novoCustoEstrutura("contabilidade", "Contabilidade", 150)] },
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  PERSISTÊNCIA
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:persistencia", () => {
  beforeEach(() => {
    // O store é client-only e escreve por `window.localStorage`. Um duplo
    // em memória chega: o que se testa é o CONTRATO (o que se aceita ler
    // e o que se recusa), não a implementação do browser.
    const memoria = new Map<string, string>();
    const ls = {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
      removeItem: (k: string) => void memoria.delete(k),
      clear: () => memoria.clear(),
      key: (i: number) => [...memoria.keys()][i] ?? null,
      get length() {
        return memoria.size;
      },
    } as Storage;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: ls },
      configurable: true,
      writable: true,
    });
  });

  it("o rascunho tem cofre próprio — não vive numa chave global", async () => {
    // Num browser partilhado, uma chave global mostrava o plano de
    // negócios de quem entrou antes. É o defeito que `cofre.ts` fecha.
    expect(DOMINIOS.negocio).toBeDefined();
    expect(DOMINIOS.negocio).toContain("recibocerto:negocio");
  });

  it("grava e relê o mesmo contexto", async () => {
    const { gravarRascunhoNegocio, lerRascunhoNegocio } = await import("@/lib/store/negocio");
    const c = negocioDeTeste();
    gravarRascunhoNegocio(c);
    const lido = lerRascunhoNegocio();
    expect(lido?.id).toBe(c.id);
    expect(lido?.ofertas).toHaveLength(1);
    expect(lido?.nome).toBe("Estúdio Norte");
  });

  it("recusa um rascunho corrompido em vez de rebentar ao abrir", async () => {
    const { lerRascunhoNegocio } = await import("@/lib/store/negocio");
    const { gravarChave } = await import("@/lib/store/persistencia");
    const { chaveAtiva } = await import("@/lib/store/cofre");

    for (const lixo of [
      "não é json",
      JSON.stringify({ versao: 99, contexto: {} }),
      // Uma oferta sem `pricing` faria `precificar()` rebentar no
      // primeiro acesso, e o ecrã ficava em branco sem explicação.
      JSON.stringify({ versao: 1, contexto: { versao: 1, id: "x", ofertas: [{ id: "a" }] } }),
      JSON.stringify({ versao: 1, contexto: { versao: 1, id: "x", ofertas: "nope" } }),
    ]) {
      gravarChave(chaveAtiva("negocio"), lixo);
      expect(lerRascunhoNegocio()).toBeNull();
    }
  });

  it("limpar apaga mesmo", async () => {
    const { gravarRascunhoNegocio, lerRascunhoNegocio, limparRascunhoNegocio, haRascunhoNegocio } = await import(
      "@/lib/store/negocio"
    );
    gravarRascunhoNegocio(negocioDeTeste());
    expect(haRascunhoNegocio()).toBe(true);
    limparRascunhoNegocio();
    expect(lerRascunhoNegocio()).toBeNull();
    expect(haRascunhoNegocio()).toBe(false);
  });

  it("`negocio` é um tipo de cenário de primeira classe", () => {
    expect(TIPOS_CENARIO).toContain("negocio");
    expect(META_TIPO_CENARIO.negocio.label).toBe("Projeto de negócio");
    expect(META_TIPO_CENARIO.negocio.rota).toBe("/dashboard/negocio");
  });

  it("o rascunho local NÃO é gravado por nenhum caminho de nuvem", () => {
    const src = ler("src/lib/store/negocio.ts");
    // Se um dia alguém acrescentar aqui um cliente de nuvem, o autosave
    // local passa a ser sincronização — que é exatamente o que o §24
    // proíbe fazer sem ação explícita.
    expect(src).not.toContain("supabase");
    expect(src).not.toContain("fetch(");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  PARTILHA — a fronteira mais sensível do módulo
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:partilha", () => {
  const contexto = negocioDeTeste();
  const negocio = analisarNegocio(contexto);

  it("todas as chaves produzidas estão na lista branca", () => {
    // Uma chave a mais é removida em silêncio pelo sanitizador — o que é
    // o comportamento certo, mas significa que o campo nunca chegaria e
    // ninguém daria por isso.
    const conteudo = conteudoPartilhaNegocio(negocio, contexto, "uma nota");
    const permitidos = CAMPOS_PARTILHA.plano_negocio;
    for (const chave of Object.keys(conteudo)) {
      expect(permitidos, `chave «${chave}» fora da lista branca`).toContain(chave);
    }
  });

  it("sobrevive ao sanitizador sem perder nada nem dar erro", () => {
    const conteudo = conteudoPartilhaNegocio(negocio, contexto);
    const limpo = sanitizarConteudoPartilha("plano_negocio", conteudo);
    expect(limpo.erro).toBeNull();
    expect(limpo.removidos).toEqual([]);
    expect(Object.keys(limpo.conteudo).sort()).toEqual(Object.keys(conteudo).sort());
  });

  it("a lista branca NÃO autoriza custos, margens nem preços", () => {
    // O teste que impede o alargamento por conveniência: se um dia
    // alguém precisar de mandar a margem ao contabilista, tem de mexer
    // aqui — e ler porque é que ela não estava lá.
    const proibidos = ["custo", "custos", "margem", "markup", "preco", "precos", "pvp", "volume", "volumes"];
    for (const campo of CAMPOS_PARTILHA.plano_negocio) {
      expect(proibidos, `«${campo}» não devia estar autorizado`).not.toContain(campo.toLowerCase());
    }
  });

  it("tem rótulo, como todos os outros tipos", () => {
    expect(ROTULO_PARTILHA.plano_negocio).toBe("Projeto de negócio");
    for (const tipo of Object.keys(CAMPOS_PARTILHA)) {
      expect(ROTULO_PARTILHA[tipo as keyof typeof ROTULO_PARTILHA]).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  MEDIÇÃO — §25: nenhum número do negócio
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:medicao", () => {
  const src = ler("src/components/negocio/medicao.ts");

  it("usa `tool_id = construir-negocio` e eventos já existentes", () => {
    expect(src).toContain("construir-negocio");
    for (const evento of ["simulator_start", "simulator_step", "simulator_complete", "result_view"]) {
      expect(src).toContain(evento);
    }
  });

  it("não inventa eventos fora do catálogo", async () => {
    const { eventoConhecido } = await import("@/lib/analytics/eventos");
    const usados = [...src.matchAll(/registar\(\s*"([a-z_0-9]+)"/g)].map((m) => m[1]);
    expect(usados.length).toBeGreaterThan(0);
    for (const e of usados) expect(eventoConhecido(e), `evento «${e}» não está no catálogo`).toBe(true);
  });

  it("nenhum valor do negócio entra na medição", () => {
    // Os campos que o §25 proíbe explicitamente. Procuram-se como
    // PROPRIEDADES enviadas, não como palavras num comentário.
    for (const proibido of [
      "receita:", "custo:", "custos:", "margem:", "preco:", "volume:",
      "faturacao:", "nome:", "resultado:",
    ]) {
      expect(src, `«${proibido}» não pode viajar na medição`).not.toContain(proibido);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A SUPERFÍCIE EMBUTIDA DA CALCULADORA DE PREÇO
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:superficie-preco", () => {
  const src = ler("src/components/precos/SimuladorPreco.tsx");

  it("a calculadora não foi copiada — é a mesma, com uma superfície", () => {
    expect(src).toContain("SuperficiePreco");
    expect(src).toContain('superficie = "standalone"');
    // Nenhum ficheiro do estúdio pode ter uma segunda cópia dela.
    const studio = ler("src/components/negocio/NegocioStudio.tsx");
    expect(studio).toContain('import("@/components/precos/SimuladorPreco")');
    expect(studio).not.toContain("<iframe");
  });

  it("embutida, não escreve o URL nem o cofre da ferramenta pública", () => {
    // As três guardas. Se alguma desaparecer, editar uma oferta dentro do
    // estúdio passa a esmagar o rascunho de quem está a meio de um
    // cálculo na página pública.
    expect(src).toMatch(/if \(embutido\) return;[\s\S]{0,200}const url = new URL/);
    expect(src).toContain("if (!embutido) limparContextoPreco();");
    expect(src).toMatch(/if \(embutido\) \{[\s\S]{0,400}aoMudar\?\.\(/);
  });

  it("o estúdio não duplica o motor de preço", () => {
    const studio = ler("src/components/negocio/NegocioStudio.tsx");
    expect(studio).not.toContain("precoPorMargem");
    expect(studio).not.toContain("precificar(");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  REGRESSÃO — o que já existia continua onde estava (§34.19-20)
// ═══════════════════════════════════════════════════════════════════════

describe("negocio:regressao", () => {
  it("as três ferramentas anteriores continuam a existir", () => {
    for (const rota of [
      "src/app/ferramentas/calcular-preco/page.tsx",
      "src/app/ferramentas/simulador-empresa/page.tsx",
      "src/app/ferramentas/comparar-regimes/page.tsx",
      "src/app/dashboard/empresa/page.tsx",
      "src/app/dashboard/precos/page.tsx",
    ]) {
      expect(() => ler(rota), `${rota} desapareceu`).not.toThrow();
    }
  });

  it("o simulador de empresa continua acessível a partir do modo empresa", () => {
    // Critério de aceitação n.º 20. Quem já sabe a faturação não tem de
    // construir um modelo comercial para lá chegar.
    // O href estava escrito à mão em `src/components/Hero.tsx`. Esse hero deu
    // lugar à bússola, e o destino passou a sair da tabela dos focos — que é
    // a fonte de verdade e alimenta o painel da resposta.
    const seccao = ler("src/components/CalculadoraSecao.tsx");
    expect(FERRAMENTA_DO_FOCO.empresa).toBe("/ferramentas/simulador-empresa");
    expect(ler("src/components/foco/HeroBussola.tsx")).toContain("href={focoAberto.ferramenta}");
    expect(seccao).toContain("/ferramentas/simulador-empresa");
  });

  it("o estúdio substitui a ENTRADA do perfil empresa, não o simulador", () => {
    const seccao = ler("src/components/CalculadoraSecao.tsx");
    expect(seccao).toContain("<NegocioStudio key=\"empresa\" />");
    // Os outros perfis não foram tocados.
    expect(seccao).toContain("<SimuladorIntegrado key=\"independente\" vista=\"rv\" />");
    expect(seccao).toContain("<ComparadorCenarios key=\"comparar\" />");
  });

  it("a página do estúdio no dashboard está na navegação", () => {
    const layout = ler("src/app/dashboard/layout.tsx");
    expect(layout).toContain("/dashboard/negocio");
    expect(() => ler("src/app/dashboard/negocio/page.tsx")).not.toThrow();
  });

  it("os preços guardados continuam locais", () => {
    const src = ler("src/lib/store/precos-guardados.ts");
    expect(src).not.toContain("supabase");
  });
});
