import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { aplicabilidade } from "@/lib/guias/aplicabilidade";
import { claimsDoGuia } from "@/lib/guias/claims";
import { fontesDoGuia } from "@/lib/guias";
import { projetarGuia, alteracoesDesde } from "@/lib/guias/dossie/projecao.servidor";
import { passoDoGuia } from "@/lib/guias/dossie/passo";
import {
  AREA_POR_SLUG, auditarFronteira, comporDossie, DOSSIE_NUNCA, IMPRESSAO_VALIDA,
  impressaoConfere, ORDEM_SECCOES, paraCsv, paraJson, paraMarkdown, paraTexto,
  pedidoDeElementos, pedidosPorPosicao, prazosParaIcs, RODAPE_DOSSIE, resolverArea,
  respostasIniciais, SECCOES_MINIMAS, acrescentarItem,
  type DossieDeGuia, type ProjecaoDeGuia, type Selecao,
} from "@/lib/guias/dossie";

// ═══════════════════════════════════════════════════════════════════════
//  O MOTOR DE DOSSIÊ DE GUIA — os seis portões do §13
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE ESTES TESTES EXISTEM                                   │
//  │                                                                     │
//  │ O dossiê é uma PROJEÇÃO de conteúdo publicado, e é essa a promessa  │
//  │ inteira: o que o contabilista lê é o que está no guia, com a fonte  │
//  │ ao lado. Uma promessa dessas parte-se em silêncio — basta alguém    │
//  │ acrescentar um resumo «para ficar mais legível», ou um campo novo   │
//  │ numa secção, e nada no build o nota.                                │
//  │                                                                     │
//  │ `dossie:fidelidade` compara item a item com a fonte publicada;      │
//  │ `dossie:fronteira` corre a lista branca e os padrões de PII sobre   │
//  │ os 169 dossiês; `dossie:projecao` exige proveniência em todos os    │
//  │ itens. Nenhum deles depende de disciplina.                          │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const SLUGS = GUIDE_MANIFESTS.map((m) => m.slug);

/** Projeta, compõe com respostas por omissão, devolve o dossiê. */
async function dossieDe(slug: string, ajuste?: (p: ProjecaoDeGuia) => void): Promise<DossieDeGuia> {
  const projecao = projetarGuia(slug);
  expect(projecao, `${slug}: sem projeção`).not.toBeNull();
  ajuste?.(projecao as ProjecaoDeGuia);
  return comporDossie(projecao as ProjecaoDeGuia, respostasIniciais(projecao as ProjecaoDeGuia), new Date("2026-09-04T10:00:00Z"));
}

describe("dossie:projecao", () => {
  it("os 169 guias produzem um dossiê válido", async () => {
    const falhas: string[] = [];
    for (const slug of SLUGS) {
      const d = await dossieDe(slug);
      if (d.versao !== 1) falhas.push(`${slug}: versão errada`);
      if (!IMPRESSAO_VALIDA.test(d.fixado.impressao)) falhas.push(`${slug}: impressão inválida`);
      for (const minima of SECCOES_MINIMAS) {
        if (!d.seccoes.some((s) => s.id === minima)) falhas.push(`${slug}: sem secção "${minima}"`);
      }
    }
    expect(falhas).toEqual([]);
  });

  it("nenhum item chega ao ecrã sem proveniência", async () => {
    const semProveniencia: string[] = [];
    for (const slug of SLUGS) {
      const d = await dossieDe(slug);
      for (const s of d.seccoes) {
        for (const i of s.itens) {
          if (!i.proveniencia?.origem) semProveniencia.push(`${slug}/${s.id}/${i.id}`);
        }
      }
    }
    expect(semProveniencia).toEqual([]);
  });

  it("as secções saem sempre pela mesma ordem", async () => {
    const d = await dossieDe("execucao-fiscal");
    const posicoes = d.seccoes.map((s) => ORDEM_SECCOES.indexOf(s.id));
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it("uma secção sem itens não nasce vazia — não nasce", async () => {
    // `avisos` só existe nos guias da expansão que trazem bloqueadores.
    const semAvisos = await dossieDe("execucao-fiscal");
    expect(semAvisos.seccoes.some((s) => s.id === "avisos")).toBe(false);
    const comAvisos = await dossieDe("imi");
    expect(comAvisos.seccoes.find((s) => s.id === "avisos")?.itens.length).toBeGreaterThan(0);
  });

  it("a impressão confere e muda quando o conteúdo muda", async () => {
    const d = await dossieDe("execucao-fiscal");
    expect(await impressaoConfere(d)).toBe(true);

    const projecao = projetarGuia("execucao-fiscal") as ProjecaoDeGuia;
    const comNota = await comporDossie(
      projecao,
      { ...respostasIniciais(projecao), nota: "Recebi uma citação de execução fiscal." },
      new Date("2026-09-04T10:00:00Z"),
    );
    expect(comNota.fixado.impressao).not.toBe(d.fixado.impressao);
  });

  it("o instante da composição NÃO entra na impressão", async () => {
    const projecao = projetarGuia("imi") as ProjecaoDeGuia;
    const r = respostasIniciais(projecao);
    const a = await comporDossie(projecao, r, new Date("2026-09-04T10:00:00Z"));
    const b = await comporDossie(projecao, r, new Date("2026-10-01T23:00:00Z"));
    expect(a.fixado.impressao).toBe(b.fixado.impressao);
    expect(a.fixado.compostoEm).not.toBe(b.fixado.compostoEm);
  });

  it("uma secção não consentida não é composta — não é escondida", async () => {
    const projecao = projetarGuia("imi") as ProjecaoDeGuia;
    const semElementos = await comporDossie(
      projecao,
      { ...respostasIniciais(projecao), incluidas: ["resumo", "base_legal"] },
      new Date("2026-09-04T10:00:00Z"),
    );
    expect(semElementos.seccoes.map((s) => s.id)).toEqual(["resumo", "base_legal"]);
    expect(semElementos.consentimento.seccoes).toEqual(["resumo", "base_legal"]);
  });

  it("o histórico é calculado na leitura, não na composição", async () => {
    const d = await dossieDe("iva-recibos-verdes");
    expect(d.seccoes.some((s) => s.id === "historico")).toBe(false);
    // Fixado num ponto anterior às correções de agosto de 2026.
    expect(alteracoesDesde("iva-recibos-verdes", "2026-07-01").length).toBeGreaterThan(0);
  });
});

describe("dossie:fidelidade", () => {
  it("o texto de cada item é a string publicada, sem reescrita", async () => {
    const divergencias: string[] = [];

    for (const slug of SLUGS) {
      const d = await dossieDe(slug);
      const a = aplicabilidade(slug);
      const claims = claimsDoGuia(slug);
      const fontes = fontesDoGuia(slug).oficiais;

      for (const s of d.seccoes) {
        for (const i of s.itens) {
          if (s.id === "elementos" && !a?.checklist.includes(i.texto)) {
            divergencias.push(`${slug}/elementos: "${i.texto.slice(0, 40)}…" não está na checklist publicada`);
          }
          if (s.id === "aplicabilidade") {
            const publicado = [...(a?.aplicaSe ?? []), ...(a?.naoAplicaSe ?? [])];
            if (!publicado.includes(i.texto)) {
              divergencias.push(`${slug}/aplicabilidade: "${i.texto.slice(0, 40)}…" não é um critério publicado`);
            }
          }
          if (s.id === "julgamento" && !claims.some((c) => c.statement === i.texto)) {
            divergencias.push(`${slug}/julgamento: "${i.texto.slice(0, 40)}…" não é uma afirmação registada`);
          }
          if (s.id === "base_legal" && i.fonte && !fontes.some((f) => f.id === i.fonte?.fonteId)) {
            divergencias.push(`${slug}/base_legal: fonte "${i.fonte.fonteId}" não é do guia`);
          }
        }
      }
    }

    expect(divergencias).toEqual([]);
  });

  it("a secção de julgamento traz só afirmações que exigem revisão, por severidade", async () => {
    const d = await dossieDe("recuperar-iva-incobravel");
    const julgamento = d.seccoes.find((s) => s.id === "julgamento");
    expect(julgamento).toBeDefined();
    const pesos = (julgamento?.itens ?? []).map((i) => i.peso);
    const ordem = { critical: 0, high: 1, normal: 2 } as const;
    expect(pesos.map((p) => ordem[p as keyof typeof ordem])).toEqual(
      [...pesos].map((p) => ordem[p as keyof typeof ordem]).sort((x, y) => x - y),
    );
    for (const i of julgamento?.itens ?? []) {
      expect(i.proveniencia.origem).toBe("afirmacao");
      if (i.proveniencia.origem === "afirmacao") {
        expect(i.proveniencia.confianca).toBe("review_required");
        expect(i.proveniencia.fonteIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("os valores retidos pelo pacote nunca entram nos números", async () => {
    // `dadosDoGuia` já filtra os `porConfirmar`; o que aqui se garante é
    // que a projeção usa esse filtro e não a lista em bruto.
    const fugas: string[] = [];
    for (const slug of SLUGS) {
      const d = await dossieDe(slug);
      for (const i of d.seccoes.find((s) => s.id === "numeros")?.itens ?? []) {
        if (/por confirmar|a confirmar/i.test(i.texto)) fugas.push(`${slug}: ${i.texto}`);
      }
    }
    expect(fugas).toEqual([]);
  });
});

describe("dossie:fronteira", () => {
  it("nenhum dossiê sai da lista branca nem transporta identificação", async () => {
    const achados: string[] = [];
    for (const slug of SLUGS) {
      const d = await dossieDe(slug);
      for (const a of auditarFronteira(d)) achados.push(`${slug}/${a.seccao}/${a.itemId}: ${a.problema}`);
    }
    expect(achados).toEqual([]);
  });

  it("a auditoria apanha mesmo um campo a mais e um NIF", async () => {
    const d = await dossieDe("imi");
    const sujo = structuredClone(d) as DossieDeGuia;
    (sujo.seccoes[0].itens[0] as unknown as Record<string, unknown>).segredo = "x";
    sujo.seccoes[0].itens[0].texto = "O NIF é 501442600.";
    const problemas = auditarFronteira(sujo).map((a) => a.problema);
    expect(problemas.some((p) => p.includes("segredo"))).toBe(true);
    expect(problemas.some((p) => p.includes("NIF"))).toBe(true);
  });

  it("nenhum módulo de cliente do dossiê importa um catálogo", () => {
    // A regra de `atalhos.servidor.ts`: um componente de cliente recebe
    // DADOS, não importa CATÁLOGOS. Aqui verifica-se o inverso — que os
    // módulos do motor que o cliente pode importar não puxam os catálogos.
    const PESADOS = [
      "guias/expansao/catalogo", "guias/expansao/conteudo", "guias/expansao/dados-motor",
      "guias/expansao/derivar", "guias/manifests", "guias/claims", "guias/legal-sources",
      "guias/aplicabilidade", "lib/prazos",
    ];
    const IMPORT_ESTATICO = /^\s*import\s+(?!type\s)(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm;

    const pasta = join(SRC, "lib", "guias", "dossie");
    const ficheiros: string[] = [];
    const percorrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) percorrer(caminho);
        else if (nome.endsWith(".ts") && !nome.endsWith(".servidor.ts")) ficheiros.push(caminho);
      }
    };
    percorrer(pasta);

    const violacoes: string[] = [];
    for (const f of ficheiros) {
      const codigo = readFileSync(f, "utf8");
      for (const m of codigo.matchAll(IMPORT_ESTATICO)) {
        const alvo = m[1];
        if (PESADOS.some((p) => alvo.includes(p))) {
          violacoes.push(`${relative(SRC, f)} importa ${alvo}`);
        }
        if (alvo.includes("projecao.servidor")) {
          violacoes.push(`${relative(SRC, f)} importa a projeção do servidor`);
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  it("o barril público não reexporta a projeção do servidor", () => {
    const barril = readFileSync(join(SRC, "lib", "guias", "dossie", "index.ts"), "utf8");
    expect(barril).not.toMatch(/export\s+\*\s+from\s+["']\.\/projecao\.servidor["']/);
  });
});

describe("dossie:area", () => {
  it("os 169 guias resolvem uma área do caso", () => {
    const semArea = GUIDE_MANIFESTS.filter((m) => !resolverArea(m.slug, m.hub));
    expect(semArea.map((m) => m.slug)).toEqual([]);
  });

  it("nenhuma exceção por slug aponta para um guia que já não existe", () => {
    const conhecidos = new Set(SLUGS);
    const orfas = Object.keys(AREA_POR_SLUG).filter((s) => !conhecidos.has(s));
    expect(orfas).toEqual([]);
  });

  it("os cinco hubs sem resposta única resolvem todos por slug ou caem em «outro»", () => {
    const porSlug: string[] = ["casa", "prazos", "direitos", "encerrar", "profissao"];
    const semDecisao = GUIDE_MANIFESTS.filter(
      (m) => porSlug.includes(m.hub) && !AREA_POR_SLUG[m.slug],
    );
    // Cair em «outro» é uma decisão legítima, mas tem de ser DECLARADA:
    // um guia destes hubs sem entrada na tabela é um esquecimento.
    expect(semDecisao.map((m) => m.slug)).toEqual([]);
  });
});

describe("dossie:formatos", () => {
  it("os quatro formatos levam o rodapé obrigatório", async () => {
    const d = await dossieDe("execucao-fiscal");
    expect(paraMarkdown(d)).toContain(RODAPE_DOSSIE);
    expect(paraTexto(d)).toContain(RODAPE_DOSSIE);
    expect(paraCsv(d)).toContain(RODAPE_DOSSIE.slice(0, 30));
    expect(paraJson(d)).toContain(RODAPE_DOSSIE);
  });

  it("o markdown identifica a versão lida e a impressão", async () => {
    const d = await dossieDe("execucao-fiscal");
    const md = paraMarkdown(d);
    expect(md).toContain("versão de 26/07/2026");
    expect(md).toContain(d.fixado.impressao.slice(0, 12));
  });

  it("a seleção recorta — e uma secção sem itens selecionados desaparece", async () => {
    const d = await dossieDe("execucao-fiscal");
    const elementos = d.seccoes.find((s) => s.id === "elementos");
    const selecao: Selecao = { itens: new Set([elementos?.itens[0]?.id ?? ""]) };
    const md = paraMarkdown(d, selecao);
    expect(md).toContain(elementos?.itens[0]?.texto ?? "");
    expect(md).not.toContain("## Base legal");
  });

  it("o CSV leva BOM, CRLF e uma linha por item", async () => {
    const d = await dossieDe("execucao-fiscal");
    const csv = paraCsv(d);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
    const total = d.seccoes.reduce((n, s) => n + s.itens.length, 0);
    // cabeçalho + itens + linha vazia + rodapé
    expect(csv.trimEnd().split("\r\n").length).toBe(total + 3);
  });

  it("o ICS só leva prazos, com CRLF e um UID estável", async () => {
    const d = await dossieDe("juros-de-mora");
    const ics = prazosParaIcs(d, undefined, new Date("2026-09-04T10:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics).toContain(`dossie-${d.fixado.impressao.slice(0, 16)}`);
  });

  it("o JSON recusa exportar um dossiê fora da fronteira", async () => {
    const d = await dossieDe("imi");
    const sujo = structuredClone(d) as DossieDeGuia;
    sujo.seccoes[0].itens[0].texto = "contacto: alguem@exemplo.pt";
    expect(() => paraJson(sujo)).toThrow(/fora da fronteira/);
  });
});

describe("dossie:pedido", () => {
  it("a seleção vira uma lista numerada de 1 a n", async () => {
    const d = await dossieDe("execucao-fiscal");
    const elementos = d.seccoes.find((s) => s.id === "elementos");
    const ids = (elementos?.itens ?? []).slice(0, 3).map((i) => i.id);
    const pedido = pedidoDeElementos(d, { itens: new Set(ids) }, {
      ref: "CASO-1", agora: new Date("2026-09-04T10:00:00Z"), id: "p1",
    });
    expect(pedido.itens.map((i) => i.n)).toEqual([1, 2, 3]);
    expect(pedido.itens.every((i) => i.origem === "guia")).toBe(true);
    expect(pedido.dossie.impressao).toBe(d.fixado.impressao);
  });

  it("um item escrito pelo profissional fica marcado como tal", async () => {
    const d = await dossieDe("execucao-fiscal");
    const base = pedidoDeElementos(d, { itens: new Set<string>() }, { ref: "CASO-1", id: "p1" });
    const com = acrescentarItem(base, "Extrato bancário dos últimos três meses.");
    expect(com.itens.at(-1)?.origem).toBe("profissional");
    expect(com.itens.at(-1)?.itemId).toBeUndefined();
  });

  it("sem prazos inventados", async () => {
    const d = await dossieDe("execucao-fiscal");
    const elementos = d.seccoes.find((s) => s.id === "elementos");
    const pedido = pedidoDeElementos(d, { itens: new Set([elementos?.itens[0]?.id ?? ""]) }, { ref: "X" });
    expect(pedido.itens[0]?.prazo).toBeUndefined();
  });

  it("a volta chega à posição certa da checklist do guia", async () => {
    const d = await dossieDe("execucao-fiscal");
    const elementos = d.seccoes.find((s) => s.id === "elementos");
    const pedido = pedidoDeElementos(d, { itens: new Set([elementos?.itens[2]?.id ?? ""]) }, { ref: "X" });
    const mapa = pedidosPorPosicao([pedido]);
    expect(mapa.has(2)).toBe(true);
    expect(mapa.get(2)?.texto).toBe(elementos?.itens[2]?.texto);
  });

  it("o resumo não é matéria de pedido", async () => {
    const d = await dossieDe("execucao-fiscal");
    const resumo = d.seccoes.find((s) => s.id === "resumo");
    const pedido = pedidoDeElementos(d, { itens: new Set(resumo?.itens.map((i) => i.id)) }, { ref: "X" });
    expect(pedido.itens).toEqual([]);
  });
});

describe("dossie:passo", () => {
  const passos = GUIDE_MANIFESTS.map((m) => {
    const p = projetarGuia(m.slug) as ProjecaoDeGuia;
    return {
      slug: m.slug,
      temFiz: Boolean(m.fizAction),
      porRever: p.sinais.afirmacoesPorRever,
      passo: passoDoGuia({
        categoria: m.categoria,
        arquetipo: m.archetype,
        estado: m.status,
        afirmacoesPorRever: p.sinais.afirmacoesPorRever,
        temAcaoFiz: Boolean(m.fizAction),
        temMateria: p.sinais.elementos + p.sinais.perguntas + p.sinais.fontes > 0,
      }),
    };
  });

  it("nenhum guia fica sem passo seguinte — o achado A3, fechado", () => {
    // 112 dos 169 não tinham ação nenhuma: `FizNextStep` devolvia `null` e
    // dois terços do catálogo acabavam em «fontes» e mais nada.
    expect(passos.filter((p) => p.passo.principal === "nenhum").map((p) => p.slug)).toEqual([]);
  });

  it("nunca duas ações do mesmo peso", () => {
    for (const p of passos) {
      expect(p.passo.principal).not.toBe(p.passo.secundario);
      if (p.passo.secundario === "fiz") expect(p.temFiz).toBe(true);
    }
  });

  it("um guia que marca matéria dependente do caso concreto manda para o contabilista", () => {
    const errados = passos.filter((p) => p.porRever > 0 && p.passo.principal !== "contabilista");
    expect(errados.map((p) => p.slug)).toEqual([]);
  });

  it("a FIZ só fica em primeiro onde há capacidade acordada", () => {
    const semCapacidade = passos.filter((p) => p.passo.principal === "fiz" && !p.temFiz);
    expect(semCapacidade.map((p) => p.slug)).toEqual([]);
  });

  it("o motivo é sempre legível, em pt-PT, e nunca vazio", () => {
    for (const p of passos) {
      expect(p.passo.motivo.length, p.slug).toBeGreaterThan(20);
      expect(p.passo.motivo).not.toMatch(/[a-z]_[a-z]/); // nada de chaves internas
    }
  });
});

describe("dossie:hierarquia", () => {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ SER MAIS LEVE NÃO É SER INVISÍVEL                                  │
  // │                                                                   │
  // │ A segunda saída de um Guia nasceu como uma linha de texto          │
  // │ sublinhada, por baixo de um cartão amarelo com um botão cheio.     │
  // │ Cumpria a regra («nunca duas ações do mesmo peso») e falhava o     │
  // │ objetivo: existia no HTML e não existia no ecrã.                   │
  // │                                                                   │
  // │ A regra certa tem dois lados, e este teste guarda os dois: quem    │
  // │ lidera tem porte de líder, e quem segue tem porte de segundo —     │
  // │ mas os dois são cartões, com título, números e botão.             │
  // └───────────────────────────────────────────────────────────────────┘
  const ler = (p: string) => readFileSync(join(SRC, p), "utf8");
  const conta = (texto: string, agulha: string) => texto.split(agulha).length - 1;

  const DOSSIE = ler(join("components", "guias", "dossie", "DossieDoGuia.tsx"));
  const PASSO = ler(join("components", "guias", "ProximoPassoDoGuia.tsx"));
  const FIZ = ler(join("components", "fiz", "FizNextStep.tsx"));

  it("cada saída tem um líder e, quando há segunda, um segundo", () => {
    // Dois ramos — FIZ à frente, contabilista à frente — e em cada um
    // exatamente uma ação com porte de líder.
    expect(conta(PASSO, 'variante="principal"')).toBe(2);
    expect(conta(PASSO, 'variante="secundaria"')).toBe(2);
  });

  it("a variante secundária do dossiê é um cartão, não uma linha sublinhada", () => {
    expect(DOSSIE).toContain("<section");
    // O botão que abre a folha existe nas duas variantes — e nunca como
    // texto sublinhado, que foi o que a tornou invisível.
    expect(DOSSIE).not.toMatch(/onClick=\{abrir\}[\s\S]{0,200}?underline/);
    expect(conta(DOSSIE, "onClick={abrir}")).toBe(2);
  });

  it("os dois botões não têm o mesmo peso", () => {
    // O líder leva o botão cheio (sem `variant`, que é `primary`); o
    // segundo leva o de contorno.
    expect(DOSSIE).toContain('<Button variant="secondary" size="sm" onClick={abrir}>');
    expect(DOSSIE).toContain("<Button onClick={abrir}>");
  });

  it("o líder do dossiê tem o mesmo porte do cartão da FIZ", () => {
    // Tinta própria, `h2` e `text-xl` — como o cartão da FIZ. Sem isto, a
    // rota escolhida em 147 guias aparecia mais fraca do que a alternativa.
    expect(DOSSIE).toContain("bg-brand-light");
    expect(DOSSIE).toMatch(/<h2[\s\S]{0,200}?font-display text-xl font-semibold/);
    expect(FIZ).toContain("font-display text-xl font-semibold text-ink");
  });

  it("a FIZ sabe recolher — e a divulgação não recolhe com ela", () => {
    expect(FIZ).toContain('variante?: "principal" | "secundaria"');
    // A divulgação da relação comercial é uma só, fora de qualquer ramo:
    // «rotular antes do clique» não é uma questão de porte.
    expect(conta(FIZ, "<FizDisclosure")).toBe(1);
  });
});

describe("dossie:copy", () => {
  it("as fronteiras estão escritas em código e não só no relatório", () => {
    expect(DOSSIE_NUNCA.length).toBeGreaterThanOrEqual(8);
    expect(DOSSIE_NUNCA.join(" ")).toMatch(/parecer/i);
    expect(DOSSIE_NUNCA.join(" ")).toMatch(/NIF/);
  });

  it("nenhuma saída promete parecer, submissão ou custo", async () => {
    const PROIBIDAS = [
      /\bé um parecer\b/i, /\bfoi submetid/i, /\bentregue à AT\b/i,
      /\bvalidad[oa] pela Autoridade Tributária\b/i, /\bcusta \d/i, /\bsó no Plus\b/i,
    ];
    const d = await dossieDe("execucao-fiscal");
    for (const saida of [paraMarkdown(d), paraTexto(d), paraCsv(d), paraJson(d)]) {
      for (const p of PROIBIDAS) expect(saida).not.toMatch(p);
    }
  });

  it("o rodapé diz o que o dossiê não é", () => {
    expect(RODAPE_DOSSIE).toMatch(/Não é parecer/);
    expect(RODAPE_DOSSIE).toMatch(/contabilista certificado/);
  });

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ QUEM ABRE SEM CONTA É O CONTABILISTA, NÃO A PESSOA                 │
  // │                                                                   │
  // │ O cartão dizia «Gratuito, sem plano e sem conta obrigatória» por   │
  // │ baixo de «Levar este caso a um contabilista». Lia-se como se       │
  // │ ligar-se a um contabilista não exigisse conta — e exige, nos TRÊS  │
  // │ destinos:                                                         │
  // │                                                                   │
  // │   · D1 só aparece com vínculo ativo, que exige sessão;             │
  // │   · D2 diz «Entrar e preparar o caso» a quem não tem sessão;       │
  // │   · D3 só é composto com `p.autenticado`, e a ligação não podia    │
  // │     nascer sem isso: `dossie_ligacoes.cliente_id` é NOT NULL       │
  // │     REFERENCES auth.users, com `WITH CHECK (cliente_id =           │
  // │     auth.uid())` no INSERT.                                       │
  // │                                                                   │
  // │ Sem conta abre-se o dossiê do OUTRO lado (é essa a promessa de     │
  // │ D3) e leva-se o FICHEIRO. São duas coisas, e a frase juntava-as.   │
  // └───────────────────────────────────────────────────────────────────┘
  it("não promete ligar a um contabilista sem conta — os três destinos exigem sessão", () => {
    const DOSSIE = readFileSync(
      join(SRC, "components", "guias", "dossie", "DossieDoGuia.tsx"),
      "utf8",
    );

    expect(DOSSIE).not.toMatch(/sem conta obrigatória/i);
    expect(DOSSIE).not.toMatch(/sem (sequer )?criar conta/i);

    // Onde a copy fala de dispensar conta, tem de estar a falar do
    // FICHEIRO — que é a única coisa que se leva sem sessão.
    const frases = DOSSIE.split("\n")
      .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"))
      .filter((l) => /\bconta\b/i.test(l));
    expect(frases.length).toBeGreaterThan(0);
    for (const frase of frases) expect(frase).toMatch(/ficheiro/i);
  });
});
