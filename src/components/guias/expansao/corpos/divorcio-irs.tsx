import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEPENDENTES_IRS, GUARDA_PARTILHADA, MAIS_VALIAS_IMOBILIARIO_INCLUSAO, PENSAO_ALIMENTOS_IRS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 13.º (n.os 7 a 10), art. 78.º (n.os 9 a 12), art. 83.º-A e art. 43.º
// do CIRS.
export default function CorpoDivorcioIrs() {
  return (
    <>
      <Seccao titulo="O estado civil que conta é o de 31 de dezembro">
        <Paragrafo>
          É a regra que organiza tudo o resto, e está escrita no Código: a situação pessoal e familiar
          relevante para efeitos de tributação é a que se verificar{" "}
          <strong>{DEPENDENTES_IRS.situacaoRelevanteEm.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Quer dizer que um divórcio decretado em <strong>março</strong> e um decretado em{" "}
          <strong>dezembro</strong> têm o mesmo efeito sobre o ano inteiro: em ambos os casos, cada um
          declara individualmente. E um divórcio que só fique concluído em janeiro deixa o ano
          anterior inteiro com o estado civil antigo.
        </Paragrafo>
        <AvisoPrazo titulo="Não há declaração «meio casado»">
          Ao contrário do que acontece com a residência fiscal, aqui não há proporção nem repartição
          do ano. É uma fotografia de um dia só — e é o último do ano.
        </AvisoPrazo>
        <Nota titulo="A data que conta é a do trânsito em julgado">
          Não é a da separação de facto, nem a da conferência, nem a do acordo assinado. É a data em
          que o divórcio se torna definitivo. Confirma-a antes de decidir como declarar.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem declara os dependentes">
        <Paragrafo>
          O dependente integra o agregado do progenitor a que corresponder a{" "}
          <strong>residência determinada na regulação</strong> das responsabilidades parentais. Não
          tendo sido determinada, o agregado com que tiver <strong>identidade de domicílio
          fiscal</strong> no último dia do ano.
        </Paragrafo>
        <Paragrafo>
          Mas há uma segunda camada, e é a que gera confusão: exercendo-se as responsabilidades
          parentais em comum, o dependente <strong>pode constar das declarações de ambos</strong> para
          efeitos de imputação de rendimentos e de deduções.
        </Paragrafo>
        <AvisoPrazo titulo="Constar das duas declarações reduz as deduções a metade em cada uma">
          É automático:{" "}
          {pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} por sujeito passivo. Uma
          repartição diferente exige acordo que a fixe quantitativamente e comunicação de ambos, até
          ao fim de fevereiro.
        </AvisoPrazo>
        <Nota titulo="E nunca em dois agregados">
          Uma coisa é constar das duas declarações para imputação de deduções; outra, proibida, é
          fazer parte de dois agregados familiares. A lei é expressa quanto à segunda.
        </Nota>
        <VaiPara href="/guias/guarda-partilhada-irs">
          A comunicação de fevereiro, e o que acontece se divergirem
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas de saúde e educação: como se repartem">
        <Paragrafo>
          Seguem a mesma lógica das deduções por dependente. Constando o filho das duas declarações, as
          despesas que lhe respeitam são consideradas a{" "}
          {pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} em cada uma — salvo repartição
          diferente, acordada quantitativamente e comunicada por ambos.
        </Paragrafo>
        <Paragrafo>
          O que importa na prática: o <strong>NIF que consta da fatura</strong> não decide sozinho.
          Uma despesa lançada toda no NIF de um dos progenitores acaba repartida na mesma, se a
          repartição legal for essa.
        </Paragrafo>
        <AvisoPrazo titulo="Combinem em que NIF se pedem as faturas">
          Não muda a repartição legal, mas evita discussões e facilita a validação no e-Fatura. O
          hábito mais simples é pedir sempre no NIF do filho, quando ele já o tem.
        </AvisoPrazo>
        <VaiPara href="/guias/e-fatura">
          A validação de faturas, e o calendário do início do ano
        </VaiPara>
      </Seccao>

      <Seccao titulo="A casa de morada de família">
        <Paragrafo>
          Enquanto a partilha não estiver feita, o imóvel continua em compropriedade — e cada um
          responde pela sua quota nos impostos sobre o património e declara a sua parte dos
          rendimentos, se houver.
        </Paragrafo>
        <Paragrafo>
          Se um dos ex-cônjuges continua a viver na casa e o outro a pagar parte da prestação, isso é
          um arranjo entre os dois: não muda a titularidade nem o tratamento fiscal, que segue o que
          está no registo.
        </Paragrafo>
        <Nota titulo="Atualizem o domicílio fiscal de quem saiu">
          Continuar com o domicílio fiscal na casa de que se saiu é a origem de notificações perdidas
          e de deduções mal atribuídas. É uma alteração de minutos no Portal das Finanças.
        </Nota>
        <VaiPara href="/guias/portal-das-financas">
          Como se altera o domicílio fiscal, e o prazo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pensão de alimentos: quem deduz">
        <Paragrafo>
          Quem <strong>paga</strong> deduz à coleta{" "}
          <strong>{pctExato(PENSAO_ALIMENTOS_IRS.taxa.value)}</strong> das importâncias
          comprovadamente suportadas — desde que a obrigação resulte de{" "}
          {PENSAO_ALIMENTOS_IRS.exigeTituloJudicial.value}.
        </Paragrafo>
        <Paragrafo>
          E há a incompatibilidade que a lei escreve no mesmo número: <strong>ou deduzes a pensão, ou
          declaras o mesmo filho como dependente</strong>. Não as duas.
        </Paragrafo>
        <AvisoPrazo titulo="Um acordo entre pais, sem homologação, não abre o direito">
          É a falha mais comum de quem se divorcia por mútuo acordo e resolve tudo entre si. Homologar
          o acordo é o passo que transforma um arranjo privado num título com efeitos fiscais.
        </AvisoPrazo>
        <VaiPara href="/guias/pensao-alimentos-irs">
          A dedução, a prova exigida e a incompatibilidade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Bens partilhados e mais-valias futuras">
        <Passos
          passos={[
            {
              titulo: "A partilha em si não é, em regra, uma venda",
              texto: "Dividir o que já era de ambos não realiza mais-valia pela parte que já lhes pertencia. O que pode gerar tributação são as tornas — o valor pago para compensar quem fica com menos.",
            },
            {
              titulo: "Guardem o valor de aquisição original",
              texto: "É a partir dele que a mais-valia futura se mede, não do valor atribuído na partilha. Documentos de compra, escrituras, comprovativos de obras.",
            },
            {
              titulo: "Vender depois tributa metade da mais-valia",
              texto: `${pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} do saldo entre mais-valias e menos-valias é considerado, e vai às taxas progressivas.`,
            },
            {
              titulo: "O reinvestimento em habitação própria continua a valer",
              texto: "Quem vende a casa que era de morada de família e reinveste noutra habitação própria e permanente pode excluir a mais-valia, nas condições da lei.",
            },
            {
              titulo: "E confirmem quem declara o quê no ano da partilha",
              texto: "É o ano em que as duas declarações mais divergem. Vale a pena confrontá-las antes de submeter — uma divergência entre ex-cônjuges resolve-se pior do que qualquer outra.",
            },
          ]}
        />
        <VaiPara href="/guias/mais-valias-imoveis">
          A mais-valia da venda, com o reinvestimento
        </VaiPara>
        <VaiPara href="/guias/tributacao-conjunta">
          A tributação conjunta, que deixa de estar disponível
        </VaiPara>
      </Seccao>
    </>
  );
}
