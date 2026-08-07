import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IS_DOACAO_IMOVEL, IS_TRANSMISSAO_GRATUITA, TRANSMISSAO_GRATUITA_PARTICIPACAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// arts. 1.º, 6.º, 9.º e 26.º do Código do Imposto do Selo, verbas 1.1 e 1.2
// da Tabela Geral, art. 12.º do CIMT e arts. 10.º, 44.º e 45.º do CIRS.
//
// O pacote avisa que a matéria tem forte componente de direito civil e
// manda «manter o guia no perímetro fiscal e remeter o resto para
// advogado». A secção da colação e da legítima descreve os conceitos e
// remete — não dá conselho sucessório.
export default function CorpoDoacoes() {
  return (
    <>
      <Seccao titulo="O imposto do selo nas duas vias">
        <Paragrafo>
          Para o imposto do selo, doar e herdar são tratados de forma{" "}
          <strong>semelhante</strong>: as duas são transmissões gratuitas, as duas caem na mesma
          verba, e a taxa é a mesma —{" "}
          <strong>{pctExato(IS_TRANSMISSAO_GRATUITA.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          E a isenção também é a mesma: estão isentos{" "}
          <strong>{TRANSMISSAO_GRATUITA_PARTICIPACAO.isentos.value}</strong>, tanto na doação como na
          herança.
        </Paragrafo>
        <Paragrafo>
          Quer dizer que, para a esmagadora maioria das famílias, <strong>a escolha entre doar e
          deixar não se decide pelo imposto do selo</strong> — decide-se pelo resto, que é o que este
          guia trata a seguir.
        </Paragrafo>
        <Nota titulo="A participação é obrigatória nas duas">
          Prazo de {TRANSMISSAO_GRATUITA_PARTICIPACAO.prazoMeses.value} meses, e existe mesmo havendo
          isenção. Uma doação entre pai e filho não paga imposto — e participa-se na mesma.
        </Nota>
        <VaiPara href="/guias/herancas-imposto-selo">
          A participação, o prazo e quem a entrega
        </VaiPara>
      </Seccao>

      <Seccao titulo="Imóveis doados e o IMT">
        <Paragrafo>
          Aqui está a primeira diferença real, e é a que mais gente desconhece. A{" "}
          <strong>doação de um imóvel</strong> paga uma verba própria da Tabela Geral —{" "}
          <strong>{pctExato(IS_DOACAO_IMOVEL.value)}</strong> sobre o valor —{" "}
          <strong>mesmo quando a família está isenta</strong> da verba das transmissões gratuitas.
        </Paragrafo>
        <Paragrafo>
          A <strong>herança não paga essa verba</strong>: a redação abrange a aquisição onerosa ou
          por doação, o que exclui a sucessão por morte.
        </Paragrafo>
        <AvisoPrazo titulo="É o custo imediato de doar um imóvel em vez de o deixar">
          Não é grande em percentagem, e é real. Numa casa de 200 000 € de valor patrimonial, é uma
          quantia que a herança não teria pago — e é o primeiro número a pôr na conta de quem pondera
          doar.
        </AvisoPrazo>
        <Nota titulo="E há uma segunda camada, conforme o caso">
          Doações com encargos, ou com contrapartida, podem ser tratadas como transmissões onerosas
          para efeitos de IMT. Se a doação vem acompanhada de uma obrigação para o donatário, o
          enquadramento muda — confirma-o antes da escritura.
        </Nota>
        <VaiPara href="/guias/imt">O IMT, escalão a escalão</VaiPara>
      </Seccao>

      <Seccao titulo="O valor de aquisição que o donatário herda">
        <Paragrafo>
          É a diferença que só aparece anos depois, e é a mais cara das duas.
        </Paragrafo>
        <Paragrafo>
          Quem recebe a título gratuito — por doação ou por herança — fica com um{" "}
          <strong>valor de aquisição</strong> que não é o que o doador pagou pelo bem: é o valor que
          serviu de base à liquidação do imposto do selo, ou o que serviria se ele fosse devido.
        </Paragrafo>
        <Paragrafo>
          Vendendo mais tarde, a mais-valia mede-se a partir desse valor. E, tratando-se de imóveis, o
          valor patrimonial tributário costuma ser <strong>bastante inferior</strong> ao valor de
          mercado — o que faz a mais-valia futura ser maior do que seria se o bem tivesse sido
          comprado.
        </Paragrafo>
        <AvisoPrazo titulo="Doar não apaga imposto: adia-o e transfere-o">
          O selo poupa-se pela isenção da família; a mais-valia aparece inteira no dia em que o
          donatário vender. Quem doa para «resolver» costuma estar a transferir uma fatura maior para
          a geração seguinte.
        </AvisoPrazo>
        <VaiPara href="/guias/mais-valias-imoveis">
          A mais-valia, e como o valor de aquisição a determina
        </VaiPara>
      </Seccao>

      <Seccao titulo="Efeitos sucessórios: colação e legítima">
        <Paragrafo>
          Esta secção é de direito civil, não fiscal — e é onde as decisões correm mais mal quando se
          decide sozinho.
        </Paragrafo>
        <Paragrafo>
          A <strong>legítima</strong> é a parte da herança que a lei reserva aos herdeiros
          legitimários — cônjuge, descendentes, ascendentes — e de que o autor da sucessão não pode
          dispor livremente. A <strong>colação</strong> é o mecanismo pelo qual as doações feitas em
          vida a descendentes são, em regra, trazidas de volta ao cálculo da partilha, para igualar os
          quinhões.
        </Paragrafo>
        <AvisoPrazo titulo="Uma doação em vida raramente sai da conta da herança">
          É a expectativa mais comum e a mais errada: doar a um filho agora não o deixa
          necessariamente com mais no fim. A doação conta na partilha, salvo se tiver sido dispensada
          de colação nos termos que a lei exige.
        </AvisoPrazo>
        <Nota titulo="É aqui que se fala com um advogado ou um notário">
          Dispensa de colação, doações inoficiosas, partilhas em vida e testamentos são instrumentos
          com requisitos formais próprios. Este guia diz que existem; quem os deve montar é quem tem
          o caso à frente.
        </Nota>
      </Seccao>

      <Seccao titulo="Usufruto e nua-propriedade">
        <Paragrafo>
          É a estrutura mais usada em doações de imóveis, e vale a pena perceber o que faz. O direito
          de propriedade divide-se em dois: o <strong>usufruto</strong> — usar e receber os frutos, as
          rendas — e a <strong>nua-propriedade</strong> — ser dono, sem uso.
        </Paragrafo>
        <Paragrafo>
          Doar a nua-propriedade e <strong>reservar o usufruto</strong> permite ao doador continuar a
          viver na casa ou a receber as rendas até morrer, transferindo desde já a titularidade.
          Extinto o usufruto pela morte, a propriedade consolida-se na pessoa do nu-proprietário.
        </Paragrafo>
        <Paragrafo>
          Do ponto de vista fiscal, a lei tem regras próprias para <strong>valorizar</strong> cada uma
          das partes — e é sobre esses valores que os impostos incidem, em cada momento.
        </Paragrafo>
        <Nota titulo="Não é uma forma de fugir a imposto">
          É uma forma de repartir o direito no tempo, com efeitos fiscais em cada passo. Vale pela
          segurança que dá ao doador — continuar a viver na casa — e não por poupança fiscal.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando doar faz mesmo sentido">
        <Passos
          passos={[
            {
              titulo: "Quando o beneficiário NÃO é da família direta",
              texto: `Aí o selo é devido nas duas vias, à mesma taxa de ${pctExato(IS_TRANSMISSAO_GRATUITA.value)}, e a escolha desloca-se para outros critérios. Doar deixa de ter desvantagem fiscal relativa.`,
            },
            {
              titulo: "Quando se quer transferir o controlo em vida",
              texto: "Uma empresa familiar, um imóvel que alguém já gere. O objetivo é sucessório e organizacional, não fiscal.",
            },
            {
              titulo: "Quando o bem NÃO se destina a ser vendido",
              texto: "Se vai ficar na família, a mais-valia futura nunca se realiza — e a desvantagem do valor de aquisição baixo desaparece.",
            },
            {
              titulo: "Quando se quer evitar litígio na partilha",
              texto: "Uma partilha em vida, bem montada, resolve em conjunto o que uma herança resolveria em conflito. É a razão mais frequente e a menos falada.",
            },
            {
              titulo: "E quase nunca por causa do imposto do selo",
              texto: "Para a família direta, as duas vias estão isentas. Doar um imóvel acrescenta a verba própria das doações que a herança não pagaria.",
            },
          ]}
        />
        <AvisoPrazo titulo="Faz a conta com a venda futura incluída">
          É a única maneira de comparar honestamente as duas vias. Doar hoje pode custar pouco e
          custar muito daqui a quinze anos — e quem paga a diferença é quem recebeu.
        </AvisoPrazo>
        <VaiPara href="/guias/herdar-imovel">
          Herdar um imóvel, do óbito à venda
        </VaiPara>
        <VaiPara href="/guias/imposto-selo-compra-casa">
          O imposto do selo na compra, para comparar
        </VaiPara>
      </Seccao>
    </>
  );
}
