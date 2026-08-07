import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  DEDUCAO_DEFICIENCIA_COLETA,
  DEDUCAO_DEFICIENCIA_GRAU_MINIMO,
  DEDUCAO_DEPENDENTE,
  DEFICIENCIA_ART87,
  DEPENDENTES_IRS,
  EXCLUSAO_DEFICIENCIA_MAX,
  EXCLUSAO_DEFICIENCIA_TAXA,
  EXCLUSAO_DEFICIENCIA_TAXA_PENSOES,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 56.º-A e art. 87.º (n.os 1 a 9, o n.º 9 na redação da Lei n.º
// 82/2023) do CIRS, e art. 13.º, n.º 5, al. c) quanto aos dependentes
// inaptos para o trabalho.
//
// O pacote avisa: «os montantes e o grau mínimo de incapacidade são
// atualizados — ler o CIRS e o EBF em vigor, e não replicar valores de
// artigos de imprensa». Foi o que se fez: o grau consta do n.º 5 do art.
// 87.º (e não do art. 56.º-A, onde é frequente vê-lo atribuído), e todos
// os montantes desta página vêm do motor, indexados ao IAS.
export default function CorpoDeficienciaIrs() {
  return (
    <>
      <Seccao titulo="O atestado multiuso: o documento que abre tudo">
        <Paragrafo>
          Antes de qualquer benefício, há um documento — e sem ele nenhum dos outros existe. O{" "}
          <strong>atestado médico de incapacidade multiuso</strong> é o que certifica o grau de
          incapacidade, e é a chave de todo este regime.
        </Paragrafo>
        <Paragrafo>
          Obtém-se por junta médica, mediante requerimento, e demora. Não é um documento que se pede
          quando se vai entregar a declaração: é um documento que se trata com meses de
          antecedência.
        </Paragrafo>
        <AvisoPrazo titulo="Tem validade, e a validade caduca em silêncio">
          Um atestado com prazo que expira suspende os benefícios a partir daí — sem que ninguém
          avise. Verifica a data de validade do teu, hoje, e trata da renovação com antecedência.
        </AvisoPrazo>
        <Nota titulo="É «multiuso» porque serve para tudo">
          O mesmo atestado é usado no IRS, nos apoios sociais, na isenção de IUC, nos benefícios de
          acesso e na contratação. Pedir uma vez resolve várias frentes — e é a razão pela qual vale a
          pena tratar dele mesmo quando o benefício imediato parece pequeno.
        </Nota>
      </Seccao>

      <Seccao titulo="O grau de incapacidade exigido">
        <Paragrafo>
          O Código do IRS define-o numa frase: considera-se pessoa com deficiência aquela que
          apresente um grau de incapacidade permanente, comprovado por atestado médico de
          incapacidade multiuso, <strong>igual ou superior a{" "}
          {DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value}%</strong>. Abaixo desse grau, os benefícios deste
          regime não se aplicam.
        </Paragrafo>
        <Paragrafo>
          Há um <strong>segundo grau</strong>, que muita gente não sabe que existe: a partir de{" "}
          <strong>{DEFICIENCIA_ART87.grauAcompanhamento.value}%</strong> de invalidez permanente
          acresce a dedução por despesa de acompanhamento, tratada mais abaixo.
        </Paragrafo>
        <Nota titulo="O grau está no artigo 87.º, não no 56.º-A">
          É um pormenor com consequências, porque é frequente vê-lo atribuído ao artigo errado. O
          art. 56.º-A trata da exclusão de rendimentos e não fala em graus; a definição está no n.º 5
          do art. 87.º, que é também o artigo das deduções.
        </Nota>
        <AvisoPrazo titulo="Não confies em valores lidos na imprensa">
          É o aviso que o próprio levantamento que originou este guia deixa escrito: os montantes são
          atualizados todos os anos com o IAS, e artigos antigos continuam a circular com números que
          já não valem. Os desta página vêm do motor, e sobem sozinhos.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Perder o grau numa reavaliação não corta a dedução de uma vez">
        <Paragrafo>
          É uma das situações mais duras deste regime, e desde a Lei n.º 82/2023 tem resposta
          própria: quem beneficiou da dedução durante pelo menos{" "}
          <strong>{DEFICIENCIA_ART87.descidaAnosMinimosBeneficio.value} anos</strong> e, numa revisão
          ou reavaliação, deixa de reunir os requisitos, não passa de tudo a nada.
        </Paragrafo>
        <Paragrafo>
          A dedução desce em escada ao longo dos quatro anos seguintes —{" "}
          {DEFICIENCIA_ART87.descidaAposReavaliacao.value.map((v) => `${v.toString().replace(".", ",")} IAS`).join(", ")}{" "}
          — desde que se mantenha uma incapacidade de pelo menos{" "}
          <strong>{DEFICIENCIA_ART87.descidaGrauMinimo.value}%</strong>.
        </Paragrafo>
        <Nota titulo="É um direito, não um favor">
          Está escrito no n.º 9 do art. 87.º. Se te aconteceu e a liquidação não o refletiu, é caso
          para reclamação graciosa — e o prazo conta-se do termo do pagamento voluntário.
        </Nota>
        <VaiPara href="/guias/contestar-liquidacao">
          Como se reclama de uma liquidação, e em que prazo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Exclusão parcial de rendimentos">
        <Paragrafo>
          É o benefício maior, e funciona antes de tudo o resto: uma parte dos rendimentos do
          trabalho — categorias A e B — fica <strong>fora da tributação</strong>.
        </Paragrafo>
        <Paragrafo>
          A lei escreve-o pelo avesso: nas categorias A e B os rendimentos brutos «são considerados
          apenas por {pctExato(1 - EXCLUSAO_DEFICIENCIA_TAXA.value)}» — ou seja, a fração excluída é
          de <strong>{pctExato(EXCLUSAO_DEFICIENCIA_TAXA.value)}</strong>. Nas{" "}
          <strong>pensões</strong>, a categoria H, são considerados por{" "}
          {pctExato(1 - EXCLUSAO_DEFICIENCIA_TAXA_PENSOES.value)}, o que dá uma exclusão de apenas{" "}
          <strong>{pctExato(EXCLUSAO_DEFICIENCIA_TAXA_PENSOES.value)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="As duas frações são diferentes — e é o erro que mais se repete">
          Uma pensão não tem a mesma exclusão que um salário. Quem aplica a fração do trabalho a uma
          pensão calcula a menos, e a liquidação não vai bater certo.
        </AvisoPrazo>
        <Paragrafo>
          O teto é de <strong>{fmt(EXCLUSAO_DEFICIENCIA_MAX.value)}</strong> — e a lei diz{" "}
          <strong>por categoria de rendimentos</strong>, não por titular. Quem tem salário e pensão
          tem dois tetos, um para cada categoria.
        </Paragrafo>
        <Nota titulo="Exclui rendimento, não reduz a taxa">
          É a mesma distinção de outros regimes de exclusão: a parte excluída não entra no englobamento
          e, por isso, nem paga imposto nem conta para determinar o escalão. O que sobra é tributado
          normalmente.
        </Nota>
      </Seccao>

      <Seccao titulo="As deduções à coleta, e o facto de se somarem">
        <Paragrafo>
          O art. 87.º dá <strong>três</strong> deduções que a lei manda somar — o n.º 8 di-lo por
          palavras: {DEFICIENCIA_ART87.cumulativas.value}.
        </Paragrafo>
        <Paragrafo>
          · <strong>{fmt(DEDUCAO_DEFICIENCIA_COLETA.value)}</strong> por cada sujeito passivo com
          deficiência (quatro vezes o IAS);
          <br />·{" "}
          <strong>{fmt(DEFICIENCIA_ART87.dependenteOuAscendente.value)}</strong> por cada dependente
          ou ascendente com deficiência;
          <br />· mais <strong>{fmt(DEFICIENCIA_ART87.acompanhamento.value)}</strong> a título de
          despesa de acompanhamento, a partir de{" "}
          {DEFICIENCIA_ART87.grauAcompanhamento.value}% de invalidez;
          <br />· e mais <strong>{fmt(DEFICIENCIA_ART87.forcasArmadas.value)}</strong> no caso da
          deficiência das Forças Armadas.
        </Paragrafo>
        <Nota titulo="Sobem sozinhas todos os anos">
          Nenhum destes valores está fixado em euros na lei: são múltiplos do IAS. Quando o IAS sobe,
          sobem com ele — e é por isso que valores lidos em artigos de há dois anos estão sempre
          errados por defeito.
        </Nota>
        <AvisoPrazo titulo="Aplica-se por titular, não por agregado">
          Havendo dois titulares com deficiência no mesmo agregado, cada um tem a sua exclusão, o seu
          teto e as suas deduções. É um detalhe que muda o resultado em casais.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Deduções específicas que se acumulam">
        <Paragrafo>
          Aos benefícios próprios da deficiência somam-se as deduções comuns — não as substituem.
        </Paragrafo>
        <Paragrafo>
          Um dependente com deficiência continua a dar a dedução por dependente de{" "}
          <strong>{fmt(DEDUCAO_DEPENDENTE.value)}</strong>, e as suas despesas de saúde, educação e
          gerais familiares continuam a contar — com as deduções específicas do regime da deficiência
          por cima.
        </Paragrafo>
        <Paragrafo>
          E há duas que só existem neste regime:{" "}
          <strong>{pctExato(DEFICIENCIA_ART87.educacaoEReabilitacao.value)}</strong> da totalidade
          das despesas com <strong>educação e reabilitação</strong>, sem teto próprio no artigo, e{" "}
          <strong>{pctExato(DEFICIENCIA_ART87.premiosSeguroVida.value)}</strong> dos prémios de
          seguros de vida ou contribuições a associações mutualistas que garantam exclusivamente os
          riscos de morte, invalidez ou reforma por velhice.
        </Paragrafo>
        <AvisoPrazo titulo="A dedução dos prémios tem um travão próprio">
          Não pode exceder {pctExato(DEFICIENCIA_ART87.limitePremiosNaColeta.value)} da coleta de
          IRS. E, tratando-se de contribuições para reforma por velhice, há ainda um limite em euros —{" "}
          {fmt(DEFICIENCIA_ART87.limiteContribuicoesReforma.value)} para quem não é casado e{" "}
          {fmt(DEFICIENCIA_ART87.limiteContribuicoesReformaCasados.value)} para casados não separados
          judicialmente — e condições de idade e duração do contrato que constam do n.º 3.
        </AvisoPrazo>
        <Nota titulo="E não há limite de idade para dependentes inaptos">
          Os filhos maiores <strong>inaptos para o trabalho e para angariar meios de
          subsistência</strong> são dependentes sem o teto dos {DEPENDENTES_IRS.idadeMaxima.value}{" "}
          anos que se aplica aos restantes maiores. É uma alínea autónoma do art. 13.º.
        </Nota>
        <VaiPara href="/guias/dependentes-irs">
          Quem é dependente, e até quando
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas com acompanhamento">
        <Paragrafo>
          A dedução por <strong>despesa de acompanhamento</strong> — {fmt(DEFICIENCIA_ART87.acompanhamento.value)}{" "}
          por titular ou dependente com grau de invalidez de{" "}
          {DEFICIENCIA_ART87.grauAcompanhamento.value}% ou mais — é atribuída pelo grau, e não pela
          fatura. Não é preciso comprovar despesas para a ter.
        </Paragrafo>
        <Paragrafo>
          O que exige documento são os <strong>encargos</strong> propriamente ditos: equipamentos,
          apoios especializados, serviços de reabilitação, cada um com as suas regras.
        </Paragrafo>
        <Paragrafo>
          Vale a pena guardar tudo com fatura e NIF, ainda que não tenhas a certeza de que conta. É a
          diferença entre poder decidir depois e não ter opção.
        </Paragrafo>
        <AvisoPrazo titulo="Muitas destas despesas não passam pelo e-Fatura">
          Serviços de apoio, equipamentos comprados no estrangeiro, prestações de cuidadores.
          Declaram-se manualmente — e o ónus da prova é de quem as declara.
        </AvisoPrazo>
        <VaiPara href="/guias/e-fatura">
          O que se declara manualmente, e como
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se declara">
        <Passos
          passos={[
            {
              titulo: "Confirmar que o atestado está válido a 31 de dezembro",
              texto: "É a data que fixa a situação pessoal e familiar relevante. Um atestado que caducou durante o ano exige verificar o efeito no ano em causa.",
            },
            {
              titulo: "Assinalar a incapacidade na declaração, por titular",
              texto: "É o que ativa a exclusão parcial e as deduções específicas. Não é automático por a AT ter o atestado noutro sistema.",
            },
            {
              titulo: "Declarar as despesas específicas nos campos próprios",
              texto: "As que não vieram pelo e-Fatura declaram-se à mão, e os documentos guardam-se.",
            },
            {
              titulo: "Verificar o efeito do limite global das deduções",
              texto: "Continua a aplicar-se. Quem já está no teto não ganha por acrescentar despesas — vale a pena confirmar antes de investir tempo a reunir documentos.",
            },
            {
              titulo: "Simular com e sem o regime",
              texto: "É a forma de ver o que cada peça vale no teu caso concreto, em vez de assumir.",
            },
            {
              titulo: "E renovar o atestado antes de expirar",
              texto: "É a manutenção que mantém tudo isto vivo, e a que mais gente esquece.",
            },
          ]}
        />
        <VaiPara href="/dashboard/simulador">
          Simular o IRS com o regime aplicado
        </VaiPara>
        <VaiPara href="/guias/deducoes-coleta">
          O limite global das deduções à coleta
        </VaiPara>
      </Seccao>
    </>
  );
}
