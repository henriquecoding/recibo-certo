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

describe("apagar: o campo só aceita a frase pedida", () => {
  const alvo = alvoPorId("recibos")!;

  it("aceita a frase, letra a letra", () => {
    expect(recortarAoPrefixo(alvo, "a")).toBe("a");
    expect(recortarAoPrefixo(alvo, "apagar")).toBe("apagar");
    expect(recortarAoPrefixo(alvo, "apagar recibos verdes")).toBe("apagar recibos verdes");
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
    expect(recortarAoPrefixo(alvo, "apagar recibos verdes e mais")).toBe("apagar recibos verdes");
  });

  it("corrige acentos e caixa de quem escreve à pressa", () => {
    const cen = alvoPorId("cenarios")!;
    expect(recortarAoPrefixo(cen, "APAGAR CENÁRIOS")).toBe("apagar cenarios");
  });
});

describe("apagar: a confirmação", () => {
  it("a frase certa passa", () => {
    for (const a of ALVOS) expect(confirmacaoValida(a, a.confirmacao), a.id).toBe(true);
  });

  it("uma frase de outro alvo não passa", () => {
    const recibos = alvoPorId("recibos")!;
    const conta = alvoPorId("conta")!;
    expect(confirmacaoValida(conta, recibos.confirmacao)).toBe(false);
    expect(confirmacaoValida(recibos, conta.confirmacao)).toBe(false);
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

  it("cobre os alvos que foram pedidos", () => {
    const ids = ALVOS.map((a) => a.id);
    expect(ids).toContain("tudo");
    expect(ids).toContain("conta");
    // Por simulador, um a um.
    expect(ids).toContain("recibos");
    expect(ids).toContain("vencimentos");
    expect(ids).toContain("cenarios");
    expect(ids).toContain("perfil-fiscal");
  });

  it("apagar a conta avisa que não cancela a subscrição", () => {
    // É o engano mais caro possível: apagar a conta e continuar a ser
    // cobrado.
    expect(alvoPorId("conta")!.descricao).toMatch(/cancela|cobrança/i);
  });

  it("apagar na nuvem também limpa o dispositivo", () => {
    const c = ler(UI);
    expect(c).toContain("limparLocal");
    // Os nomes das chaves vêm do cofre, e não de uma lista escrita aqui.
    // Enquanto eram duas listas, três das quatro chaves estavam erradas e
    // os dados locais sobreviviam ao apagamento sem ninguém dar por isso.
    expect(c).toContain("esvaziarCofre");
    expect(c, "a lista de chaves não pode voltar a existir aqui")
      .not.toMatch(/"recibocerto:/);
  });
});
