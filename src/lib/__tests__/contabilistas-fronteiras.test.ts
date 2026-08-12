import { describe, expect, it } from "vitest";
import { escolherRota, MONETIZACAO_PROIBIDA, type SinaisDoUtilizador } from "@/lib/routing";
import {
  CAMPOS_PARTILHA,
  CONSENTIMENTO_VERSAO,
  LIMITE_CONTEUDO_BYTES,
  PARTILHA_NUNCA_EXIGE_PLUS,
  podeAgendar,
  podePartilhar,
  podePedirVinculo,
  sanitizarConteudoPartilha,
} from "@/lib/contabilistas/vinculo";
import { DESCRICAO_ENTITLEMENT, ENTITLEMENTS_POR_PLANO, PERMISSAO_DA_FUNCIONALIDADE } from "@/lib/entitlements";
import { ROTULO_PARTILHA } from "@/lib/contabilistas/vinculo";
import type { TipoPartilha } from "@/lib/contabilistas/tipos";

const base: SinaisDoUtilizador = { confianca: "completo", temResultado: true };

describe("routing: as guardas de confiança continuam intactas", () => {
  it("um resultado fora de escopo não abre rota nenhuma, nem com contabilista ligado", () => {
    const r = escolherRota({ ...base, confianca: "fora_de_escopo", temContabilistaVinculado: true });
    expect(r.rota).toBe("sem_parceiro");
    expect(r.motivo).toBe("confianca_insuficiente");
  });

  it("uma página informativa não abre rota nenhuma, nem com contabilista ligado", () => {
    const r = escolherRota({ ...base, temResultado: false, temContabilistaVinculado: true });
    expect(r.rota).toBe("sem_parceiro");
    expect(r.motivo).toBe("pergunta_informativa");
  });
});

describe("routing: o contabilista da própria pessoa", () => {
  it("ganha à FIZ quando há vínculo ativo", () => {
    const semVinculo = escolherRota({ ...base, enquadramento: "independente" });
    expect(semVinculo.rota, "sem vínculo, a execução vai para a FIZ").toBe("fiz");

    const comVinculo = escolherRota({
      ...base, enquadramento: "independente", temContabilistaVinculado: true,
    });
    expect(comVinculo.rota).toBe("contabilista");
    expect(comVinculo.motivo).toBe("contabilista_vinculado");
  });

  it("ganha ao Plus para um utilizador recorrente", () => {
    const r = escolherRota({ ...base, decisoesAnteriores: 5, temContabilistaVinculado: true });
    expect(r.rota).toBe("contabilista");
  });

  it("distingue-se do caso que exige profissional pelo motivo", () => {
    expect(escolherRota({ ...base, enquadramento: "sociedade" }).motivo)
      .toBe("caso_exige_profissional");
    expect(escolherRota({ ...base, enquadramento: "sociedade", temContabilistaVinculado: true }).motivo)
      .toBe("contabilista_vinculado");
  });

  it("continua a exigir consentimento antes de qualquer partilha", () => {
    const r = escolherRota({ ...base, temContabilistaVinculado: true });
    expect(r.exigeConsentimento, MONETIZACAO_PROIBIDA[1]).toBe(true);
  });

  it("não muda nada quando o sinal está ausente", () => {
    for (const enquadramento of ["independente", "eni", "sociedade", "dependente"] as const) {
      const antes = escolherRota({ ...base, enquadramento });
      const depois = escolherRota({ ...base, enquadramento, temContabilistaVinculado: false });
      expect(depois, enquadramento).toEqual(antes);
    }
  });

  it("devolve sempre uma rota das quatro conhecidas", () => {
    const combinacoes: SinaisDoUtilizador[] = [];
    for (const confianca of ["completo", "estimado", "fora_de_escopo"] as const) {
      for (const temResultado of [true, false]) {
        for (const vinculado of [true, false, undefined]) {
          combinacoes.push({ confianca, temResultado, temContabilistaVinculado: vinculado });
        }
      }
    }
    for (const c of combinacoes) {
      expect(["fiz", "contabilista", "sem_parceiro", "plus"]).toContain(escolherRota(c).rota);
    }
  });
});

describe("fronteira: partilhar nunca exige Plus", () => {
  it("a regra está declarada", () => {
    expect(PARTILHA_NUNCA_EXIGE_PLUS).toBe(true);
  });

  it("nenhuma CHAVE de entitlement cobre a plataforma de contabilistas", () => {
    // São as chaves que os gates verificam (`planoTem(plano, chave)`), por isso
    // é nelas que a fronteira tem de estar. Uma chave chamada
    // `contabilista.partilhar` seria a porta por onde a promessa se perdia.
    const proibidas = /contabilis|partilh|agenda|fidelidad|cupa|cupã|vinculo|vínculo/i;
    for (const chave of Object.keys(DESCRICAO_ENTITLEMENT)) {
      expect(chave, `o entitlement "${chave}" não pode cobrir a plataforma`)
        .not.toMatch(proibidas);
    }
  });

  it("`export.bundle` é exportar um ficheiro, e não a partilha na plataforma", () => {
    // A descrição deste entitlement menciona o contabilista — «Dossiê completo
    // para o contabilista» — e é legítimo: é o PDF/CSV que a pessoa descarrega
    // e entrega a quem quiser. Existe desde antes desta plataforma.
    //
    // O que NÃO pode acontecer é alguém concluir, a partir do nome, que enviar
    // uma simulação a um contabilista vinculado também é Plus. São coisas
    // diferentes: uma produz um ficheiro, a outra é uma mensagem entre duas
    // contas da plataforma, e só a primeira se paga.
    expect(DESCRICAO_ENTITLEMENT["export.bundle"]).toContain("Dossiê");
    expect("export.bundle".startsWith("export."), "é da família das exportações").toBe(true);

    // A prova de que a partilha não é isto: nenhuma funcionalidade com gate a
    // nomeia (asserção seguinte), logo nenhum `ProGate` a pode cobrir.
    expect(Object.keys(PERMISSAO_DA_FUNCIONALIDADE)).not.toContain("partilhar-com-contabilista");
  });

  it("nenhuma Funcionalidade com gate cobre a plataforma de contabilistas", () => {
    const proibidas = /contabilis|partilh|agenda|fidelidad|cupa|cupã/i;
    for (const f of Object.keys(PERMISSAO_DA_FUNCIONALIDADE)) {
      expect(f, `a funcionalidade "${f}" não pode ser um gate da plataforma`).not.toMatch(proibidas);
    }
  });

  it("o plano grátis continua sem entitlements — e isso não impede partilhar", () => {
    expect(ENTITLEMENTS_POR_PLANO.free.size).toBe(0);
    // A prova é o que está acima: como não há entitlement nenhum a cobrir a
    // partilha, não há gate possível. Um conjunto vazio nunca a bloqueia.
    expect(podePartilhar("ativo")).toBe(true);
    expect(podeAgendar("ativo")).toBe(true);
  });
});

describe("vínculo: estados", () => {
  it("só um vínculo ativo permite partilhar e agendar", () => {
    for (const e of ["convidado", "pendente", "pausado", "terminado"] as const) {
      expect(podePartilhar(e), e).toBe(false);
      expect(podeAgendar(e), e).toBe(false);
    }
    expect(podePartilhar("ativo")).toBe(true);
    expect(podeAgendar("ativo")).toBe(true);
    expect(podePartilhar(null)).toBe(false);
    expect(podeAgendar(undefined)).toBe(false);
  });

  it("não se pede vínculo por cima de um que já existe", () => {
    expect(podePedirVinculo(null)).toBe(true);
    expect(podePedirVinculo("terminado")).toBe(true);
    for (const e of ["convidado", "pendente", "ativo", "pausado"] as const) {
      expect(podePedirVinculo(e), e).toBe(false);
    }
  });
});

describe("partilha: só passa o que está na lista branca", () => {
  it("deixa passar os campos autorizados", () => {
    const r = sanitizarConteudoPartilha("simulador_irs", {
      ano: 2026, rendimentoBruto: 30000, irsEstimado: 4200,
    });
    expect(r.erro).toBeNull();
    expect(r.conteudo).toEqual({ ano: 2026, rendimentoBruto: 30000, irsEstimado: 4200 });
    expect(r.removidos).toEqual([]);
  });

  it("remove tudo o que não está autorizado, e diz o que removeu", () => {
    const r = sanitizarConteudoPartilha("simulador_irs", {
      ano: 2026,
      nif: "123456789",
      password: "segredo",
      tokenSessao: "abc",
    });
    expect(r.conteudo).toEqual({ ano: 2026 });
    expect(r.removidos.sort()).toEqual(["nif", "password", "tokenSessao"]);
  });

  it("recusa conteúdo que não é um objeto", () => {
    for (const bruto of [null, undefined, 42, "texto", [1, 2, 3], true]) {
      expect(sanitizarConteudoPartilha("simulador_irs", bruto).erro, String(bruto)).not.toBeNull();
    }
  });

  it("recusa um envio que ficaria vazio", () => {
    const r = sanitizarConteudoPartilha("simulador_irs", { coisaEstranha: 1 });
    expect(r.erro).toBe("Não há nada para enviar.");
  });

  it("recusa conteúdo grande demais", () => {
    const r = sanitizarConteudoPartilha("cenario_guardado", {
      notas: "x".repeat(LIMITE_CONTEUDO_BYTES + 100),
    });
    expect(r.erro).toContain("grande demais");
  });

  it("não deixa passar funções nem protótipos", () => {
    const r = sanitizarConteudoPartilha("simulador_irs", {
      ano: 2026,
      notas: function () { return "x"; },
    });
    expect(r.conteudo).toEqual({ ano: 2026 });
    expect(typeof r.conteudo.notas).not.toBe("function");
  });

  it("sobrevive a referências circulares", () => {
    const circular: Record<string, unknown> = { ano: 2026 };
    circular.notas = circular;
    const r = sanitizarConteudoPartilha("simulador_irs", circular);
    expect(r.conteudo.ano).toBe(2026);
    expect(r.removidos).toContain("notas");
  });

  it("recusa um tipo desconhecido", () => {
    const r = sanitizarConteudoPartilha("inventado" as TipoPartilha, { ano: 2026 });
    expect(r.erro).toBe("Tipo de partilha desconhecido.");
  });

  it("todo o tipo de partilha tem lista branca e rótulo", () => {
    for (const tipo of Object.keys(CAMPOS_PARTILHA) as TipoPartilha[]) {
      expect(CAMPOS_PARTILHA[tipo].length, tipo).toBeGreaterThan(0);
      expect(ROTULO_PARTILHA[tipo], tipo).toBeTruthy();
    }
    expect(Object.keys(ROTULO_PARTILHA).sort()).toEqual(Object.keys(CAMPOS_PARTILHA).sort());
  });

  it("nenhuma lista branca autoriza credenciais ou identificadores de sessão", () => {
    const proibidos = /^(nif|niss|password|palavra|token|sessao|sessão|iban|cartao|cartão|cc|email)$/i;
    for (const [tipo, campos] of Object.entries(CAMPOS_PARTILHA)) {
      for (const campo of campos) {
        expect(campo, `${tipo}.${campo}`).not.toMatch(proibidos);
      }
    }
  });

  it("a versão do consentimento está declarada", () => {
    expect(CONSENTIMENTO_VERSAO).toMatch(/^\d{4}-\d{2}-\d+$/);
  });
});
