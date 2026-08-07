import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEPENDENTES_IRS, GUARDA_PARTILHADA } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 13.º (n.os 5, 8, 9 e 10) e art. 78.º (n.os 9 a 12) do CIRS — o n.º
// 11 já na redação do Decreto-Lei n.º 49/2025.
export default function CorpoGuardaPartilhadaIrs() {
  return (
    <>
      <Seccao titulo="O que se comunica e onde">
        <Paragrafo>
          Quando as responsabilidades parentais são exercidas em comum e os progenitores não estão no
          mesmo agregado, há duas coisas a resolver — e só uma delas se comunica.
        </Paragrafo>
        <Paragrafo>
          A primeira é <strong>onde o dependente é considerado</strong>, e essa não se escolhe: a lei
          diz que integra o agregado do progenitor a que corresponder a{" "}
          <strong>residência determinada na regulação</strong> das responsabilidades parentais; não
          tendo sido determinada, o agregado com que o dependente tenha{" "}
          <strong>identidade de domicílio fiscal</strong> no último dia do ano.
        </Paragrafo>
        <Paragrafo>
          A segunda é a <strong>percentagem de repartição das despesas</strong> — e é essa que se
          comunica no Portal das Finanças, por ambos.
        </Paragrafo>
        <Nota titulo="O dependente pode constar das duas declarações">
          A lei permite-o expressamente, para efeitos de imputação de rendimentos e de deduções. O que
          não pode é fazer parte de <em>dois agregados familiares</em> — que é coisa diferente.
        </Nota>
      </Seccao>

      <Seccao titulo="O prazo anual">
        <Paragrafo>
          A comunicação faz-se <strong>{GUARDA_PARTILHADA.prazoComunicacao.value}</strong>, no Portal
          das Finanças — e é <strong>anual</strong>: repete-se todos os anos, ainda que nada tenha
          mudado.
        </Paragrafo>
        <Paragrafo>
          Tem de ser feita por <strong>ambos</strong> os progenitores. Uma comunicação sozinha não
          fixa a repartição; fixa metade da informação de que a AT precisa.
        </Paragrafo>
        <AvisoPrazo titulo="É o primeiro prazo fiscal do ano, e o mais esquecido">
          Cai antes de tudo o resto — antes da validação de faturas, muito antes da entrega da
          declaração. E não há aviso: quem não souber que existe simplesmente perde-o.
        </AvisoPrazo>
        <VaiPara href="/guias/e-fatura">
          O calendário do início do ano, passo a passo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Percentagem de repartição das despesas">
        <Paragrafo>
          A regra de base é simples e automática: sempre que o mesmo dependente conste de{" "}
          <strong>mais do que uma declaração</strong>, o valor das deduções à coleta que lhe dizem
          respeito é reduzido a{" "}
          <strong>{pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)}</strong> por sujeito
          passivo.
        </Paragrafo>
        <Paragrafo>
          Uma repartição <em>diferente</em> de metade é possível — mas exige duas condições, e as duas
          são exigentes:
        </Paragrafo>
        <Paragrafo>
          · o acordo de regulação tem de estabelecer uma partilha não igualitária{" "}
          <strong>e fixar quantitativamente</strong> a percentagem que respeita a cada progenitor;
          <br />· e ambos têm de a <strong>comunicar</strong> no prazo.
        </Paragrafo>
        <AvisoPrazo titulo="Um acordo que diga «as despesas são repartidas» não chega">
          A lei exige que o acordo fixe a percentagem quantitativamente. Uma cláusula genérica sobre
          repartição de despesas não permite afastar a divisão a meio — por muito que na prática
          seja outra a proporção.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que acontece quando as comunicações divergem">
        <Paragrafo>
          A lei resolve isso de uma forma que não deixa margem: não havendo comunicação, ou{" "}
          <strong>não somando as percentagens comunicadas a totalidade</strong>,{" "}
          {GUARDA_PARTILHADA.supletivo.value}.
        </Paragrafo>
        <Paragrafo>
          Repara no detalhe: não é preciso haver conflito. Basta que as duas percentagens comunicadas
          não encaixem uma na outra — se cada um comunicar mais do que a parte que lhe cabe, a soma
          ultrapassa a totalidade, não fecha, e a repartição volta a ser metade para cada um. Um erro
          de digitação produz o mesmo resultado que uma discordância.
        </Paragrafo>
        <AvisoPrazo titulo="Combinem os números antes de comunicar">
          É a única forma de garantir que fecham. Uma mensagem com as duas percentagens acordadas,
          antes de qualquer um submeter, evita descobrir em julho que a repartição não foi a que se
          tinha acordado.
        </AvisoPrazo>
        <Nota titulo="A regra supletiva não é um castigo">
          É a solução por defeito, e para muitas famílias é a correta. O problema é apenas para quem
          suporta claramente mais do que metade e conta com isso.
        </Nota>
      </Seccao>

      <Seccao titulo="Residência alternada e o seu efeito">
        <Paragrafo>
          Em residência alternada, o dependente vive parte do tempo com cada progenitor — e a
          pergunta «em que agregado é considerado» deixa de ter resposta óbvia.
        </Paragrafo>
        <Paragrafo>
          A lei resolve-o pela mesma escada: primeiro, a <strong>residência determinada na
          regulação</strong>; não estando determinada, a <strong>identidade de domicílio fiscal</strong>{" "}
          no último dia do ano.
        </Paragrafo>
        <AvisoPrazo titulo="O domicílio fiscal do dependente é a peça decisiva">
          É o que resolve os casos em que a regulação não fixou residência. E é uma coisa concreta,
          registada no cadastro da AT — que convém confirmar antes de 31 de dezembro, e não em
          junho.
        </AvisoPrazo>
        <Nota titulo="A situação que conta é a de 31 de dezembro">
          {DEPENDENTES_IRS.situacaoRelevanteEm.value} — é o que a lei fixa. Alterações feitas em
          janeiro produzem efeitos no ano seguinte, não no que acabou.
        </Nota>
        <VaiPara href="/guias/portal-das-financas">
          Onde se confirma e se altera o domicílio fiscal
        </VaiPara>
      </Seccao>

      <Seccao titulo="Corrigir depois do prazo">
        <Passos
          passos={[
            {
              titulo: "Confirmar o que cada um comunicou",
              texto: "No Portal das Finanças. Metade dos problemas resolve-se ao descobrir que um dos dois não comunicou de todo.",
            },
            {
              titulo: "Se o prazo passou, a repartição é a supletiva",
              texto: "As deduções dividem-se em partes iguais. Não é um erro a corrigir — é o que a lei manda aplicar nessa situação.",
            },
            {
              titulo: "Verificar antes de entregar a declaração",
              texto: "As deduções apuradas já refletem a repartição. Entregar sem olhar é aceitar uma repartição que pode não ser a acordada.",
            },
            {
              titulo: "Havendo erro na própria declaração, substituir",
              texto: "A declaração de substituição corrige o que foi declarado. Não altera, porém, a comunicação de fevereiro nem a repartição que dela resultou.",
            },
            {
              titulo: "E marcar o prazo para o ano seguinte",
              texto: "É anual. Um ano bem comunicado não resolve o seguinte, e a repetição é o que mais falha.",
            },
          ]}
        />
        <VaiPara href="/guias/dependentes-irs">
          Até quando um filho conta como dependente
        </VaiPara>
        <VaiPara href="/guias/pensao-alimentos-irs">
          A pensão de alimentos, e a incompatibilidade com o dependente
        </VaiPara>
      </Seccao>
    </>
  );
}
