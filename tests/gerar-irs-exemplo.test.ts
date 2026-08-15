// Confere que o JSON da declaração continua a ser o que o MOTOR produz
// (gera-se com `npm run docs:dados`) e prende os invariantes que o documento
// promete ao leitor: se a soma dos escalões não bater com a coleta, ou se o
// saldo não for a diferença entre o apurado e o entregue, o documento está a
// mentir — e é melhor falhar aqui do que num PDF assinado pela marca.
import { describe, expect, it } from "vitest";
import { construirDeclaracaoExemplo, JSON_EXEMPLO_IRS } from "./exemplo-irs";
import { guardarOuConferir } from "./documento-exemplo";
import { dadosTypst } from "../src/lib/export/documento-irs";
import { arredondar } from "../src/lib/export/dinheiro";

describe("dados da declaração de exemplo", () => {
  it("são os que o motor produz, e é isso que o compositor lê", async () => {
    const doc = await construirDeclaracaoExemplo();
    const dados = dadosTypst(doc);
    guardarOuConferir(JSON_EXEMPLO_IRS, dados);

    expect(dados.proveniencia.referencia).toMatch(/^RC-2026-IRS-/);
    expect(dados.componentes.length).toBeGreaterThan(3);
  });

  it("o cenário exercita as secções condicionais todas", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    // Sem isto o protótipo compilaria sem nunca provar que estas secções
    // funcionam quando têm conteúdo — que é o único caso que interessa.
    expect(dados.escaloes.length, "escalões").toBeGreaterThan(1);
    expect(dados.deducoes.length, "deduções").toBeGreaterThan(1);
    expect(dados.memoria.length, "memória").toBeGreaterThan(1);
    expect(dados.funil.passos.length, "funil").toBeGreaterThan(1);
    expect(dados.identificacao.length, "identificação").toBeGreaterThan(1);
    // Estes dois só existem acima de 80 000 € de coletável. O cenário foi
    // subido de propósito para lá chegar: em baixo deles, o bloco do limite
    // global e a nota do adicional eram Typst que nunca compilava — e Typst
    // que nunca compila é Typst que se parte sem ninguém dar por isso.
    expect(dados.limiteDeducoes, "limite global do Art. 78.º n.º 7").not.toBeNull();
    expect(dados.adicionalSolidariedade, "adicional de solidariedade").toBeGreaterThan(0);
  });

  it("o limite global é coerente: o que se perdeu é o que passou do teto", async () => {
    const l = dadosTypst(await construirDeclaracaoExemplo()).limiteDeducoes!;
    expect(l.dentroDoLimite).toBe(l.limiteGlobal);
    expect(arredondar(l.somaBruta - l.limiteGlobal)).toBe(l.perdido);
  });

  it("a soma dos escalões é a coleta do englobamento", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    const soma = arredondar(dados.escaloes.reduce((s, e) => s + e.imposto, 0));
    expect(soma).toBe(dados.totalEscaloes.imposto);
    // A coleta acrescenta o adicional de solidariedade, quando existe.
    const coleta = dados.apuramento.find((l) => l.rubrica.startsWith("Coleta"));
    expect(arredondar(soma + dados.adicionalSolidariedade)).toBe(coleta?.valor);
  });

  it("arredondar as taxas a uma casa não perde precisão nenhuma", async () => {
    // A coluna mostra sempre uma casa decimal para ler alinhada. Isso só é
    // legítimo enquanto as taxas do Art. 68.º forem publicadas a uma casa; se
    // uma tabela futura trouxer 23,45%, este teste falha antes de o documento
    // mostrar 23,5% como se fosse o valor da lei.
    for (const e of dadosTypst(await construirDeclaracaoExemplo()).escaloes) {
      const semZeros = e.taxaTexto.replace(",0%", "%");
      expect(semZeros, `taxa ${e.taxaExata}`).toBe(e.taxaExata);
    }
  });

  it("o rendimento repartido pelos escalões é o coletável", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    expect(dados.totalEscaloes.rendimento).toBe(dados.totais.rendimentoColetavel);
  });

  it("o saldo é o que se apurou menos o que já se entregou", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    expect(arredondar(dados.pago - dados.irsTotal)).toBe(dados.saldo);
    expect(dados.resposta.devolve).toBe(dados.saldo >= 0);
    expect(dados.resposta.valor).toBe(arredondar(Math.abs(dados.saldo)));
  });

  it("os totais da tabela de rendimentos fecham com as linhas", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    for (const campo of ["bruto", "englobado", "autonomo"] as const) {
      const soma = arredondar(dados.componentes.reduce((s, c) => s + c[campo], 0));
      expect(soma, `coluna ${campo}`).toBe(dados.totalComponentes[campo]);
    }
  });

  it("não escreve rubricas de dedução a zero", async () => {
    const dados = dadosTypst(await construirDeclaracaoExemplo());
    for (const l of dados.deducoes) expect(l.valor).toBeGreaterThan(0);
  });
});
