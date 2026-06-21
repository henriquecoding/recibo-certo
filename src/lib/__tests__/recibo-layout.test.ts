import { describe, it, expect } from "vitest";
import { analisarLayout, extrairRubricas, type ItemGeo } from "../recibo-layout";

// Constrói um item com caixa: linha vertical `y` (altura 10), colunas por x.
const it_ = (str: string, x: number, y: number, w = 40): ItemGeo => ({
  str,
  left: x,
  right: x + w,
  top: y,
  bottom: y + 10,
});

// Recibo SADGES/SENDYS de 2 colunas (ABONOS | DESCONTOS), com totais por lado.
function reciboExemplo(premioValor = "26,67"): ItemGeo[] {
  return [
    it_("DESCONTOS", 560, 40, 80),
    // cabeçalhos de coluna
    it_("Cód.", 40, 60), it_("Designação", 80, 60, 120), it_("Quant.", 320, 60), it_("Valor Uni", 380, 60), it_("Valor", 440, 60),
    it_("Cód.", 560, 60), it_("Designação", 600, 60, 120), it_("Valor", 820, 60),
    // linha 1: Vencimento (abono) + Subsídio-D (desconto)
    it_("1", 40, 80), it_("Vencimento", 80, 80, 120), it_("30,00", 320, 80), it_("32,67", 380, 80), it_("980,00", 440, 80),
    it_("32", 560, 80), it_("Subsídio de Refeição (cartão - D)", 600, 80, 160), it_("193,80", 820, 80),
    // linha 2: Subsídio-A (abono) + Seg. Social (desconto)
    it_("31", 40, 100), it_("Subsídio de Refeição (Cartão - A)", 80, 100, 200), it_("19,00", 320, 100), it_("10,20", 380, 100), it_("193,80", 440, 100),
    it_("90", 560, 100), it_("Seg. Social (Empregado)", 600, 100, 160), it_("117,92", 820, 100),
    // linha 3: Feriados (abono) + IRS (desconto)
    it_("49", 40, 120), it_("Feriados", 80, 120, 120), it_("1,00", 320, 120), it_("65,33", 380, 120), it_("65,33", 440, 120),
    it_("91", 560, 120), it_("IRS", 600, 120, 120), it_("49,00", 820, 120),
    // linha 4: Prémio (só abono)
    it_("202", 40, 140), it_("Prémio - Desempenho", 80, 140, 160), it_("0,00", 320, 140), it_("0,00", 380, 140), it_(premioValor, 440, 140),
    // totais
    it_("TOTAL ILÍQUIDO :", 300, 180, 120), it_("1.265,80", 440, 180),
    it_("TOTAL DESCONTOS :", 700, 180, 110), it_("360,72", 820, 180),
    it_("TOTAL LÍQUIDO :", 600, 210, 120), it_("905,08", 820, 210),
  ];
}

describe("analisarLayout — tabela de 2 colunas validada em malha fechada", () => {
  const a = analisarLayout(reciboExemplo());

  it("lê os totais por lado (não troca ilíquido com descontos)", () => {
    expect(a.totalIliquido).toBe(1265.8);
    expect(a.totalDescontos).toBe(360.72);
    expect(a.totalLiquido).toBe(905.08);
  });

  it("valida abonos, descontos e líquido (Σ bate com os totais)", () => {
    expect(a.abonosValidados).toBe(true);
    expect(a.descontosValidados).toBe(true);
    expect(a.liquidoValidado).toBe(true);
  });

  it("mapeia as rubricas corretamente", () => {
    const r = extrairRubricas(a);
    expect(r.salarioBase).toBe(980);
    expect(r.subsidioRefeicaoDia).toBe(10.2);
    expect(r.subsidioRefeicaoDias).toBe(19);
    expect(r.subsidioRefeicaoTotal).toBe(193.8);
    expect(r.subsidioRefeicaoCartao).toBe(true);
    expect(r.feriados).toBe(65.33);
    expect(r.premio).toBe(26.67);
    expect(r.ssDesconto).toBe(117.92);
    expect(r.irsRetido).toBe(49);
  });
});

describe("analisarLayout — invalida quando a aritmética não fecha", () => {
  it("Σabonos ≠ total ilíquido → abonosValidados = false", () => {
    const a = analisarLayout(reciboExemplo("100,00")); // prémio adulterado
    expect(a.abonosValidados).toBe(false);
  });
});

describe("analisarLayout — associação de descrição multi-linha", () => {
  it("anexa a linha sem código/valor à descrição anterior", () => {
    const itens: ItemGeo[] = [
      it_("1", 40, 40), it_("Prémio anual de", 80, 40, 120), it_("100,00", 440, 40),
      it_("produtividade", 80, 70, 120), // continuação (sem código/valor)
      it_("TOTAL ILÍQUIDO :", 300, 110, 120), it_("100,00", 440, 110),
    ];
    const a = analisarLayout(itens);
    expect(a.abonos.length).toBe(1);
    expect(a.abonos[0].descricao).toContain("produtividade");
  });
});
