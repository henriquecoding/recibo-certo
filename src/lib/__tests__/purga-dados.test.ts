import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIAS_ATE_PURGA, DADOS_APAGADOS, DADOS_MANTIDOS } from "@/lib/plus/purga";

const RAIZ = process.cwd();
const ler = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const SQL = "supabase/migrations/036_purga_dados_apos_cancelamento.sql";

describe("purga: o apagamento é real, não só um aviso", () => {
  it("existe uma função que apaga mesmo o conteúdo na nuvem", () => {
    const sql = ler(SQL);
    expect(sql).toMatch(/FUNCTION public\.purgar_dados_expirados/);
    for (const t of ["recibos", "recibos_vencimento", "cenarios"]) {
      expect(sql, `${t} tem de ser apagada`).toMatch(new RegExp(`DELETE FROM public\\.${t}`));
    }
    expect(sql, "o perfil fiscal também sai").toMatch(/preferencias_fiscais = NULL/);
  });

  it("o webhook agenda quando a subscrição acaba", () => {
    // A decisão vive agora na projeção de faturação; o webhook delega nela em
    // vez de falar com o Postgres diretamente. A garantia é a mesma: o fim de
    // uma subscrição tem de agendar a purga.
    const p = ler("src/lib/billing/projection.ts");
    expect(p).toContain('"agendar_purga"');
    const w = ler("src/app/api/stripe/webhook/route.ts");
    expect(w, "o webhook tem de passar pela projeção").toContain("@/lib/billing/projection");
    expect(w).toContain("syncSubscription");
  });

  it("uma rota de cron executa a purga", () => {
    const r = ler("src/app/api/cron/purgar-dados/route.ts");
    expect(r).toContain('rpc("purgar_dados_expirados")');
    const v = JSON.parse(ler("vercel.json"));
    expect(v.crons?.[0]?.path).toBe("/api/cron/purgar-dados");
  });

  it("a rota que apaga dados não está aberta à internet", () => {
    const r = ler("src/app/api/cron/purgar-dados/route.ts");
    expect(r).toContain("CRON_SECRET");
    expect(r).toMatch(/status: 401/);
    // Sem segredo configurado tem de FECHAR, não abrir.
    expect(r).toMatch(/status: 503/);
  });
});

describe("purga: as salvaguardas", () => {
  it("não apaga no instante — há uma janela", () => {
    // Uma subscrição também acaba quando um cartão expira. Apagar no
    // momento destruiria os dados de quem nunca escolheu sair.
    expect(DIAS_ATE_PURGA).toBeGreaterThanOrEqual(14);
    const sql = ler(SQL);
    expect(sql).toMatch(/purga_agendada_para <= now\(\)/);
  });

  it("quem voltou a ter Plus não perde nada, mesmo com data marcada", () => {
    const sql = ler(SQL);
    expect(sql).toMatch(/NOT EXISTS/);
    expect(sql).toMatch(/status IN \('active', 'trialing', 'past_due'\)/);
  });

  it("um webhook reentregue não empurra o prazo para a frente", () => {
    const sql = ler(SQL);
    expect(sql).toMatch(/coalesce\(purga_agendada_para, quando\)/);
  });

  it("reativar a subscrição cancela o apagamento", () => {
    const sql = ler(SQL);
    expect(sql).toMatch(/FUNCTION public\.cancelar_purga/);
    const p = ler("src/lib/billing/projection.ts");
    expect(p).toContain('"cancelar_purga"');
    const w = ler("src/app/api/stripe/webhook/route.ts");
    expect(w, "o webhook tem de passar pela projeção").toContain("@/lib/billing/projection");
  });

  it("a conta e o histórico de faturação não são apagados", () => {
    const sql = ler(SQL);
    // Nada de apagar perfis nem subscrições: a faturação tem obrigação
    // legal de conservação, e a conta não foi o que a pessoa cancelou.
    expect(sql).not.toMatch(/DELETE FROM public\.profiles/);
    expect(sql).not.toMatch(/DELETE FROM public\.subscriptions/);
    expect(sql).not.toMatch(/DELETE FROM auth\.users/);
  });

  it("só o servidor pode chamar as funções que apagam ou agendam", () => {
    const sql = ler(SQL);
    for (const fn of ["purgar_dados_expirados\\(\\)", "agendar_purga\\(uuid\\)", "cancelar_purga\\(uuid\\)"]) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\s+FROM PUBLIC, anon, authenticated`));
    }
  });
});

describe("purga: o que a pessoa lê antes de decidir", () => {
  it("o aviso aparece ao tentar gerir a subscrição, não só nos Termos", () => {
    const conta = ler("src/app/dashboard/conta/page.tsx");
    expect(conta).toContain("AvisoCancelamento");
    expect(conta).toMatch(/setAvisoAberto\(true\)/);
  });

  it("o cartão mensal diz o que acontece antes de alguém subscrever", () => {
    const p = ler("src/components/Precos.tsx");
    expect(p).toContain("DIAS_ATE_PURGA");
    expect(p).toMatch(/apagado dos nossos servidores/);
  });

  it("diz o que é apagado E o que fica", () => {
    // Só a lista do que desaparece faria o aviso parecer maior do que é.
    expect(DADOS_APAGADOS.length).toBeGreaterThan(0);
    expect(DADOS_MANTIDOS.length).toBeGreaterThan(0);
    expect(DADOS_MANTIDOS.join(" ")).toMatch(/dispositivo/);
  });

  it("não é um dark pattern: continuar é sempre possível e sem fricção", () => {
    const m = ler("src/components/conta/AvisoCancelamento.tsx");
    expect(m).toMatch(/Continuar para a gestão/);
    // Nada de contagens decrescentes nem de esconder a saída.
    expect(m).not.toMatch(/setTimeout|disabled=\{true\}|countdown/i);
    // E oferece exportar antes, que é o que torna o aviso útil.
    expect(m).toMatch(/Exportar primeiro/);
  });

  it("o modal é acessível: foco preso, Esc e rótulo", () => {
    const m = ler("src/components/conta/AvisoCancelamento.tsx");
    expect(m).toMatch(/role="dialog"/);
    expect(m).toMatch(/aria-modal="true"/);
    expect(m).toMatch(/aria-labelledby/);
    expect(m).toMatch(/Escape/);
    expect(m).toMatch(/e\.key !== "Tab"/);
  });
});
