// ═══════════════════════════════════════════════════════════════════════
//  O PERFIL SÓ PODE DIZER O QUE CONSEGUE PROVAR
//  ---------------------------------------------------------------------
//  Um diretório profissional vale exatamente o que valem os sinais que
//  mostra. No dia em que disser «verificado» sobre um número que ninguém
//  verificou, ou «12 anos de experiência» sobre uma data de registo, deixa
//  de ser um sinal e passa a ser decoração — e quem o lê deixa de poder
//  usá-lo para escolher.
//
//  Estes testes prendem as regras das §124, §133 e §139 ao código.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IDIOMAS, acaoDoPerfilPublico, acaoEstaDisponivel, checklistPerfil,
  completudeDoPerfil, copyPreco, copyResposta, essenciaisDoPerfil,
  nomesDosIdiomas, sinaisDeConfianca, type FichaDePerfil,
} from "../contabilistas/perfil";

const BASE: FichaDePerfil = {
  userId: "u1",
  slug: "maria-ferreira",
  nome: "Maria Ferreira",
  occ: "12345",
  bio: "Acompanho freelancers e pequenas empresas.",
  distrito: "Lisboa",
  concelho: "Lisboa",
  especialidades: ["IRS", "IVA"],
  modalidades: ["presencial", "online"],
  emailContacto: "maria@exemplo.pt",
  telefone: null,
  website: null,
  estado: "aprovado",
  aceitaNovosClientes: true,
  precoConsultaCents: 0,
  duracaoConsultaMin: 60,
  fidelidadeMeta: 5,
  fidelidadeDescontoPct: 10,
  fidelidadeAtiva: false,
  criadoEm: "2024-01-01T00:00:00Z",
  tituloProfissional: "Contabilista Certificada",
  apresentacaoCurta: "Contabilidade simples e próxima.",
  idiomas: ["pt", "en"],
  anosExperiencia: 12,
  respostaMediaHoras: 24,
  occVerificado: false,
  linkedinLigado: true,
};

// ─── §133 · completude ─────────────────────────────────────────────────

describe("o que falta ao perfil", () => {
  it("a localização só é essencial para quem atende presencialmente", () => {
    const online: FichaDePerfil = { ...BASE, modalidades: ["online"], distrito: null, concelho: null };
    expect(essenciaisDoPerfil(online).map((e) => e.id)).not.toContain("localizacao");
    expect(completudeDoPerfil(online).pronto).toBe(true);

    const presencial: FichaDePerfil = { ...BASE, modalidades: ["presencial"], distrito: null, concelho: null };
    expect(essenciaisDoPerfil(presencial).map((e) => e.id)).toContain("localizacao");
    expect(completudeDoPerfil(presencial).pronto).toBe(false);
  });

  it("qualquer forma de contacto conta como contacto", () => {
    const so_site: FichaDePerfil = { ...BASE, emailContacto: null, telefone: null, website: "https://x.pt" };
    expect(completudeDoPerfil(so_site).essenciais.find((e) => e.id === "contacto")?.completo).toBe(true);
  });

  it("um perfil incompleto não é um perfil inválido", () => {
    // A §133 distingue as duas coisas: falta contexto ≠ está errado.
    const incompleto: FichaDePerfil = { ...BASE, bio: "", especialidades: [] };
    const c = completudeDoPerfil(incompleto);
    expect(c.rotulo).toBe("Falta contexto para os clientes");
    expect(c.rotulo).not.toMatch(/inválido/i);
  });
});

// ─── §139 · sinais de confiança ────────────────────────────────────────

describe("os sinais de confiança são factos", () => {
  it("um número OCC escrito no formulário é «informado», nunca «verificado»", () => {
    const occ = sinaisDeConfianca(BASE).find((s) => s.id === "occ");
    expect(occ?.presente).toBe(true);
    expect(occ?.rotulo).toBe("Nº OCC informado");
  });

  it("«verificado» só depois de a administração verificar", () => {
    const occ = sinaisDeConfianca({ ...BASE, occVerificado: true }).find((s) => s.id === "occ");
    expect(occ?.rotulo).toBe("Nº OCC verificado");
  });

  it("não há sinais que a plataforma não consiga provar", () => {
    const rotulos = sinaisDeConfianca(BASE).map((s) => s.rotulo.toLowerCase()).join(" ");
    for (const proibido of ["top ", "estrela", "avaliaç", "mais procurado", "100%", "recomendado"]) {
      expect(rotulos, `«${proibido}» é um sinal que ninguém mediu`).not.toContain(proibido);
    }
  });

  it("o checklist não pede testemunhos ao próprio", () => {
    // Um testemunho escrito por quem se apresenta não é prova social.
    const texto = JSON.stringify(checklistPerfil(BASE)).toLowerCase();
    expect(texto).not.toContain("testemunho");
    expect(texto).not.toContain("avaliaç");
  });

  it("o ficheiro do domínio não fala de testemunhos em lado nenhum", () => {
    // Exceto para explicar porque é que não os tem.
    const fonte = readFileSync(join(process.cwd(), "src/lib/contabilistas/perfil.ts"), "utf8");
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
    expect(semComentarios.toLowerCase()).not.toContain("testemunho");
  });
});

// ─── §123 e §139 · copy que não derrapa ────────────────────────────────

describe("a copy diz a verdade sobre o que é", () => {
  it("o preço público nunca vira «desde X €»", () => {
    expect(copyPreco()).not.toMatch(/desde|€|\d/);
  });

  it("o tempo de resposta é um compromisso, não uma medição", () => {
    expect(copyResposta(24)).toBe("Responde normalmente em 24h");
    expect(copyResposta(4)).toBe("Responde normalmente em 4h");
    expect(copyResposta(48)).toBe("Responde normalmente em 2 dias");
    expect(copyResposta(24)).not.toMatch(/médio|média/i);
  });

  it("sem valor declarado não se inventa nenhum", () => {
    expect(copyResposta(null)).toBeNull();
    expect(copyResposta(0)).toBeNull();
  });

  it("os idiomas vêm do vocabulário fechado", () => {
    expect(nomesDosIdiomas(["pt", "en"])).toEqual(["Português", "Inglês"]);
    // Um código que não está no catálogo não vai a cru para o ecrã.
    expect(nomesDosIdiomas(["pt", "zz"])).toEqual(["Português"]);
    expect(IDIOMAS.every((i) => /^[a-z]{2}$/.test(i.codigo))).toBe(true);
  });
});

// ─── §136 · a ação possível ────────────────────────────────────────────

describe("o perfil público não oferece o que não pode cumprir", () => {
  it.each([
    [{ autenticado: false, estadoVinculo: null, aceitaNovosClientes: true }, "entrar"],
    [{ autenticado: true, estadoVinculo: null, aceitaNovosClientes: true }, "pedir_vinculo"],
    [{ autenticado: true, estadoVinculo: "pendente" as const, aceitaNovosClientes: true }, "pedido_enviado"],
    [{ autenticado: true, estadoVinculo: "ativo" as const, aceitaNovosClientes: true }, "marcar_consulta"],
    [{ autenticado: true, estadoVinculo: "pausado" as const, aceitaNovosClientes: true }, "em_pausa"],
    [{ autenticado: true, estadoVinculo: null, aceitaNovosClientes: false }, "sem_vagas"],
  ])("%o → %s", (contexto, esperado) => {
    expect(acaoDoPerfilPublico(contexto)).toBe(esperado);
  });

  it("um cliente ativo continua a poder marcar mesmo sem vagas abertas", () => {
    // «Sem vagas» é sobre clientes NOVOS. Fechar a agenda a quem já é
    // cliente seria terminar a relação sem o dizer.
    expect(acaoDoPerfilPublico({
      autenticado: true, estadoVinculo: "ativo", aceitaNovosClientes: false,
    })).toBe("marcar_consulta");
  });

  it("um vínculo terminado não impede um pedido novo", () => {
    expect(acaoDoPerfilPublico({
      autenticado: true, estadoVinculo: "terminado", aceitaNovosClientes: true,
    })).toBe("pedir_vinculo");
  });

  it("as ações que não levam a lado nenhum ficam desativadas", () => {
    expect(acaoEstaDisponivel("pedido_enviado")).toBe(false);
    expect(acaoEstaDisponivel("em_pausa")).toBe(false);
    expect(acaoEstaDisponivel("sem_vagas")).toBe(false);
    expect(acaoEstaDisponivel("pedir_vinculo")).toBe(true);
    expect(acaoEstaDisponivel("marcar_consulta")).toBe(true);
  });
});

// ─── A migração e o domínio dizem o mesmo ──────────────────────────────

describe("o catálogo de idiomas é um só", () => {
  it("o TypeScript e o SQL têm os mesmos códigos", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260815210000_perfil_profissional_campos.sql"),
      "utf8",
    );
    const noSql = [...sql.matchAll(/\('([a-z]{2})',\s*'[^']+',\s*\d+\)/g)].map((m) => m[1]);
    expect(noSql.sort()).toEqual(IDIOMAS.map((i) => i.codigo).sort());
  });

  it("mudar o número OCC apaga a verificação", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260815210000_perfil_profissional_campos.sql"),
      "utf8",
    );
    expect(sql).toMatch(/IF NEW\.occ IS DISTINCT FROM OLD\.occ THEN[\s\S]{0,200}occ_verificado_em\s*:=\s*NULL/);
    expect(sql).toMatch(/A verificação do número OCC só é feita pela administração/);
  });
});
