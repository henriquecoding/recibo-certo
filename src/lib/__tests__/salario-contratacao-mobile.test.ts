import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Salário com dois caminhos", () => {
  it("preserva o palco do trabalhador e acrescenta um palco patronal completo", () => {
    const fork = read("src/components/foco/salario/HeroSalarioBifurcado.tsx");
    expect(fork).toContain('params.set("percurso", percurso)');
    expect(fork).toContain("router.replace(");
    expect(fork).toContain('role="radiogroup"');
    expect(fork).toContain('aria-label="Escolhe o teu percurso"');
    expect(fork).toContain("<PalcoSalario dados={dados}");
    expect(fork).toContain("<PalcoContratacao dados={contratacao}");
  });

  it("calcula o palco patronal no servidor e entrega apenas dados serializáveis", () => {
    const server = read("src/lib/foco/dados-servidor.ts");
    const stage = read("src/components/foco/salario/PalcoContratacao.tsx");
    expect(server).toContain("export function dadosContratacao()");
    expect(server).toContain("planEmploymentOffer(");
    expect(stage).not.toContain("planEmploymentOffer");
    expect(stage).toContain("Régua do orçamento anual");
    expect(stage).toContain("Linha de equilíbrio");
  });

  it("não carrega persistência até existir uma ação explícita de guardar", () => {
    const planner = read("src/components/contratacao/PlaneadorContratacao.tsx");
    const save = read("src/components/contratacao/GuardarCenarioContratacao.tsx");
    // A reabertura entra por um módulo mínimo; `store/cenarios` (Supabase +
    // Stripe) continua a ser proibido no chunk inicial do planeador.
    expect(planner).not.toContain('from "@/lib/store/cenarios"');
    expect(planner).toContain('from "@/lib/store/reabertura"');
    expect(read("src/lib/store/reabertura.ts")).not.toContain("supabase");
    expect(planner).toContain('dynamic(() => import("./GuardarCenarioContratacao")');
    expect(save).toContain('from "@/lib/store/cenarios"');
    expect(save).toContain("Confirmar gravação");
  });

  it("reabre um cenário guardado no planeador, e não na página de gestão", () => {
    const store = read("src/lib/store/cenarios.ts");
    const planner = read("src/components/contratacao/PlaneadorContratacao.tsx");
    expect(store).toContain('rota: "/dashboard/contratacao"');
    expect(planner).toContain('consumirReabertura("contratacao")');
    // A hidratação corre uma única vez, mesmo que a página volte a montar.
    expect(planner).toContain("reidratado.current");
  });

  it("declara telemetria patronal sem valores monetários ou texto livre", () => {
    const events = read("src/lib/analytics/eventos.ts");
    const planner = read("src/components/contratacao/PlaneadorContratacao.tsx");
    expect(events).toContain('"hiring_calculation_completed"');
    expect(events).toContain('"hiring_result_incomplete"');
    expect(events).toContain('"hiring_comparison_created"');
    expect(planner).toContain('registar("hiring_export_generated"');
    expect(planner).toContain("<ComparadorPacotes");
  });

  it("a copy do resultado não pode contradizer o estado da decisão", () => {
    const header = read("src/components/contratacao/EstadoDecisao.tsx");
    const stage = read("src/components/foco/salario/PalcoContratacao.tsx");
    // O cabeçalho lê a frase do domínio em vez de a escrever.
    expect(header).toContain("status.headline");
    expect(header).not.toContain("O pacote cabe antes de a proposta sair");
    // E o palco da homepage deixou de afirmar um veredicto fixo.
    expect(stage).not.toContain("A proposta cabe");
    expect(stage).toContain("ROTULO_DECISAO[dados.prontidao]");
  });

  it("um custo tem estado, não só valor", () => {
    const campos = read("src/components/contratacao/campos.tsx");
    const estado = read("src/components/contratacao/estado.ts");
    expect(campos).toContain("CampoCustoConhecido");
    expect(estado).toContain('kind: "unknown"');
    expect(estado).toContain('kind: "not_applicable"');
    // Nenhuma parcela nasce com valor: o equipamento chegava a 1 200 € dentro
    // de uma secção fechada.
    expect(estado).toContain("equipmentFirstYear: custoVazio()");
  });
});

describe("contrato mobile da homepage", () => {
  it("a régua só ganha a largura larga a partir de sm e usa snap no telemóvel", () => {
    const ruler = read("src/components/foco/ReguaPerguntasHero.tsx");
    expect(ruler).toContain("snap-x snap-mandatory");
    expect(ruler).toContain("sm:min-w-[58rem]");
    expect(ruler).not.toContain('className="grid min-w-[58rem]');
    expect(ruler).not.toContain(".scrollIntoView(");
    expect(ruler).toContain("contentor.scrollLeft =");
  });

  it("recolhe pesquisa e marca quando a leitura desce, deixando a navegação acessível", () => {
    const chrome = read("src/components/ChromeMobile.tsx");
    expect(chrome).toContain("data-chrome-compacto");
    expect(chrome).toContain("{!compacto ? <DockMovel /> : null}");
    expect(chrome).toContain("{!compacto ? <ChromeMobileMarca /> : null}");
    expect(chrome).toContain("<nav");
  });

  it("impõe um piso legível aos textos de todos os palcos", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain('[data-palco] [class*="text-[8px]"]');
    expect(css).toContain("font-size: 0.75rem !important");
    expect(css).toContain("overflow: clip");
  });
});
