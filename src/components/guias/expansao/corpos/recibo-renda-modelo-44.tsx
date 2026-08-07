import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 8.º, 115.º (n.º 5) e 119.º do CIRS. O art. 115.º vinha assinalado
// pelo pacote como não verificável — abre, e é ele que fundamenta tudo isto.
export default function CorpoReciboRendaModelo44() {
  return (
    <>
      <Seccao titulo="Quem emite recibo eletrónico">
        <Paragrafo>
          Os titulares de rendimentos da categoria F são obrigados a{" "}
          <strong>passar recibo de quitação, em modelo oficial</strong>, de todas as importâncias
          recebidas dos inquilinos. Na prática é o recibo de renda eletrónico, emitido no Portal das
          Finanças.
        </Paragrafo>
        <Paragrafo>
          «Todas as importâncias» é literal e é onde a maioria dos senhorios se engana: a obrigação
          abrange o que é recebido <strong>ainda que a título de caução, de adiantamento ou de
          reembolso de despesas</strong>. A caução também leva recibo.
        </Paragrafo>
        <Nota titulo="O que conta como renda é mais do que a renda">
          A obrigação segue a definição do art. 8.º: cedência do uso do prédio e serviços
          relacionados, aluguer de maquinismos e mobiliário instalados, cedência para fins especiais
          como publicidade, cedência de partes comuns, e as importâncias dos contratos de direito
          real de habitação duradoura.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem está dispensado — e porquê">
        <Paragrafo>
          A lei põe as duas vias em <strong>alternativa</strong>, com um «ou» entre elas: ou se
          passa recibo de quitação em modelo oficial, ou se entrega à Autoridade Tributária uma{" "}
          <strong>declaração de modelo oficial que discrimine esses rendimentos</strong>.
        </Paragrafo>
        <Paragrafo>
          A dispensa existe porque nem todos os senhorios têm meios ou obrigação de emitir
          eletronicamente — o caso mais comum é o de proprietários mais velhos e o de contratos
          antigos. Quem cabe na dispensa está definido na regulamentação da AT, e é aí que se
          confirma o enquadramento concreto.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que a dispensa não dispensa">
        <Paragrafo>
          Esta é a frase que interessa reter: <strong>a dispensa é da emissão, não da
          comunicação</strong>. Quem não emite recibo eletrónico tem de declarar as rendas na
          mesma — muda o documento, não a obrigação de a AT ficar a saber.
        </Paragrafo>
        <AvisoPrazo titulo="E não dispensa de declarar no IRS">
          Nem uma via nem a outra substituem o Anexo F da declaração anual. São obrigações
          diferentes: o recibo (ou a declaração de rendas) documenta cada recebimento; o Anexo F
          apura o imposto. Quem cumpre uma e esquece a outra fica em falta na mesma.
        </AvisoPrazo>
        <VaiPara href="/guias/arrendamento-categoria-f">
          Como as rendas declaradas se transformam em imposto
        </VaiPara>
      </Seccao>

      <Seccao titulo="Prazos de emissão e de comunicação">
        <Paragrafo>
          O recibo de quitação emite-se no momento do recebimento — é isso que «quitação» significa:
          o documento que prova que aquela importância foi paga.
        </Paragrafo>
        <Paragrafo>
          A declaração anual alternativa entrega-se <strong>até ao fim do mês de fevereiro</strong>{" "}
          de cada ano, por referência ao ano anterior. É a redação em vigor desde 1 de julho de
          2025, dada pelo Decreto-Lei n.º 49/2025.
        </Paragrafo>
        <Nota titulo="Fevereiro é o mês em que a AT fecha o retrato do ano">
          É também o prazo geral das declarações de rendimentos e retenções que as entidades pagadoras
          entregam sobre os restantes rendimentos do ano anterior. Quando abres o IRS pré-preenchido
          em abril, é este material de fevereiro que lá está.
        </Nota>
      </Seccao>

      <Seccao titulo="Erros e substituição de recibos">
        <Paragrafo>
          Um recibo emitido com valor, data ou inquilino errados não se apaga: <strong>anula-se e
          emite-se outro</strong>. O Portal das Finanças guarda o histórico, e é assim que deve
          ser — o recibo é o documento que sustenta o que ambos os lados vão declarar.
        </Paragrafo>
        <Paragrafo>
          Vale a pena corrigir cedo por uma razão prática: o inquilino usa o recibo para as suas
          próprias deduções à coleta, e um recibo errado propaga o erro para a declaração dele
          também. Se o erro só for detetado depois da entrega, o caminho é a declaração de
          substituição.
        </Paragrafo>
        <VaiPara href="/guias/deducoes-coleta">
          O lado do inquilino: as rendas como dedução
        </VaiPara>
        <VaiPara href="/guias/despesas-senhorio">
          O que abate às rendas que acabaste de declarar
        </VaiPara>
      </Seccao>
    </>
  );
}
