import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// art. 5.º (n.os 1 e 2), art. 71.º (n.º 1), art. 22.º e art. 72.º do CIRS.
export default function CorpoRendimentosCapitaisCategoriaE() {
  return (
    <>
      <Seccao titulo="O que é Categoria E">
        <Paragrafo>
          É a categoria dos <strong>frutos do dinheiro</strong> — o que o capital rende sem ser
          vendido. O art. 5.º enumera-a com generosidade: juros de contratos de mútuo e de abertura
          de crédito, juros de <strong>depósitos à ordem ou a prazo</strong>, remuneração de
          certificados de depósito e de contas de títulos com garantia de preço, juros e prémios de
          reembolso de <strong>títulos da dívida pública</strong> e de obrigações.
        </Paragrafo>
        <Paragrafo>
          A ideia comum é a de vantagem económica obtida pela{" "}
          <strong>disponibilidade temporária de dinheiro</strong> a título oneroso. Emprestaste — a
          um banco, ao Estado, a uma empresa — e recebes por isso.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Pagador português: retenção liberatória">
        <Paragrafo>
          Quando o rendimento é obtido em território português e pago por entidade com sede,
          direção efetiva ou estabelecimento estável cá, está sujeito a{" "}
          <strong>retenção na fonte a título definitivo</strong>, à taxa liberatória que consta da
          tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          «A título definitivo» é a parte que interessa: o imposto fica <em>pago e fechado</em> no
          momento em que o juro é creditado. Não há nada a acrescentar à declaração, e o valor que
          viste entrar na conta já é líquido.
        </Paragrafo>
        <Nota titulo="É por isto que os juros do banco não aparecem no IRS">
          Não é esquecimento nem isenção. É retenção liberatória: o imposto foi retido e entregue
          pelo banco, e o rendimento não tem de ser englobado. Quem o procura no pré-preenchido não
          o encontra porque não tem de lá estar.
        </Nota>
      </Seccao>

      <Seccao titulo="Pagador estrangeiro: Anexo J">
        <Paragrafo>
          Aqui tudo muda, e é a origem da maior parte das omissões. Se os juros vêm de um banco ou
          de um emitente <strong>não residente</strong>, não há entidade portuguesa a reter — mas o
          rendimento é tributado na mesma, porque sendo residente és tributado pela totalidade dos
          teus rendimentos, incluindo os obtidos fora.
        </Paragrafo>
        <Paragrafo>
          O rendimento declara-se pelo <strong>bruto</strong>, no anexo do estrangeiro, com o país
          da fonte e o imposto eventualmente aí retido — que dá direito a crédito, dentro dos
          limites do art. 81.º.
        </Paragrafo>
        <AvisoPrazo titulo="Uma conta de poupança lá fora não se declara sozinha">
          Além do rendimento, há a obrigação autónoma de identificar contas abertas em instituições
          financeiras não residentes — que existe mesmo sem juros nenhuns no ano.
        </AvisoPrazo>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro e a identificação de contas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Englobar ou não">
        <Paragrafo>
          A retenção liberatória é a regra, mas podes optar por <strong>englobar</strong>: juntar
          estes rendimentos aos restantes e tributá-los pelos escalões progressivos, recuperando por
          via da coleta o que foi retido.
        </Paragrafo>
        <Paragrafo>
          Compensa quando a tua taxa média fica <em>abaixo</em> da taxa liberatória — situação de
          rendimentos globais baixos. Acima disso, englobar só aumenta o imposto.
        </Paragrafo>
        <AvisoPrazo titulo="A opção é global, não é seletiva">
          Quem exerce a opção fica obrigado a englobar a <strong>totalidade dos rendimentos da
          mesma categoria</strong>. Não se escolhe englobar os juros que dão jeito e deixar de fora
          os dividendos que não dão.
        </AvisoPrazo>
        <VaiPara href="/guias/dividendos-irs">
          A mesma decisão, vista do lado dos dividendos
        </VaiPara>
        <VaiPara href="/guias/escaloes-irs">Os escalões com que a comparação é feita</VaiPara>
      </Seccao>

      <Seccao titulo="Certificados do Estado">
        <Paragrafo>
          Certificados de aforro e certificados do Tesouro rendem juros, e juros de títulos da
          dívida pública são expressamente <strong>categoria E</strong>. Seguem o mesmo tratamento
          dos restantes rendimentos de capitais de fonte portuguesa: retenção na fonte a título
          definitivo, sem nada a declarar.
        </Paragrafo>
        <Paragrafo>
          Duas notas práticas. Nos certificados de aforro, os juros capitalizam — mas o momento
          relevante é aquele em que são creditados, não o do resgate. E o <em>capital</em> devolvido
          no resgate não é rendimento: rendimento é só a parte dos juros.
        </Paragrafo>
        <Nota titulo="Confundir resgate com rendimento é o erro clássico">
          Resgatar 10 000 € de certificados não é receber 10 000 € de rendimento. O que rendeu foram
          os juros — o resto é dinheiro teu a voltar.
        </Nota>
      </Seccao>

      <Seccao titulo="A fronteira com a Categoria G">
        <Paragrafo>
          A linha é esta: <strong>categoria E é o que o ativo rende enquanto o tens; categoria G é o
          que ganhas quando o vendes.</strong> Juros de uma obrigação são E. O ganho por a teres
          vendido acima do que pagaste é G.
        </Paragrafo>
        <Paragrafo>
          A distinção importa porque os regimes divergem em coisas concretas: em G apura-se um{" "}
          <strong>saldo</strong> entre ganhos e perdas do ano, e há reporte de perdas para os anos
          seguintes; em E não há saldo nem reporte — cada rendimento é tributado por si, e um
          depósito que rendeu não se compensa com um investimento que correu mal.
        </Paragrafo>
        <VaiPara href="/guias/mais-valias">
          A categoria G: ações, cripto e imóveis
        </VaiPara>
        <VaiPara href="/guias/reporte-menos-valias">
          O reporte de perdas, que só existe do lado da categoria G
        </VaiPara>
      </Seccao>
    </>
  );
}
