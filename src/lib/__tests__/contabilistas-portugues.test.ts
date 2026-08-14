import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════
//  O PORTUGUÊS DA PLATAFORMA É DE PORTUGAL
//  ---------------------------------------------------------------------
//  A regra do CLAUDE.md diz «português de Portugal em toda a UI». Era uma
//  regra sem verificação, e escorregou: os cartões do diretório diziam
//  «Ligares-te a um contabilista» debaixo do título «O que podes fazer
//  aqui» — infinitivo flexionado onde não se flexiona.
//
//  Este teste não corrige estilo; apanha as três coisas que um falante
//  nativo nota de imediato e que uma revisão distraída deixa passar.
// ═══════════════════════════════════════════════════════════════════════

const RAIZ = join(process.cwd(), "src");

const PASTAS = [
  join(RAIZ, "app", "contabilistas"),
  join(RAIZ, "app", "contabilista"),
  join(RAIZ, "components", "contabilistas"),
  join(RAIZ, "lib", "contabilistas"),
];

function ficheiros(dir: string): string[] {
  let saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida = saida.concat(ficheiros(caminho));
    else if (/\.(ts|tsx)$/.test(nome) && !nome.endsWith(".test.ts")) saida.push(caminho);
  }
  return saida;
}

/**
 * O texto que uma pessoa lê: literais entre aspas e o texto solto do JSX.
 *
 * Os comentários ficam de fora de propósito. Também estão em português,
 * mas ninguém os lê na app — e uma regra de copy aplicada a comentários
 * dá ruído em vez de sinal.
 */
function textoVisivel(fonte: string): string[] {
  const semComentarios = fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

  const pedacos: string[] = [];

  for (const m of semComentarios.matchAll(/"([^"\\\n]{12,300})"/g)) pedacos.push(m[1]);
  // Texto entre etiquetas JSX, sem expressões nem atributos.
  for (const m of semComentarios.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}]{12,300}?)\s*</g)) {
    pedacos.push(m[1].replace(/\s+/g, " ").trim());
  }

  return pedacos.filter((t) => /[a-zà-ÿ]/.test(t) && !/^[a-z-]+$/.test(t));
}

const TODOS = PASTAS.flatMap(ficheiros).map((f) => ({
  nome: f.replace(RAIZ, "src"),
  textos: textoVisivel(readFileSync(f, "utf8")),
}));

describe("português de Portugal", () => {
  it("há mesmo texto para verificar", () => {
    // Sem isto, uma mudança na extração faria os testes seguintes passar
    // por não encontrarem nada — o pior tipo de teste verde.
    const total = TODOS.reduce((n, f) => n + f.textos.length, 0);
    expect(total).toBeGreaterThan(150);
  });

  it("não usa o gerúndio onde o português europeu usa «a» + infinitivo", () => {
    // «está a carregar», não «está carregando». É o sinal mais imediato de
    // que um texto não foi escrito por cá.
    const gerundio = /\b(est(á|ão|ás|ou|ava|avam)|vai|vais|vão|vem|vêm|continua|continuam|anda|andam)\s+\w+ndo\b/i;
    for (const { nome, textos } of TODOS) {
      for (const t of textos) {
        expect(t, `${nome}: «${t}» usa gerúndio; em pt-PT seria «a …»`).not.toMatch(gerundio);
      }
    }
  });

  it("não usa vocabulário do português do Brasil", () => {
    // Com fronteira de palavra, e não `includes`: «vocês» no plural é
    // português de Portugal corrente («entre vocês os dois»), e uma procura
    // por substring dava-o como erro por conter «você».
    const brasileirismos = [
      "você", "usuário", "usuários", "senha", "senhas", "tela", "telas",
      "arquivo", "arquivos", "celular", "planilha", "cadastro", "deletar",
      "aplicativo", "checar", "printar", "logar",
    ];
    for (const { nome, textos } of TODOS) {
      for (const t of textos) {
        const palavras = new Set(
          t.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean)
        );
        for (const palavra of brasileirismos) {
          expect(
            palavras.has(palavra),
            `${nome}: «${t}» usa «${palavra}», que não é português de Portugal`
          ).toBe(false);
        }
      }
    }
  });

  it("não flexiona o infinitivo num título de ação", () => {
    // Foi o erro do diretório: «Ligares-te a um contabilista» como nome de
    // uma ação. O infinitivo pessoal é correto como SUJEITO — «Ligares-te a
    // alguém não lhe dá acesso» —, mas não como rótulo de um cartão.
    //
    // A heurística: uma frase curta que ARRANCA com um infinitivo flexionado
    // na 2.ª pessoa. Como sujeito, essas frases continuam e trazem verbo
    // principal a seguir; como título, ficam por ali.
    const infinitivoFlexionado = /^(Ligares|Marcares|Enviares|Juntares|Seres|Teres|Fazeres|Veres|Dares|Poderes|Escolheres|Guardares|Criares)\b/;
    for (const { nome, textos } of TODOS) {
      for (const t of textos) {
        const curto = t.length < 45 && !/[.!?]/.test(t);
        if (!curto) continue;
        expect(
          t,
          `${nome}: «${t}» é um título com infinitivo flexionado; usa o infinitivo simples`
        ).not.toMatch(infinitivoFlexionado);
      }
    }
  });

  it("o cartão de fidelidade é do cliente, não do contabilista", () => {
    // «Cada consulta carimba o cartão dele» dizia o contrário do que
    // acontece: o cartão é do cliente, no programa do contabilista.
    for (const { nome, textos } of TODOS) {
      for (const t of textos) {
        expect(t, `${nome}: «${t}» — o cartão é do cliente`).not.toMatch(/carimba(s|r)? o cartão dele/i);
      }
    }
  });
});
