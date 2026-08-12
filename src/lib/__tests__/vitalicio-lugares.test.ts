import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  textoLugares, foiLimiteAtingido, lugaresVitalicios,
  LUGARES_DESCONHECIDOS, ERRO_ESGOTADO,
} from "@/lib/plus/vitalicio";

const RAIZ = process.cwd();
const ler = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const MIGRACAO = "supabase/migrations/035_limite_lugares_vitalicios.sql";

describe("lugares vitalícios: quem garante o limite", () => {
  it("o limite vive na base de dados, dentro da transação da escrita", () => {
    // Um limite verificado só na aplicação não é um limite. Duas compras
    // simultâneas no lugar 1000 leem ambas «999 ocupados» e passam ambas.
    const sql = ler(MIGRACAO);
    expect(sql).toMatch(/CREATE TRIGGER subscriptions_limite_vitalicio/i);
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE/i);
  });

  it("os concorrentes são serializados por um lock, não por esperança", () => {
    const sql = ler(MIGRACAO);
    expect(sql).toContain("pg_advisory_xact_lock");
  });

  it("as concessões manuais ocupam lugar como as compradas", () => {
    // As duas contas internas são dois dos mil. Contá-las à parte daria mil
    // e dois lugares dados com um limite de mil.
    const sql = ler(MIGRACAO);
    expect(sql).toMatch(/origem IN \('vitalicio', 'manual'\)/);
  });

  it("o número mil tem uma origem só", () => {
    // Se estivesse escrito no gatilho E no TypeScript, um dia discordavam.
    const sql = ler(MIGRACAO);
    expect(sql).toMatch(/FUNCTION public\.lugares_vitalicios_total/);
    expect(sql).toMatch(/SELECT 1000/);
    const modulo = ler("src/lib/plus/vitalicio.ts");
    expect(modulo, "o total tem de ser lido da base de dados").toContain('rpc("lugares_vitalicios")');
  });

  it("a contagem pública não expõe identidades", () => {
    const sql = ler(MIGRACAO);
    const fn = sql.slice(sql.indexOf("FUNCTION public.lugares_vitalicios()"));
    expect(fn).not.toMatch(/user_id|email|profiles/);
  });
});

describe("lugares vitalícios: o que a interface faz com o número", () => {
  it("o checkout recusa antes de cobrar", () => {
    // Se só o gatilho recusasse, a pessoa pagava primeiro e descobria
    // depois — e ficávamos a dever um reembolso.
    const rota = ler("src/app/api/stripe/checkout/route.ts");
    expect(rota).toContain("lugaresVitalicios");
    expect(rota).toMatch(/esgotado/);
    expect(rota).toMatch(/status: 409/);
  });

  it("o webhook grita por um reembolso se o lugar esgotar depois de pago", () => {
    const rota = ler("src/app/api/stripe/webhook/route.ts");
    expect(rota).toContain("foiLimiteAtingido");
    expect(rota).toMatch(/REEMBOLSO NECESSÁRIO/);
    // 200 de propósito: repetir o webhook não cria lugar nenhum.
    expect(rota).toMatch(/reembolso_necessario: true/);
  });

  it("uma falha de leitura não bloqueia a compra", () => {
    // Recusar dinheiro por causa de um problema nosso de leitura seria pior
    // do que deixar o gatilho recusar no fim.
    expect(LUGARES_DESCONHECIDOS.esgotado).toBe(false);
  });

  it("sem Supabase configurado devolve o estado desconhecido, não estoira", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(lugaresVitalicios()).resolves.toEqual(LUGARES_DESCONHECIDOS);
    if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  });

  it("reconhece o erro que o gatilho levanta", () => {
    expect(foiLimiteAtingido({ message: `${ERRO_ESGOTADO}: os 1000 lugares...` })).toBe(true);
    expect(foiLimiteAtingido({ message: "outra coisa qualquer" })).toBe(false);
    expect(foiLimiteAtingido(null)).toBe(false);
    expect(foiLimiteAtingido(undefined)).toBe(false);
  });
});

describe("lugares vitalícios: o que a pessoa lê", () => {
  const l = (ocupados: number, total = 1000) => ({
    total, ocupados,
    restantes: Math.max(total - ocupados, 0),
    esgotado: total - ocupados <= 0,
  });

  it("longe do fim mostra a proporção", () => {
    expect(textoLugares(l(2))).toBe("2 de 1000 lugares ocupados.");
  });

  it("perto do fim passa a contar o que falta", () => {
    expect(textoLugares(l(970))).toBe("Faltam 30 lugares de 1000.");
  });

  it("no último lugar não diz «faltam 1»", () => {
    expect(textoLugares(l(999))).toBe("Falta 1 lugar de 1000.");
  });

  it("esgotado diz que esgotou, não «0 restantes»", () => {
    expect(textoLugares(l(1000))).toBe("Os lugares vitalícios esgotaram.");
    expect(textoLugares(l(1001))).toBe("Os lugares vitalícios esgotaram.");
  });

  it("o cartão bloqueia o botão quando esgota", () => {
    const c = ler("src/components/ContadorVitalicio.tsx");
    expect(c).toMatch(/Lugares esgotados/);
    expect(c).toMatch(/aria-disabled="true"/);
    // E continua a oferecer o mensal, que não tem limite nenhum.
    expect(c).toMatch(/mensal continua disponível/);
  });
});
