import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contemCodigo } from "../feedback-sanitize";
import { DESTINOS } from "@/components/contabilistas/navegacao";

const SRC = join(__dirname, "..", "..");
const RAIZ = join(SRC, "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");
const LAYOUT = ler("components", "contabilista", "MolduraContabilista.tsx");
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
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O QUE ESTE TESTE GARANTE, E PORQUE MUDOU DE MECANISMO              │
   * │                                                                   │
   * │ Contava `href: "/contabilista` no layout e exigia exatamente dez,  │
   * │ mais um `scrollIntoView`. As duas asserções liam a IMPLEMENTAÇÃO   │
   * │ de então: os dez destinos escritos à mão num array do layout, e o  │
   * │ gesto que trazia o ativo ao centro de uma doca que rolava.         │
   * │                                                                   │
   * │ Os destinos passaram para `navegacao.tsx`, arrumados em seis       │
   * │ secções, e a doca deixou de rolar — portanto deixou de precisar de │
   * │ ser centrada. O que o teste GARANTE não mudou («todos os destinos  │
   * │ continuam lá, e nada os comprime»); mudou onde é que essa verdade  │
   * │ está escrita, e o teste tem de seguir a garantia.                  │
   * │                                                                   │
   * │ A prova de que nenhum destino se perde vive agora, mais forte, em  │
   * │ `contabilistas-painel-navegacao.test.ts`: lê as rotas do disco, e  │
   * │ por isso apanha uma página nova sem lugar na navegação — coisa que │
   * │ contar literais nunca conseguiu fazer.                             │
   * └───────────────────────────────────────────────────────────────────┘
   */
  it("mantém todos os destinos sem os comprimir numa grelha de seis", () => {
    // O número continua fixado de propósito: é o que apanha um destino
    // removido por acidente. Subiu para 11 com «Dossiês de guia», que é o
    // segundo destino de um Guia a chegar ao painel — ver
    // `docs/architecture/motor-dossie-de-guia.md`.
    expect(DESTINOS).toHaveLength(11);
    expect(LAYOUT).not.toContain("grid-cols-6");
    // E a doca continua a ser uma fila que se adapta, não uma grelha fixa:
    // os lugares crescem para encher a linha em vez de serem espremidos.
    expect(CSS).toMatch(/\.mobileItem \{[^}]*flex: 1 1/);
  });

  it("continua a montar o sino, uma vez, no cabeçalho do painel", () => {
    // Já não é uma regra sobre canais Realtime: desde que o estado saiu do
    // componente para `lib/notificacoes/loja.ts`, dois sinos no ecrã são
    // uma subscrição só — o canal abre ao primeiro subscritor e fecha ao
    // último. Ver `notificacoes.test.ts`.
    //
    // O que isto ainda guarda é o desenho: UM sino no cabeçalho, e não um
    // segundo escondido numa secção qualquer a dizer outra contagem.
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
