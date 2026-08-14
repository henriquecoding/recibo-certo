import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  nifValido, nifMascarado, euros, estadoDoCasoLegivel, AREAS, URGENCIAS,
  TETO_DE_ENCAMINHAMENTOS, SITUACAO_MIN,
} from "@/lib/contabilistas/casos";

const MIGRACAO = readFileSync(
  join(process.cwd(), "supabase/migrations/051_intermediacao_casos.sql"), "utf8",
);

describe("RC-CASO-001 · a fronteira é o canal, não a identidade", () => {
  // O contabilista precisa do nome e do NIF para trabalhar. O que não pode
  // ter é por onde falar com a pessoa fora da plataforma.
  it("o nome e o NIF vivem do lado que o contabilista vê", () => {
    const casos = MIGRACAO.slice(
      MIGRACAO.indexOf("CREATE TABLE IF NOT EXISTS public.casos ("),
      MIGRACAO.indexOf("CREATE INDEX IF NOT EXISTS casos_cliente_idx"),
    );
    expect(casos).toContain("nome_completo");
    expect(casos).toContain("nif");
  });

  it("os canais de contacto vivem numa tabela à parte", () => {
    const contactos = MIGRACAO.slice(
      MIGRACAO.indexOf("CREATE TABLE IF NOT EXISTS public.caso_contactos ("),
      MIGRACAO.indexOf("-- ── 3."),
    );
    for (const canal of ["email", "telefone", "morada"]) {
      expect(contactos, `${canal} devia estar protegido`).toContain(canal);
    }
    // E não repetidos do outro lado, que era o mesmo que não os proteger.
    // Sem os comentários: o texto que explica a fronteira nomeia os canais,
    // e procurá-los no texto encontrava a explicação em vez de uma coluna.
    const casos = MIGRACAO
      .slice(
        MIGRACAO.indexOf("CREATE TABLE IF NOT EXISTS public.casos ("),
        MIGRACAO.indexOf("CREATE INDEX IF NOT EXISTS casos_cliente_idx"),
      )
      .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    for (const canal of ["email", "telefone", "morada"]) {
      expect(casos, `${canal} não pode ser uma coluna de casos`).not.toContain(canal);
    }
  });

  // ⚠️ A garantia não é um `USING` que exclui o contabilista — é a
  // ausência de qualquer caminho. Uma política que o mencionasse, ainda
  // que para o excluir, seria uma política que um dia se abre por engano.
  it("nenhuma política de caso_contactos menciona encaminhamento", () => {
    const bloco = MIGRACAO.slice(MIGRACAO.indexOf('ON public.caso_contactos'));
    const politicas = bloco.slice(0, bloco.indexOf("-- ── `caso_documentos`"));
    expect(politicas).not.toContain("encaminhado_para");
  });
});

describe("RC-CASO-002 · só decide quem leu até ao fim", () => {
  it("a decisão exige as duas colunas, no WHERE e não na interface", () => {
    const fn = MIGRACAO.slice(
      MIGRACAO.indexOf("CREATE OR REPLACE FUNCTION public.decidir_proposta("),
      MIGRACAO.indexOf("DO $$\nDECLARE f text;\nBEGIN\n  FOREACH f IN ARRAY ARRAY[\n    'public.marcar_proposta_lida"),
    );
    expect(fn).toMatch(/AND p\.lida_ate_ao_fim_em IS NOT NULL/);
    expect(fn).toMatch(/AND p\.confirmacao_em IS NOT NULL/);
  });

  it("as duas colunas não se desfazem depois de escritas", () => {
    expect(MIGRACAO).toContain("A leitura não se desfaz.");
    expect(MIGRACAO).toContain("A confirmação não se desfaz.");
  });

  it("uma proposta enviada não se reescreve — envia-se outra", () => {
    expect(MIGRACAO).toContain("Uma proposta enviada não se reescreve.");
    expect(MIGRACAO).toContain("substitui       uuid REFERENCES public.propostas(id)");
  });
});

describe("RC-CASO-003 · a mediação não se contorna", () => {
  it("uma mensagem nasce submetida, e a política não deixa outra coisa", () => {
    const pol = MIGRACAO.slice(MIGRACAO.indexOf('CREATE POLICY "caso_mensagens_escreve"'));
    const bloco = pol.slice(0, pol.indexOf(";"));
    expect(bloco).toContain("estado = 'submetida'");
    expect(bloco).toContain("revisto_por IS NULL");
  });

  it("o original fica: a redação vai para outra coluna", () => {
    expect(MIGRACAO).toContain("corpo_encaminhado");
    expect(MIGRACAO).toContain("O que foi submetido não se reescreve.");
  });

  it("devolver sem razão não é possível", () => {
    expect(MIGRACAO).toContain("falta_a_razao");
  });
});

describe("RC-CASO-004 · o que a pessoa lê", () => {
  it("valida o dígito de controlo do NIF", () => {
    // NIFs com dígito de controlo correto.
    expect(nifValido("123456789")).toBe(true);
    expect(nifValido("501442600")).toBe(true);
    // O mesmo número com o último dígito trocado deixa de ser válido.
    expect(nifValido("123456788")).toBe(false);
    expect(nifValido("12345678")).toBe(false);
    expect(nifValido("023456789")).toBe(false);
    expect(nifValido("abcdefghi")).toBe(false);
  });

  it("encurta o NIF sem inventar dígitos", () => {
    expect(nifMascarado("123456789")).toBe("••••••789");
    expect(nifMascarado("nao é um nif")).toBe("•••••••••");
  });

  it("escreve o dinheiro em euros de Portugal", () => {
    expect(euros(24000).replace(/ /g, " ")).toBe("240,00 €");
    expect(euros(0).replace(/ /g, " ")).toBe("0,00 €");
  });

  it("cada estado do caso diz o que está a acontecer, sem jargão", () => {
    for (const estado of [
      "rascunho", "submetido", "em_triagem", "encaminhado",
      "com_proposta", "aceite", "recusado", "fechado",
    ] as const) {
      const { titulo, explicacao } = estadoDoCasoLegivel(estado);
      expect(titulo.length, `${estado} sem título`).toBeGreaterThan(2);
      expect(explicacao.length, `${estado} sem explicação`).toBeGreaterThan(15);
      expect(explicacao, `${estado} mostra o nome do estado`).not.toContain("_");
    }
  });

  it("as áreas e as urgências têm ajuda, e não só um nome", () => {
    for (const a of AREAS) expect(a.ajuda.length).toBeGreaterThan(15);
    for (const u of URGENCIAS) expect(u.ajuda.length).toBeGreaterThan(15);
  });

  it("o teto de encaminhamentos é o mesmo aqui e na base de dados", () => {
    const noSql = MIGRACAO.match(/teto_de_encaminhamentos\(\) RETURNS integer\nLANGUAGE sql IMMUTABLE AS \$\$ SELECT (\d+)/);
    expect(noSql?.[1], "a migração deixou de declarar o teto").toBeTruthy();
    expect(Number(noSql![1])).toBe(TETO_DE_ENCAMINHAMENTOS);
  });

  it("o mínimo da descrição é o mesmo dos dois lados", () => {
    expect(MIGRACAO).toContain(`char_length(situacao) BETWEEN ${SITUACAO_MIN} AND`);
  });
});
