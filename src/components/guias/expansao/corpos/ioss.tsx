import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FATURACAO_PRAZOS, IVA_TAXAS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 1.º, 6.º, 18.º e 29.º do CIVA.
//
// O limiar de valor intrínseco de 150 € vem do pacote e é o limiar da
// franquia aduaneira usado pelo regime das vendas à distância de bens
// importados. Não foi possível confirmá-lo em articulado legível nesta
// revisão — o regime vive na Diretiva e no Regime do IVA nas Transações
// Intracomunitárias, e o Diário da República serve um shell vazio. O guia
// descreve o mecanismo do limiar e manda confirmar o valor.
export default function CorpoIoss() {
  return (
    <>
      <Seccao titulo="O que o IOSS resolve">
        <Paragrafo>
          Quando um consumidor europeu compra a um vendedor de fora da União, a mercadoria é{" "}
          <strong>importada</strong> — e o IVA da importação é devido na entrada, cobrado pela
          alfândega ou pelo transportador antes da entrega.
        </Paragrafo>
        <Paragrafo>
          Isso produz o resultado que toda a gente já viveu: a encomenda fica retida, chega um pedido
          de pagamento com uma taxa de desalfandegamento por cima, e o cliente descobre que o preço
          real era outro. Muitas encomendas são simplesmente recusadas nesse momento.
        </Paragrafo>
        <Paragrafo>
          O IOSS resolve isto deslocando o momento da cobrança: o IVA é cobrado{" "}
          <strong>na venda</strong>, pelo vendedor, e a importação segue sem imposto a pagar à
          chegada.
        </Paragrafo>
        <Nota titulo="Não é uma isenção — é uma antecipação">
          O imposto é o mesmo e é devido ao mesmo país. O que muda é quem o cobra e quando: em vez de
          o consumidor pagar na fronteira, paga no carrinho de compras.
        </Nota>
      </Seccao>

      <Seccao titulo="O limiar de valor intrínseco">
        <Paragrafo>
          O regime aplica-se a remessas cujo <strong>valor intrínseco</strong> não ultrapasse o limiar
          da franquia aduaneira — e «valor intrínseco» é o preço dos bens em si,{" "}
          <em>sem</em> portes, seguro e outros encargos de transporte.
        </Paragrafo>
        <Paragrafo>
          O valor concreto do limiar não é publicado neste guia porque não foi possível confirmá-lo em
          articulado legível nesta revisão. Confirma-o no Portal das Finanças ou com um contabilista
          certificado — é o número que decide se a operação cabe no regime.
        </Paragrafo>
        <AvisoPrazo titulo="Acima do limiar, o IOSS não serve">
          A remessa segue o regime normal de importação: IVA devido na entrada, com direitos
          aduaneiros se aplicáveis. Não há forma de a fazer caber no regime dividindo-a artificialmente
          — a prática é conhecida e é tratada como tal.
        </AvisoPrazo>
        <Nota titulo="E não abrange produtos sujeitos a impostos especiais">
          Álcool, tabaco e produtos petrolíferos ficam de fora do regime, seja qual for o valor.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem se pode registar">
        <Paragrafo>
          Vendedores estabelecidos na União registam-se diretamente no Estado-Membro onde estão
          estabelecidos — no teu caso, no Portal das Finanças.
        </Paragrafo>
        <Paragrafo>
          Vendedores estabelecidos <strong>fora</strong> da União precisam, em regra, de designar um{" "}
          <strong>intermediário</strong> estabelecido na União, que assume as obrigações declarativas
          e de pagamento em nome deles.
        </Paragrafo>
        <Nota titulo="O número IOSS é comunicado à alfândega">
          É o que permite que a remessa entre sem cobrança de IVA na fronteira. Sem esse número na
          declaração aduaneira, o imposto é cobrado na entrada — mesmo que já o tenhas cobrado ao
          cliente. Aí há dupla cobrança, e é o problema mais desagradável deste regime.
        </Nota>
      </Seccao>

      <Seccao titulo="Plataformas como sujeito passivo presumido">
        <Paragrafo>
          É a regra que muda a economia do comércio eletrónico e que muita gente desconhece. Quando a
          venda é <strong>facilitada por uma interface eletrónica</strong> — um marketplace, uma
          plataforma —, a lei presume que essa plataforma{" "}
          <strong>comprou e revendeu</strong> os bens.
        </Paragrafo>
        <Paragrafo>
          A consequência prática: é a plataforma que fica responsável pelo IVA perante o consumidor, e
          é ela que usa o seu próprio número IOSS. O vendedor deixa de ter obrigação de IVA nessa
          operação.
        </Paragrafo>
        <AvisoPrazo titulo="Não somes o teu IOSS ao da plataforma">
          Se vendes através de um marketplace abrangido por esta regra, a operação já está tratada por
          ele. Cobrar IVA por cima, ou declarar a mesma venda no teu IOSS, produz duplicação — e é um
          erro frequente de quem vende em canal próprio e em marketplace ao mesmo tempo.
        </AvisoPrazo>
        <Nota titulo="Separa os canais na contabilidade">
          Vendas próprias e vendas via plataforma têm tratamentos diferentes na mesma loja. Se não
          estiverem separadas desde o início, a declaração é impossível de fazer corretamente.
        </Nota>
      </Seccao>

      <Seccao titulo="Declaração e pagamento">
        <Paragrafo>
          A declaração do IOSS é <strong>mensal</strong> — ao contrário do OSS, que é trimestral — e
          declara-se por <strong>Estado-Membro de consumo e por taxa</strong>, com pagamento no mesmo
          prazo.
        </Paragrafo>
        <Paragrafo>
          A taxa aplicável é a do <strong>país do consumidor</strong>. Para dar a escala do problema
          dentro do próprio país: em Portugal a taxa normal é{" "}
          <strong>{pctExato(IVA_TAXAS.continente.value.normal)}</strong> no continente,{" "}
          <strong>{pctExato(IVA_TAXAS.madeira.value.normal)}</strong> na Madeira e{" "}
          <strong>{pctExato(IVA_TAXAS.acores.value.normal)}</strong> nos Açores.
        </Paragrafo>
        <Nota titulo="Os prazos de faturação são os de sempre">
          Seguem as regras do Estado-Membro de identificação. Em Portugal, o art. 36.º: o{" "}
          {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil na regra geral, e{" "}
          {FATURACAO_PRAZOS.adiantamentos.value} nos adiantamentos.
        </Nota>
        <VaiPara href="/guias/oss-iva">
          O OSS, para vendas dentro da União
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando não se aplica">
        <Passos
          passos={[
            {
              titulo: "Remessas acima do limiar de valor intrínseco",
              texto: "Seguem o regime normal de importação, com IVA e eventuais direitos aduaneiros cobrados na entrada.",
            },
            {
              titulo: "Produtos sujeitos a impostos especiais de consumo",
              texto: "Álcool, tabaco e produtos petrolíferos estão excluídos, independentemente do valor.",
            },
            {
              titulo: "Vendas a sujeitos passivos",
              texto: "O IOSS é para consumidores finais. Vendas a empresas seguem as regras próprias das importações e das aquisições.",
            },
            {
              titulo: "Bens já em livre prática na União",
              texto: "Se a mercadoria já está dentro do território aduaneiro, não há importação — e o que se aplica é o OSS ou as regras internas.",
            },
            {
              titulo: "Vendas facilitadas por plataforma abrangida",
              texto: "A plataforma é o sujeito passivo presumido, e usa o número IOSS dela. Não é caso teu.",
            },
          ]}
        />
        <AvisoPrazo titulo="Registar-se sem precisar acrescenta uma declaração mensal">
          O IOSS traz obrigações declarativas mensais, mesmo em meses sem operações. Antes de aderir,
          confirma que a tua operação cabe mesmo no regime — e que o volume o justifica.
        </AvisoPrazo>
        <VaiPara href="/guias/regime-isencao-ue">
          O regime de isenção para pequenas empresas na União
        </VaiPara>
      </Seccao>
    </>
  );
}
