// ═══════════════════════════════════════════════════════════════════════
//  PERFIL FISCAL PARTILHADO E LOCALIZAÇÃO — §43, §44, §45, §59
//  ---------------------------------------------------------------------
//  Três defeitos com a mesma raiz: a mesma pessoa e o mesmo negócio eram
//  descritos de maneiras diferentes conforme o ecrã.
//
//  O mais caro é o do §43: `conjunta ? "casadoUnico" : "naoCasado"`. São
//  conceitos diferentes — a opção pela tributação conjunta é da
//  declaração anual, a tabela de retenção depende de quem aufere
//  rendimentos — e a confusão dava a um casal com dois rendimentos a
//  tabela que retém menos.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contextoNegocioVazio,
  localizacaoDeclarada,
  municipioDoNegocio,
  nomeDaLocalizacao,
  novaOferta,
  parametrosDaLocalizacao,
  regiaoDeclarada,
  regiaoDoNegocio,
  type ContextoNegocio,
} from "@/lib/negocio";
import { criarHandoffEmpresa } from "@/lib/negocio/adapters/empresa-handoff";
import { analisarNegocio } from "@/lib/negocio";
import { simularEmpresaOpcoes, type PerfilGerente } from "@/lib/fiscal-empresa";
import {
  camposRespondidos,
  ESTADOS_CIVIS,
  perfilDeclarado,
  ROTULO_ESTADO_CIVIL,
  tabelaDeRetencao,
} from "@/lib/perfil-pessoa";
import { normalizarPerfilPessoa, normalizarSnapshotEmpresa } from "@/lib/empresa/snapshot";
import { ofertaDePreferencias, pendentesDaImportacao } from "@/lib/empresa/preferencias";
import { DEFAULTS } from "@/lib/store/preferencias-fiscais";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const PERFIL_BASE: PerfilGerente = {
  dependentes: 0,
  conjunta: false,
  regiao: "continente",
  ifici: false,
};

// ═══════════════════════════════════════════════════════════════════════
//  1. CONJUNTA ≠ TABELA DE RETENÇÃO — §43
// ═══════════════════════════════════════════════════════════════════════

describe("perfil:conjunta-nao-e-tabela", () => {
  it("as três tabelas existem e são distintas", () => {
    expect(ESTADOS_CIVIS).toHaveLength(3);
    expect(new Set(Object.values(ROTULO_ESTADO_CIVIL)).size).toBe(3);
  });

  it("a tabela declarada muda a RETENÇÃO MENSAL da gerência", () => {
    // ⚠️ A retenção mensal e o IRS anual são coisas diferentes, e este
    // teste diz respeito à primeira. O anual sai dos escalões do Art. 68.º
    // e não da tabela do Despacho; a tabela decide o que a empresa retém
    // todos os meses — que é o que aparece no recibo da gerência e o que
    // decide a tesouraria do gerente.
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };

    // Um casal com DOIS rendimentos que opta pela conjunta.
    const doisTitulares = simularEmpresaOpcoes({
      ...comum,
      perfil: { ...PERFIL_BASE, conjunta: true, estadoCivil: "casadoDois" },
    });
    // O que o código antigo fazia com a mesma pessoa: único titular.
    const comoAntes = simularEmpresaOpcoes({
      ...comum,
      perfil: { ...PERFIL_BASE, conjunta: true },
    });

    expect(doisTitulares.payrollGerente.retencaoIRSMensal).not.toBeCloseTo(
      comoAntes.payrollGerente.retencaoIRSMensal,
      1,
    );
    // E o erro tinha sentido: único titular retém MENOS.
    expect(comoAntes.payrollGerente.retencaoIRSMensal).toBeLessThan(
      doisTitulares.payrollGerente.retencaoIRSMensal,
    );
  });

  it("sem tabela declarada, o comportamento antigo mantém-se", () => {
    // Um contrato novo não pode mudar o resultado de cenários guardados.
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };
    const derivado = simularEmpresaOpcoes({
      ...comum,
      perfil: { ...PERFIL_BASE, conjunta: true },
    });
    const explicito = simularEmpresaOpcoes({
      ...comum,
      perfil: { ...PERFIL_BASE, conjunta: true, estadoCivil: "casadoUnico" },
    });

    expect(derivado.payrollGerente.retencaoIRSMensal).toBeCloseTo(
      explicito.payrollGerente.retencaoIRSMensal,
      2,
    );
    expect(derivado.liquidoGerente).toBeCloseTo(explicito.liquidoGerente, 2);
  });

  it("`tabelaDeRetencao` nunca deriva de `conjunta`", () => {
    expect(tabelaDeRetencao({ conjunta: true })).toBe("naoCasado");
    expect(tabelaDeRetencao({ conjunta: true, estadoCivil: "casadoDois" })).toBe("casadoDois");
  });

  it("o mapeamento perigoso desapareceu do motor", () => {
    const src = ler("src/lib/fiscal-empresa.ts");
    // Continua a existir como FALLBACK, mas nunca sem a tabela declarada
    // a ter precedência.
    expect(src).toContain('perfil.estadoCivil ?? (perfil.conjunta ? "casadoUnico" : "naoCasado")');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2. O PERFIL É MAIS RICO — §43
// ═══════════════════════════════════════════════════════════════════════

describe("perfil:mais-rico", () => {
  it("dependentes mudam o líquido do gerente", () => {
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };
    const sem = simularEmpresaOpcoes({ ...comum, perfil: PERFIL_BASE });
    const com = simularEmpresaOpcoes({ ...comum, perfil: { ...PERFIL_BASE, dependentes: 3 } });
    expect(com.liquidoGerente).toBeGreaterThan(sem.liquidoGerente);
  });

  it("o IRS Jovem do gerente passa a chegar ao motor de retenção", () => {
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };
    const sem = simularEmpresaOpcoes({ ...comum, perfil: PERFIL_BASE });
    const com = simularEmpresaOpcoes({ ...comum, perfil: { ...PERFIL_BASE, irsJovemAno: 1 } });

    // Antes nem sequer era passado: `youthIrsBenefitYear` não existia na
    // chamada, e um gerente com IRS Jovem via a retenção de quem não o tem.
    expect(com.payrollGerente.retencaoIRSMensal).toBeLessThan(sem.payrollGerente.retencaoIRSMensal);
    expect(com.payrollGerente.liquidoMensal).toBeGreaterThan(sem.payrollGerente.liquidoMensal);
  });

  it("a incapacidade do próprio deixa de estar fixa em `false`", () => {
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };
    const sem = simularEmpresaOpcoes({ ...comum, perfil: PERFIL_BASE });
    const com = simularEmpresaOpcoes({ ...comum, perfil: { ...PERFIL_BASE, deficiencia: true } });
    expect(com.payrollGerente.retencaoIRSMensal).not.toBeCloseTo(
      sem.payrollGerente.retencaoIRSMensal,
      1,
    );
  });

  it("dependentes chegam à retenção mensal E ao IRS anual", () => {
    const comum = { faturacao: 80_000, salarioGerenteMensal: 2_000 };
    const sem = simularEmpresaOpcoes({ ...comum, perfil: PERFIL_BASE });
    const com = simularEmpresaOpcoes({ ...comum, perfil: { ...PERFIL_BASE, dependentes: 3 } });

    expect(com.payrollGerente.retencaoIRSMensal).toBeLessThan(sem.payrollGerente.retencaoIRSMensal);
    expect(com.liquidoGerente).toBeGreaterThan(sem.liquidoGerente);
  });

  it("um perfil vazio é reconhecido como vazio", () => {
    expect(perfilDeclarado(undefined)).toBe(false);
    expect(perfilDeclarado({})).toBe(false);
    expect(perfilDeclarado({ dependentes: 0 })).toBe(false);
    expect(perfilDeclarado({ estadoCivil: "naoCasado" })).toBe(true);
    expect(camposRespondidos({ dependentes: 2, ifici: false })).toEqual(["dependentes", "ifici"]);
  });

  it("a normalização recusa valores fora de domínio", () => {
    expect(normalizarPerfilPessoa({ estadoCivil: "solteiro" })).toBeUndefined();
    expect(normalizarPerfilPessoa({ irsJovemAno: 99 })).toBeUndefined();
    expect(normalizarPerfilPessoa({ regiao: "algarve" })).toBeUndefined();
    expect(normalizarPerfilPessoa(null)).toBeUndefined();
    expect(normalizarPerfilPessoa({ dependentes: 2 })?.dependentes).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  3. AS PREFERÊNCIAS SÃO OFERECIDAS, NÃO APLICADAS — §45
// ═══════════════════════════════════════════════════════════════════════

describe("perfil:preferencias", () => {
  it("sem nada guardado, não há nada a oferecer", () => {
    expect(ofertaDePreferencias(DEFAULTS).temAlgoUtil).toBe(false);
  });

  it("o que está guardado aparece, e diz o que é", () => {
    const o = ofertaDePreferencias({
      ...DEFAULTS,
      dependentes: 2,
      conjunta: true,
      irsJovemAno: 3,
      ifici: true,
    });

    expect(o.temAlgoUtil).toBe(true);
    expect(o.perfil.dependentes).toBe(2);
    expect(o.perfil.conjunta).toBe(true);
    expect(o.perfil.irsJovemAno).toBe(3);
    expect(o.linhas.length).toBe(4);
  });

  it("`conjunta` NÃO se transforma em tabela de retenção (§43)", () => {
    const o = ofertaDePreferencias({ ...DEFAULTS, conjunta: true });
    expect(o.perfil.estadoCivil).toBeUndefined();
    // E diz-se que continua por responder.
    expect(pendentesDaImportacao(o.perfil).join(" ")).toMatch(/Tabela de retenção/);
  });

  it("a interface oferece e não aplica em silêncio", () => {
    const src = ler("src/components/empresa/PerfilGerenteEditor.tsx");
    expect(src).toContain("Encontrámos preferências fiscais que já configuraste");
    expect(src).toContain("Usar estas respostas");
    expect(src).toContain("Prefiro rever aqui");
    // Não há aplicação automática na montagem.
    expect(src).not.toMatch(/useEffect\([\s\S]{0,200}aoMudar/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  4. 12 OU 14 DO GERENTE, EXPOSTO — §44
// ═══════════════════════════════════════════════════════════════════════

describe("perfil:meses-gerente", () => {
  it("o motor distingue 12 de 14, e sempre distinguiu", () => {
    const comum = { faturacao: 80_000, salarioGerenteMensal: 1_500, perfil: PERFIL_BASE };
    const doze = simularEmpresaOpcoes({ ...comum, mesesSalarioGerente: 12 });
    const catorze = simularEmpresaOpcoes({ ...comum, mesesSalarioGerente: 14 });

    expect(catorze.salGerente).toBeGreaterThan(doze.salGerente);
    expect(catorze.salGerente).toBeCloseTo(1_500 * 14, 0);
  });

  it("a superfície guiada passa a expô-lo", () => {
    const src = ler("src/components/simulador/ModoGuiadoEmpresa.tsx");
    expect(src).toContain("mesesSalarioGerente");
    expect(src).toContain("A gerência recebe subsídios de férias e Natal?");
    // A pergunta é semântica, não um seletor «12/14» copiado do trabalhador.
    expect(src).toContain("depende dos termos da nomeação");
  });

  it("o snapshot leva-o e recusa valores impossíveis", () => {
    expect(normalizarSnapshotEmpresa({ mesesSalarioGerente: 14 }).mesesSalarioGerente).toBe(14);
    expect(normalizarSnapshotEmpresa({ mesesSalarioGerente: 13 }).mesesSalarioGerente).toBeUndefined();
    expect(normalizarSnapshotEmpresa({ mesesSalarioGerente: "14" }).mesesSalarioGerente).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  5. A LOCALIZAÇÃO, PERGUNTADA UMA VEZ — §59
// ═══════════════════════════════════════════════════════════════════════

describe("localizacao:primeira-classe", () => {
  const comOfertas = (extra: Partial<ContextoNegocio> = {}): ContextoNegocio => ({
    ...contextoNegocioVazio("ja_vendo"),
    ofertas: [{ ...novaOferta("servico", { volumeMes: 8 }), respondidos: ["custo-direto"] }],
    ...extra,
  });

  it("sem nada declarado, assume-se continente — e sabe-se que é assunção", () => {
    const c = comOfertas();
    expect(regiaoDoNegocio(c)).toBe("continente");
    expect(regiaoDeclarada(c)).toBe(false);
  });

  it("a localização declarada ganha, e é reconhecida como declarada", () => {
    const c = comOfertas({ localizacao: localizacaoDeclarada("madeira") });
    expect(regiaoDoNegocio(c)).toBe("madeira");
    expect(regiaoDeclarada(c)).toBe(true);
  });

  it("o campo legado continua a ser lido — não se perde trabalho de ninguém", () => {
    const base = comOfertas();
    const c: ContextoNegocio = { ...base, fiscal: { ...base.fiscal, regiao: "acores" } };
    expect(regiaoDoNegocio(c)).toBe("acores");
    expect(regiaoDeclarada(c)).toBe(true);
  });

  it("continente sem município NÃO produz parâmetros municipais (§111)", () => {
    const c = comOfertas({ localizacao: localizacaoDeclarada("continente") });
    expect(parametrosDaLocalizacao(c)).toBeUndefined();
    expect(municipioDoNegocio(c)).toBeUndefined();
  });

  it("as autónomas produzem parâmetros próprios sem município", () => {
    for (const r of ["madeira", "acores"] as const) {
      const params = parametrosDaLocalizacao(comOfertas({ localizacao: localizacaoDeclarada(r) }));
      expect(params?.regiaoId).toBe(r);
    }
  });

  it("um município declarado leva os parâmetros dele para o handoff", () => {
    const c = comOfertas({
      localizacao: localizacaoDeclarada("continente", {
        municipio: "Norte (interior)",
        regiaoIncentivoId: "norte",
      }),
    });
    const params = parametrosDaLocalizacao(c);
    expect(params?.regiaoId).toBe("norte");
    expect(nomeDaLocalizacao(c)).toBe("Norte (interior)");

    const h = criarHandoffEmpresa(c, analisarNegocio(c));
    expect(h.prefill.localizacao?.regiaoId).toBe("norte");
    expect(h.pendentes.map((p) => p.chave)).not.toContain("localizacao");
  });

  it("sem município, o handoff deixa a localização pendente", () => {
    const c = comOfertas({ localizacao: localizacaoDeclarada("continente") });
    const h = criarHandoffEmpresa(c, analisarNegocio(c));
    expect(h.prefill.localizacao).toBeUndefined();
    expect(h.pendentes.map((p) => p.chave)).toContain("localizacao");
  });

  it("o domínio lê a região por um acessor só", () => {
    for (const f of [
      "src/lib/negocio/agregar.ts",
      "src/lib/negocio/adapters/iva.ts",
      "src/lib/negocio/adapters/comparar.ts",
    ]) {
      const src = ler(f);
      expect(src, `${f} lê a região diretamente`).not.toMatch(/contexto\??\.fiscal\??\.regiao/);
      expect(src, `${f} não usa o acessor`).toContain("regiaoDoNegocio");
    }
  });
});
