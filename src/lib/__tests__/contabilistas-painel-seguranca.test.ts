import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contemCodigo } from "../feedback-sanitize";

const SRC = join(__dirname, "..", "..");
const RAIZ = join(SRC, "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");
const LAYOUT = ler("app", "contabilista", "layout.tsx");
const TRABALHO = ler("app", "contabilista", "trabalho", "page.tsx");
const CSS = ler("app", "contabilista", "painel.module.css");
const MIGRACAO = readFileSync(
  join(RAIZ, "supabase", "migrations", "20260814181500_texto_seguro_painel_contabilista.sql"),
  "utf8",
);

function fontesEm(diretorio: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(diretorio)) {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) saida.push(...fontesEm(caminho));
    else if (/\.(tsx?|jsx?)$/.test(nome)) saida.push(readFileSync(caminho, "utf8"));
  }
  return saida;
}

describe("texto livre do painel profissional", () => {
  it.each([
    "<script>alert(1)</script>",
    '<img src=x onerror=alert(1)>',
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    'srcdoc="<p>oi</p>"',
    "data:text/html,<svg onload=alert(1)>",
    "{{constructor.constructor('alert(1)')()}}",
    "<% process.exit() %>",
  ])("reconhece conteúdo executável: %s", (texto) => {
    expect(contemCodigo(texto)).toBe(true);
  });

  it.each([
    "Entregar o IVA do 3.º trimestre",
    "Confirmar retenção < 1 000 € e margem > 20%.",
    "Cliente prefere atendimento online às quintas.",
    "https://meet.google.com/abc-defg-hij",
  ])("não recusa texto profissional normal: %s", (texto) => {
    expect(contemCodigo(texto)).toBe(false);
  });

  it("usa no painel exatamente o mesmo detetor da Ajuda & Suporte", () => {
    expect(LAYOUT).toContain('import { contemCodigo } from "@/lib/feedback-sanitize"');
    expect(LAYOUT).toContain("onSubmitCapture={aoSubmeter}");
    expect(LAYOUT).toContain("onPasteCapture={aoColar}");
    expect(LAYOUT).toContain("onDropCapture={aoLargar}");
    expect(LAYOUT).toContain("setCustomValidity");
  });

  it("repete a fronteira no Postgres para quem contornar o browser", () => {
    expect(MIGRACAO).toMatch(/CREATE OR REPLACE FUNCTION public\.painel_texto_tem_codigo/);
    expect(MIGRACAO).toMatch(/CREATE OR REPLACE FUNCTION public\.rejeitar_codigo_painel/);
    expect(MIGRACAO).toContain("REVOKE ALL ON FUNCTION public.painel_texto_tem_codigo(text)");
    for (const tabela of [
      "contabilistas", "contabilista_tarefas", "contabilista_tarefa_passos",
      "contabilista_mensagens", "contabilista_vinculos", "agendamentos",
      "partilhas", "casos", "caso_mensagens",
    ]) {
      expect(MIGRACAO, `falta defesa na tabela ${tabela}`).toContain(`ON public.${tabela}`);
    }
  });

  it("não existe renderização de HTML arbitrário na área profissional", () => {
    const fontes = [
      ...fontesEm(join(SRC, "app", "contabilista")),
      ...fontesEm(join(SRC, "components", "contabilistas")),
    ];
    expect(fontes.join("\n")).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("redesign do painel profissional", () => {
  it("mantém os oito destinos sem os comprimir numa grelha de seis", () => {
    expect((LAYOUT.match(/href: "\/contabilista/g) ?? []).length).toBe(8);
    expect(LAYOUT).not.toContain("grid-cols-6");
    expect(LAYOUT).toContain("scrollIntoView");
  });

  it("não regressa para dois sinos Realtime no mesmo layout", () => {
    expect((LAYOUT.match(/<SinoNotificacoes \/>/g) ?? []).length).toBe(1);
  });

  it("usa o calendário do design system em vez do seletor nativo do browser", () => {
    expect(TRABALHO).toContain('import DatePicker from "@/components/ui/DatePicker"');
    expect(TRABALHO).toContain("<DatePicker");
    expect(TRABALHO).not.toContain('type="date"');
  });

  it("trata campos, calendário, tabelas, tabs e modo escuro como um sistema", () => {
    expect(CSS).toContain('input[type="date"]');
    expect(CSS).toContain('[role="tablist"]');
    expect(CSS).toContain("tbody tr:hover");
    expect(CSS).toContain('[role="grid"] [role="gridcell"]');
    expect(CSS).toContain(":global(.dark)");
    expect(CSS).toContain("prefers-reduced-motion");
  });
});
