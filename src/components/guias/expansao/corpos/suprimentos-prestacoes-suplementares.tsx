import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ICE, IRC_TAXA_GERAL, IRC_TAXA_PME, IRC_LIMITE_PME } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026. O efeito no ICE vem do art. 43.º-D do
// EBF (n.os 1 e 6), lido no articulado. O regime societário de cada figura
// consta do Código das Sociedades Comerciais, que não tem articulado
// verificável no Portal das Finanças — o guia descreve o mecanismo e não
// cita números de artigos que não pôde confirmar.
export default function CorpoSuprimentosPrestacoesSuplementares() {
  return (
    <>
      <Seccao titulo="Numa és credor, na outra és investidor">
        <Paragrafo>
          É a distinção que tudo o resto segue, e não é uma questão de nome: é uma questão de{" "}
          <strong>onde o dinheiro aparece no balanço</strong>.
        </Paragrafo>
        <Paragrafo>
          · <strong>Suprimento</strong> — é um empréstimo do sócio à sociedade. Fica no{" "}
          <strong>passivo</strong>. A sociedade deve-te esse dinheiro, e tu és credor dela.
          <br />· <strong>Prestação suplementar</strong> — integra o <strong>capital próprio</strong>.
          Não é dívida. Não te torna credor de nada.
        </Paragrafo>
        <AvisoPrazo titulo="E é isso que decide o que acontece numa insolvência">
          Como credor por suprimentos entras no concurso de credores — ainda que em posição
          subordinada, atrás dos restantes. Como titular de prestações suplementares estás na fila do
          capital próprio, que é a última de todas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Como se recupera cada uma">
        <Paragrafo>
          Um suprimento <strong>reembolsa-se</strong>, nos termos acordados. É uma dívida a pagar como
          outra qualquer, sem depender de haver lucros.
        </Paragrafo>
        <Paragrafo>
          Uma prestação suplementar só se restitui <strong>havendo situação líquida que o
          permita</strong> e <strong>por deliberação</strong>. Não basta a empresa ter dinheiro em
          caixa: é preciso que o capital próprio, depois da restituição, continue a cobrir o capital
          social e as reservas legais.
        </Paragrafo>
        <Nota titulo="A prestação suplementar não vence juros">
          É da natureza da figura. Um sócio que queira remuneração pelo dinheiro que entrou está a
          falar de suprimentos — ou de dividendos.
        </Nota>
      </Seccao>

      <Seccao titulo="Os juros dos suprimentos, e o imposto que trazem">
        <Paragrafo>
          Um suprimento <strong>pode</strong> vencer juros. Vencendo, esses juros são rendimento de
          capitais na esfera do sócio, com retenção na fonte, e gasto na esfera da sociedade — com as
          limitações à dedutibilidade dos gastos de financiamento a aplicarem-se.
        </Paragrafo>
        <AvisoPrazo titulo="Entre partes relacionadas, a taxa tem de ser de mercado">
          Um suprimento a juro muito acima do mercado é uma distribuição de lucros disfarçada, e é
          tratado como tal. Um a juro zero também tem de ser justificado. As regras de preços de
          transferência não desaparecem por ser família.
        </AvisoPrazo>
        <Paragrafo>
          O contrato de suprimento tem também implicações em imposto do selo, consoante a modalidade e
          o prazo. É um ponto a confirmar antes de formalizar, não depois.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O ICE só vê uma das duas">
        <Paragrafo>
          É a diferença fiscal com mais peso, e a que quase nunca entra na conversa: as{" "}
          <strong>entradas em dinheiro no capital próprio</strong> contam como aumento de capitais
          próprios elegíveis para o incentivo à capitalização. Os <strong>suprimentos, sendo
          dívida, não contam</strong>.
        </Paragrafo>
        <Paragrafo>
          A dedução ao lucro tributável corresponde à Euribor a 12 meses do período, adicionada de um
          spread de {ICE.spread.value * 100} pontos percentuais, aplicada a esse aumento líquido.
          Financiar a empresa por prestações suplementares em vez de suprimentos ativa esse benefício;
          o contrário não.
        </Paragrafo>
        <AvisoPrazo titulo="E devolver o dinheiro reduz o benefício acumulado">
          As saídas a favor dos titulares entram, com sinal negativo, no cálculo dos aumentos{" "}
          <em>líquidos</em> — e a janela de apuramento abrange{" "}
          {ICE.periodosAnteriores.value} períodos anteriores. Uma restituição num ano corta o que se
          acumulou nos anteriores.
        </AvisoPrazo>
        <VaiPara href="/guias/ice-capitalizacao">
          O incentivo à capitalização, com os dois limites e o reporte
        </VaiPara>
      </Seccao>

      <Seccao titulo="Qual escolher, e com que ordem de grandeza">
        <Paragrafo>
          Para referência da conta: o IRC tem taxa geral de{" "}
          <strong>{pctExato(IRC_TAXA_GERAL.value)}</strong> e taxa reduzida de{" "}
          <strong>{pctExato(IRC_TAXA_PME.value)}</strong> sobre os primeiros{" "}
          {fmt(IRC_LIMITE_PME.value)} de matéria coletável das PME. É contra estes números que a
          dedução do incentivo vale o que vale.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Se o dinheiro é para voltar em breve: suprimento",
              texto: "Reembolsa-se sem depender de lucros nem de deliberação. É a figura desenhada para tesouraria temporária.",
            },
            {
              titulo: "Se é para ficar e reforçar a empresa: prestações suplementares",
              texto: "Entram no capital próprio, melhoram os rácios perante bancos e concursos, e ativam o incentivo à capitalização.",
            },
            {
              titulo: "Verificar primeiro se o contrato social as prevê",
              texto: "As prestações suplementares exigem previsão no pacto social. Não estando lá, o passo anterior é alterá-lo — e isso demora.",
            },
            {
              titulo: "Formalizar por escrito, seja qual for a escolha",
              texto: "Uma transferência do sócio para a empresa sem documento é o convite mais direto a que a administração fiscal a qualifique de outra maneira.",
            },
            {
              titulo: "Decidir os juros de propósito",
              texto: "A taxa, se houver, tem de ser justificável face ao mercado. E não havendo, isso também se escreve.",
            },
            {
              titulo: "Contar o efeito no incentivo antes de restituir",
              texto: "Uma restituição bem cronometrada custa muito menos do que uma feita no ano errado.",
            },
          ]}
        />
        <VaiPara href="/guias/distribuir-lucros">
          A terceira via: distribuir, e o que isso custa
        </VaiPara>
        <VaiPara href="/guias/salario-gerente-ou-dividendos">
          Como retirar valor da empresa, comparado
        </VaiPara>
      </Seccao>

      <Seccao titulo="Imposto do selo sobre o financiamento">
        <Paragrafo>
          O financiamento de sócios não é neutro em imposto do selo. A Tabela Geral tributa as
          operações de concessão de crédito, com taxas que variam consoante o <strong>prazo</strong> —
          e há isenções aplicáveis a certos financiamentos entre sócios e sociedade, sujeitas a
          condições.
        </Paragrafo>
        <Paragrafo>
          Este guia não publica taxas nem condições concretas: dependem da modalidade, do prazo e do
          enquadramento das partes, e um número errado aqui custa mais do que a ausência dele.
          Confirma-as antes de formalizar — não depois.
        </Paragrafo>
        <AvisoPrazo titulo="É o custo que mais aparece à posteriori">
          Um suprimento sem prazo definido não é o mesmo, para este efeito, que um suprimento a um
          ano. Definir o prazo no contrato é uma decisão fiscal, não apenas jurídica.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O efeito nos rácios, que decide financiamentos">
        <Paragrafo>
          Um banco olha para o <strong>capital próprio</strong> e para a autonomia financeira. Um
          suprimento não melhora nenhum dos dois: é passivo, e piora o rácio de endividamento.
        </Paragrafo>
        <Paragrafo>
          Prestações suplementares, entrando no capital próprio, melhoram-no diretamente. Duas empresas
          com exatamente o mesmo dinheiro em caixa apresentam-se de forma muito diferente consoante a
          figura escolhida — e isso decide taxas de juro e limites de crédito.
        </Paragrafo>
        <Nota titulo="Vale também em concursos e candidaturas">
          Muitos programas exigem níveis mínimos de capital próprio. É um requisito que se resolve com
          a escolha da figura certa, meses antes de a candidatura abrir.
        </Nota>
        <VaiPara href="/guias/obrigacoes-societarias">
          A deliberação e a ata que as prestações suplementares exigem
        </VaiPara>
      </Seccao>
    </>
  );
}
