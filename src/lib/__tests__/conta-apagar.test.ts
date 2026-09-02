import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALVOS, alvoPorId, confirmacaoValida, recortarAoPrefixo, normalizarConfirmacao,
} from "@/lib/conta/apagar";

const RAIZ = process.cwd();
const ler = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const ROTA = "src/app/api/conta/apagar/route.ts";
const UI = "src/components/conta/ZonaDeRisco.tsx";

/**
 * O ficheiro sem os comentários.
 *
 * Estes ficheiros explicam por escrito o defeito que corrigiram — «era
 * `esvaziarCofre`», «começava por `if (!user) return null`». Procurar o
 * texto no ficheiro inteiro apanha a explicação e dá o defeito como
 * presente. O que interessa é o código.
 */
const codigo = (rel: string) =>
  ler(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("apagar: o campo só aceita a frase pedida", () => {
  const alvo = alvoPorId("selecao")!;

  it("aceita a frase, letra a letra", () => {
    expect(recortarAoPrefixo(alvo, "a")).toBe("a");
    expect(recortarAoPrefixo(alvo, "apagar")).toBe("apagar");
    expect(recortarAoPrefixo(alvo, "apagar o que escolhi")).toBe("apagar o que escolhi");
  });

  it("uma tecla errada simplesmente não entra", () => {
    // Não há erro a mostrar porque não chega a haver erro.
    expect(recortarAoPrefixo(alvo, "apagax")).toBe("apaga");
    expect(recortarAoPrefixo(alvo, "x")).toBe("");
  });

  it("colar outra coisa qualquer não passa a barreira", () => {
    expect(recortarAoPrefixo(alvo, "apagar tudo agora")).toBe("apagar ");
    expect(recortarAoPrefixo(alvo, "qualquer coisa colada")).toBe("");
  });

  it("não deixa escrever para além da frase", () => {
    expect(recortarAoPrefixo(alvo, "apagar o que escolhi e mais")).toBe("apagar o que escolhi");
  });

  it("corrige acentos e caixa de quem escreve à pressa", () => {
    const conta = alvoPorId("conta")!;
    expect(recortarAoPrefixo(conta, "APAGAR A MÍNHA CONTA")).toBe("apagar a minha conta");
  });
});

describe("apagar: a confirmação", () => {
  it("a frase certa passa", () => {
    for (const a of ALVOS) expect(confirmacaoValida(a, a.confirmacao), a.id).toBe(true);
  });

  it("uma frase de outro alvo não passa", () => {
    const selecao = alvoPorId("selecao")!;
    const conta = alvoPorId("conta")!;
    expect(confirmacaoValida(conta, selecao.confirmacao)).toBe(false);
    expect(confirmacaoValida(selecao, conta.confirmacao)).toBe(false);
  });

  it("a frase da seleção descreve a seleção, e não «todos os dados»", () => {
    // ⚠️ Escolher UMA coisa pedia para escrever «apagar todos os dados». A
    // frase de confirmação descrevia mal a ação que ia acontecer, o que é o
    // contrário do que uma confirmação serve para fazer.
    const selecao = alvoPorId("selecao")!;
    expect(selecao.confirmacao).toBe("apagar o que escolhi");
    expect(selecao.confirmacao).not.toMatch(/todos os dados/);
  });

  it("vazio nunca passa", () => {
    for (const a of ALVOS) expect(confirmacaoValida(a, "   "), a.id).toBe(false);
  });

  it("cada alvo tem uma frase distinta", () => {
    const frases = ALVOS.map((a) => normalizarConfirmacao(a.confirmacao));
    expect(new Set(frases).size).toBe(frases.length);
  });

  it("a frase da conta é a mais explícita de todas", () => {
    expect(alvoPorId("conta")!.confirmacao).toMatch(/minha conta/);
  });
});

describe("apagar: a rota não confia no cliente", () => {
  it("o user_id vem do token, e a rota nem sequer o passa adiante", () => {
    // Aceitar um id do corpo daria a qualquer pessoa autenticada a
    // capacidade de apagar os dados de outra. Desde a migração 049 a rota
    // já nem tem por onde enganar-se: `apagar_conjuntos` não recebe id
    // nenhum — lê `auth.uid()` do lado da base de dados.
    const r = ler(ROTA);
    expect(r).toContain("obterUtilizador(req)");
    expect(r).toContain("apagar_conjuntos");
    expect(r, "o corpo não pode trazer um user_id").not.toMatch(/corpo\??\.\s*user_id/);
    expect(r, "a RPC não pode receber um utilizador por parâmetro")
      .not.toMatch(/p_user(_id)?:/);
  });

  it("apaga numa transação só, e não tabela a tabela", () => {
    // Antes eram DELETE em série: falhar no terceiro deixava os dois
    // primeiros apagados, e a resposta dizia que nada se tinha perdido.
    const r = ler(ROTA);
    expect(r, "nenhum DELETE direto na rota").not.toMatch(/\.from\([^)]+\)\s*\.delete\(/);
  });

  it("os ficheiros são perguntados ANTES de as linhas saírem", () => {
    // Depois de o vínculo desaparecer não há como saber que caminhos lhe
    // pertenciam, e os bytes ficavam no armazenamento para sempre.
    // As chamadas, e não as menções: o cabeçalho do ficheiro explica a
    // ordem por escrito, e procurar o nome apanhava a explicação primeiro.
    const r = ler(ROTA);
    const pergunta = r.indexOf('rpc("ficheiros_do_utilizador"');
    const apaga = r.indexOf('rpc("apagar_conjuntos"');
    expect(pergunta).toBeGreaterThan(0);
    expect(apaga).toBeGreaterThan(0);
    expect(pergunta).toBeLessThan(apaga);
  });

  it("a subscrição é cancelada por nós, e não pedida a quem sai", () => {
    const r = ler(ROTA);
    expect(r).toContain("cancelarSubscricao");
    // Cancelar o que já está cancelado é uma resposta, não um erro.
    expect(r).toMatch(/ja_cancelada|ja_nao_existia/);
  });

  it("exige sessão", () => {
    const r = ler(ROTA);
    expect(r).toMatch(/status: 401/);
  });

  it("valida a frase no servidor, e não só na interface", () => {
    // Um pedido feito fora do browser não passa por confirmação visual
    // nenhuma.
    const r = ler(ROTA);
    expect(r).toContain("confirmacaoValida");
    expect(r).toMatch(/status: 400/);
  });

  it("um conjunto desconhecido é filtrado, e não apagado às cegas", () => {
    expect(alvoPorId("tabela_qualquer")).toBeUndefined();
    // A rota cruza o que vem do corpo com o catálogo. Um nome de tabela
    // enviado à mão não chega sequer à base de dados.
    expect(ler(ROTA)).toMatch(/APAGAVEIS\.includes/);
  });

  it("a conta é apagada por último", () => {
    // Se algo falhasse antes, a pessoa ainda tem conta para tentar de novo.
    const r = ler(ROTA);
    expect(r.indexOf("deleteUser")).toBeGreaterThan(r.indexOf('rpc("apagar_conjuntos"'));
    expect(r.indexOf("deleteUser")).toBeGreaterThan(r.indexOf("await cancelarSubscricao"));
  });
});

describe("apagar: o que a pessoa vê", () => {
  it("a secção usa a paleta destrutiva do design system", () => {
    // `clay` é o vermelho pastel documentado para ações destrutivas, e tem
    // override de modo escuro. Um vermelho cru não teria.
    const c = ler(UI);
    expect(c).toMatch(/clay-border/);
    expect(c).toMatch(/clay-text/);
    expect(c).toMatch(/clay-bg/);
  });

  it("a caixa de preenchimento automático começa desmarcada", () => {
    // A omissão tem de ser a que obriga a parar e ler.
    const c = ler(UI);
    expect(c).toMatch(/useState\(false\)/);
    expect(c).toMatch(/Preencher a confirmação por mim/);
  });

  it("o botão de apagar está desativado até a frase bater certo", () => {
    const c = ler(UI);
    expect(c).toMatch(/disabled=\{!p\.pronto/);
  });

  it("há dois alvos, e não seis — quatro estavam mortos", () => {
    // `recibos`, `vencimentos`, `cenarios` e `perfil-fiscal` deixaram de ser
    // usados quando a zona de risco passou a trabalhar por conjuntos
    // escolhidos, e ficaram aqui com testes a confirmar as frases deles.
    expect(ALVOS.map((a) => a.id).sort()).toEqual(["conta", "selecao"]);
  });

  it("apagar a conta diz que a subscrição é cancelada por nós", () => {
    // É o engano mais caro possível: apagar a conta e continuar a ser
    // cobrado. A rota cancela desde a migração 049 — e esta descrição
    // continuava a mandar a pessoa cancelar primeiro.
    const d = alvoPorId("conta")!.descricao;
    expect(d).toMatch(/cancelada por nós/i);
    expect(d, "já não é a pessoa que tem de cancelar antes")
      .not.toMatch(/cancela-a primeiro/i);
  });

  it("a confirmação mostra o que vai sair antes de pedir a frase", () => {
    // Escrever uma frase sem ver o que ela abrange não é confirmar.
    const c = ler(UI);
    expect(c).toMatch(/aSair/);
    expect(c).toMatch(/Vai sair/);
  });

  it("apagar na nuvem limpa SÓ o que corresponde no dispositivo", () => {
    const c = codigo(UI);
    // ⚠️ Era `esvaziarCofre`, que remove os dezoito domínios: escolher
    // «Comentários que deixaste» levava à frente o estúdio de negócio, os
    // preços guardados e o perfil de descoberta, e a resposta dizia
    // «1 registo apagado».
    expect(c).toContain("apagarDominiosLocais");
    expect(c).toContain("dominiosDosConjuntos");
    expect(c, "o cofre inteiro não pode voltar a sair por um conjunto")
      .not.toMatch(/esvaziarCofre/);
    // Os nomes das chaves vêm do cofre, e não de uma lista escrita aqui.
    expect(c, "a lista de chaves não pode voltar a existir aqui")
      .not.toMatch(/"recibocerto:/);
  });

  it("a zona de risco existe para quem não tem sessão", () => {
    // ⚠️ Começava por `if (!user) return null`. As calculadoras, o estúdio
    // de negócio e o motor de descoberta funcionam sem conta, e é aí que
    // estão os dados mais sensíveis — sem forma nenhuma de os apagar.
    const c = codigo(UI);
    expect(c, "não pode voltar a desistir por não haver sessão")
      .not.toMatch(/if \(!user\) return null/);
    expect(c).toContain("Neste dispositivo");
  });

  it("um conjunto que o servidor não conhece não se deixa escolher", () => {
    // ⚠️ O inventário devolve uma chave por conjunto que a base de dados
    // sabe apagar. Uma chave em falta não é «tens zero» — é «este servidor
    // ainda não conhece isto», e acontece na janela entre publicar a
    // aplicação e aplicar a migração. Deixar escolher aí era prometer um
    // apagamento que não ia acontecer: o defeito que esta entrega corrige.
    const c = codigo(UI);
    expect(c).toMatch(/const conhecido = inventario === null \|\| quantos !== undefined/);
    expect(c).toContain("indisponivel={!conhecido}");
    expect(c).toContain("disabled={p.indisponivel}");
  });

  it("«o que fica, e porquê» só aparece a quem isso diz respeito", () => {
    // Mostrava «Recebimentos e conta Stripe» a quem nunca tinha sido
    // contabilista, porque `retidos` não olhava para o inventário nem para
    // `soSe`.
    const c = ler(UI);
    expect(c).toMatch(/CONJUNTOS\.filter\(\(c\) => c\.retido && \(inventario\?\.\[c\.id\] \?\? 0\) > 0\)/);
  });
});
