import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IS_TRANSMISSAO_GRATUITA, TRANSMISSAO_GRATUITA_PARTICIPACAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// arts. 1.º, 2.º, 6.º, 9.º, 23.º, 26.º, 28.º e 44.º do Código do Imposto do
// Selo, e a verba 1.2 da Tabela Geral.
//
// O pacote manda «confirmar o prazo e a competência de entrega no art. 26.º
// e 28.º CIS em vigor». Confirmado: o prazo é até ao final do 3.º mês
// seguinte ao nascimento da obrigação tributária, e a participação é
// apresentada em qualquer serviço de finanças.
export default function CorpoHerancasImpostoSelo() {
  return (
    <>
      <Seccao titulo="Quem está isento e quem paga">
        <Paragrafo>
          A primeira coisa a dizer é a que tira o peso à maioria dos casos: em Portugal{" "}
          <strong>não existe imposto sucessório</strong>. Foi abolido em 2004. O que existe é imposto
          do selo sobre as transmissões gratuitas — e a família direta está{" "}
          <strong>isenta</strong>.
        </Paragrafo>
        <Paragrafo>
          Estão isentos <strong>{TRANSMISSAO_GRATUITA_PARTICIPACAO.isentos.value}</strong>. Pagam os
          restantes: irmãos, sobrinhos, tios, primos, amigos, e qualquer beneficiário sem relação de
          parentesco na linha reta.
        </Paragrafo>
        <AvisoPrazo titulo="A isenção é do imposto, não da participação">
          É o ponto que este guia existe para dizer. Estar isento não dispensa de participar a
          transmissão à AT — e a falta da participação é uma infração autónoma, independente de haver
          ou não imposto a pagar.
        </AvisoPrazo>
        <Nota titulo="Unido de facto conta, e conta como cônjuge">
          A alínea da isenção fala expressamente de «cônjuge ou unido de facto». O que se exige é a
          prova da união de facto nos termos da lei civil.
        </Nota>
      </Seccao>

      <Seccao titulo="A taxa e sobre que valor incide">
        <Paragrafo>
          A taxa é de <strong>{pctExato(IS_TRANSMISSAO_GRATUITA.value)}</strong>, e é{" "}
          <strong>proporcional</strong> — não progressiva. Não há escalões: quem paga, paga a mesma
          percentagem sobre um milhão ou sobre dez mil.
        </Paragrafo>
        <Paragrafo>
          Incide sobre o valor dos bens transmitidos, apurado segundo as regras do Código: nos
          imóveis, o valor patrimonial tributário; nos valores mobiliários, a cotação ou o valor
          apurado nos termos legais; nos depósitos, o saldo.
        </Paragrafo>
        <Nota titulo="Não confundir com a mais-valia futura">
          O imposto do selo cobra-se na transmissão. A mais-valia cobra-se se e quando o herdeiro{" "}
          <em>vender</em> — e aí o valor de aquisição é o que serviu de base à liquidação do selo, ou
          o que serviria se ele fosse devido.
        </Nota>
        <VaiPara href="/guias/herdar-imovel">
          Herdar um imóvel: o que se paga na herança e o que se paga na venda
        </VaiPara>
      </Seccao>

      <Seccao titulo="A participação Modelo 1 e o prazo">
        <Paragrafo>
          A participação faz-se em modelo oficial e deve ser apresentada{" "}
          <strong>até ao final do {TRANSMISSAO_GRATUITA_PARTICIPACAO.prazoMeses.value}.º mês
          seguinte</strong> ao do nascimento da obrigação tributária — que, numa herança, é a data do
          óbito.
        </Paragrafo>
        <Paragrafo>
          Identifica o autor da sucessão ou da liberalidade, as datas e locais, os sucessores ou
          donatários, as <strong>relações de parentesco e a respetiva prova</strong>, e a relação dos
          bens transmitidos com os valores a declarar.
        </Paragrafo>
        <AvisoPrazo titulo="Os prazos são improrrogáveis, com uma exceção">
          A lei di-lo expressamente. Só alegando <em>e provando</em> motivo justificado pode o chefe
          de finanças conceder adiamento — até ao limite máximo de{" "}
          {TRANSMISSAO_GRATUITA_PARTICIPACAO.adiamentoMaximoDias.value} dias. Não é um pedido de
          cortesia: é fundamentado.
        </AvisoPrazo>
        <Nota titulo="É onde se prova o parentesco que dá a isenção">
          A isenção não é automática por a AT saber quem és: é reconhecida a partir da prova de
          parentesco junta à participação. Sem participação, não há prova — e sem prova não há
          isenção reconhecida.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem entrega: cabeça de casal e herdeiros">
        <Paragrafo>
          A lei obriga <strong>{TRANSMISSAO_GRATUITA_PARTICIPACAO.quemParticipa.value}</strong> — os
          dois. Mas há uma regra que simplifica quase todas as heranças:
        </Paragrafo>
        <Paragrafo>
          identificando o cabeça-de-casal <strong>todos os beneficiários</strong>, se tiver os
          elementos para isso, os beneficiários ficam <strong>desonerados</strong> da participação
          que lhes competiria.
        </Paragrafo>
        <AvisoPrazo titulo="Combinem quem participa, e confirmem que foi feito">
          É a origem do incumprimento mais comum: cada herdeiro assume que outro tratou disso. Uma
          mensagem no grupo da família, com o comprovativo, resolve o problema antes de ele existir.
        </AvisoPrazo>
        <Nota titulo="O cabeça-de-casal não é uma escolha livre">
          A lei civil define quem o é, por uma ordem — cônjuge sobrevivo, testamenteiro, herdeiros
          legais. Se há dúvida sobre quem assume esse papel, é matéria de direito das sucessões e
          resolve-se com um advogado ou um notário.
        </Nota>
      </Seccao>

      <Seccao titulo="Herança indivisa e rendimentos que ela gere">
        <Paragrafo>
          Entre o óbito e a partilha, os bens ficam numa <strong>herança indivisa</strong> — e ela
          pode gerar rendimentos: rendas de um imóvel arrendado, juros, dividendos, ou o resultado de
          uma atividade que continue.
        </Paragrafo>
        <Paragrafo>
          Esses rendimentos <strong>não ficam à espera da partilha</strong>: são imputados aos
          herdeiros na proporção das suas quotas e declarados por cada um, no ano em que se produzem.
        </Paragrafo>
        <AvisoPrazo titulo="A herança indivisa tem NIF próprio">
          Pede-se nas finanças, e é ele que permite faturar rendas, cumprir obrigações e identificar
          a herança perante terceiros. Sem NIF, os herdeiros acabam a usar o número de um deles — e a
          criar uma confusão que dura anos.
        </AvisoPrazo>
        <VaiPara href="/guias/arrendamento-categoria-f">
          As rendas, e como se declaram
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que muda no IRS dos herdeiros">
        <Passos
          passos={[
            {
              titulo: "A declaração do falecido, no ano do óbito",
              texto: "Incumbe ao administrador da herança apresentá-la em nome dele, relativa aos rendimentos de 1 de janeiro até à data do óbito.",
            },
            {
              titulo: "Os rendimentos da herança indivisa, imputados por quota",
              texto: "Cada herdeiro declara a parte que lhe corresponde, no ano em que os rendimentos se produzem — mesmo antes da partilha.",
            },
            {
              titulo: "Os bens recebidos não são rendimento",
              texto: "Receber uma casa ou uma carteira de ações não é rendimento tributável em IRS. O que é tributável é o que eles vierem a render, e a mais-valia se os venderes.",
            },
            {
              titulo: "O valor de aquisição fica fixado agora",
              texto: "É o que serviu de base à liquidação do imposto do selo, ou o que serviria se ele fosse devido. É o número de que vais precisar se vieres a vender — guarda-o.",
            },
            {
              titulo: "E o IMI passa a ser dos herdeiros",
              texto: "A partir do óbito, os impostos sobre o património do imóvel herdado são dos novos titulares. Confirma que a caderneta predial foi atualizada.",
            },
          ]}
        />
        <VaiPara href="/guias/doacoes">
          Doar em vida ou deixar em herança: o que muda
        </VaiPara>
        <VaiPara href="/guias/mais-valias-imoveis">
          A mais-valia de quem vende o que herdou
        </VaiPara>
      </Seccao>
    </>
  );
}
