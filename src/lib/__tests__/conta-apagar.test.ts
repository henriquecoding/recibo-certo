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
  it("o user_id vem do token, nunca do corpo do pedido", () => {
    // Aceitar um id do corpo daria a qualquer pessoa autenticada a
    // capacidade de apagar os dados de outra.
    const r = ler(ROTA);
    expect(r).toContain("obterUtilizador(req)");
    expect(r).toMatch(/eq\("user_id", user\.id\)/);
    expect(r, "o corpo não pode trazer um user_id").not.toMatch(/corpo\??\.\s*user_id/);
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

  it("um alvo desconhecido é recusado", () => {
    expect(alvoPorId("tabela_qualquer")).toBeUndefined();
    expect(ler(ROTA)).toMatch(/Alvo desconhecido/);
  });

  it("a conta é apagada por último", () => {
    // Se algo falhasse antes, a pessoa ainda tem conta para tentar de novo.
    const r = ler(ROTA);
    expect(r.indexOf("deleteUser")).toBeGreaterThan(r.indexOf("preferencias_fiscais"));
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
    expect(c).toMatch(/disabled=\{!prontoParaApagar/);
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
    expect(c).toMatch(/localStorage\.removeItem/);
  });
});
