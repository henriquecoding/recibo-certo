import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 6.º, 29.º e 53.º do CIVA, e arts. 3.º, 31.º e 101.º do CIRS.
export default function CorpoPlataformasSubscricao() {
  return (
    <>
      <Seccao titulo="Abrir atividade e o código a usar">
        <Paragrafo>
          Receita recorrente de subscritores é <strong>prestação de serviços</strong> por via
          eletrónica, e é rendimento da categoria B. Há atividade a abrir a partir do momento em que
          a receita tem carácter de habitualidade — que é, por definição, o que uma subscrição tem.
        </Paragrafo>
        <Paragrafo>
          Como em toda esta secção, o enquadramento faz-se por profissão da tabela do art. 151.º ou
          por CAE, e determina o coeficiente e a retenção. Os dois cenários estão na tabela de dados
          aqui em baixo.
        </Paragrafo>
        <Nota titulo="O conteúdo não muda o enquadramento fiscal">
          Seja qual for o tema, o que a lei vê é uma prestação de serviços onerosa por via
          eletrónica. As regras de IRS, IVA e Segurança Social são as mesmas de qualquer outra.
        </Nota>
      </Seccao>

      <Seccao titulo="Quem é o teu cliente para efeitos de IVA">
        <Paragrafo>
          É a pergunta que decide tudo o resto, e tem duas respostas possíveis — que dependem de como
          a plataforma está montada.
        </Paragrafo>
        <Paragrafo>
          Numa montagem, o teu cliente é <strong>cada subscritor</strong>, e a plataforma é apenas um
          intermediário que cobra uma comissão pelo serviço de intermediação. Noutra, o teu cliente é
          a <strong>própria plataforma</strong>, que compra o teu conteúdo e o revende aos
          subscritores em nome próprio.
        </Paragrafo>
        <AvisoPrazo titulo="As duas montagens dão obrigações completamente diferentes">
          Se o cliente é a plataforma — um sujeito passivo, normalmente estabelecido noutro país —,
          emites uma fatura por mês a uma entidade e a operação localiza-se no país dela. Se os
          clientes são milhares de particulares espalhados por vários países, entram as regras dos
          serviços eletrónicos a consumidores finais, que são outra coisa por completo.
        </AvisoPrazo>
        <Nota titulo="A resposta está nos termos de serviço, não na intuição">
          Procura, nos termos da plataforma, quem é declarado como fornecedor perante o subscritor e
          quem emite o documento de cobrança. É esse o ponto de partida — e vale a pena confirmá-lo
          com um contabilista certificado antes da primeira declaração periódica.
        </Nota>
      </Seccao>

      <Seccao titulo="Serviços prestados por via eletrónica">
        <Paragrafo>
          Um serviço prestado por via eletrónica é o que é fornecido através da internet, de forma
          essencialmente automatizada e com intervenção humana mínima. Conteúdo de acesso pago,
          descarregável ou em streaming, cai tipicamente nesta categoria.
        </Paragrafo>
        <Paragrafo>
          A qualificação importa porque estes serviços têm{" "}
          <strong>regras de localização próprias</strong> quando o destinatário não é sujeito
          passivo: o imposto é devido no país onde o consumidor está, e não onde tu estás.
        </Paragrafo>
        <AvisoPrazo titulo="Vender a consumidores finais na UE ativa regras que não são as normais">
          A partir do momento em que há subscritores particulares noutros Estados-Membros, entram as
          regras dos serviços eletrónicos B2C — com limiares e com um regime de balcão único que
          evita ter de registar-se em cada país. É a diferença entre uma declaração e vinte e sete.
        </AvisoPrazo>
        <VaiPara href="/guias/oss-iva">O balcão único, e quando é preciso</VaiPara>
      </Seccao>

      <Seccao titulo="Quando a plataforma age como fornecedor">
        <Paragrafo>
          Quando a plataforma atua em nome próprio perante o subscritor, é ela que presta o serviço a
          esse subscritor — e é ela que trata do IVA que lhe corresponde, no país dele.
        </Paragrafo>
        <Paragrafo>
          Nesse caso, o teu cliente é a plataforma. Tratando-se de um sujeito passivo estabelecido
          noutro país, a regra geral do art. 6.º do Código do IVA localiza a operação{" "}
          <strong>no país dele</strong>: não liquidas IVA português, e o imposto é devido lá por
          autoliquidação.
        </Paragrafo>
        <Nota titulo="É a montagem mais simples do teu lado">
          Uma fatura por período, a uma entidade identificada, sem ter de saber onde estão os
          subscritores. A contrapartida é que a plataforma fica com uma fatia maior — e é
          precisamente esse serviço que ela está a cobrar.
        </Nota>
        <AvisoPrazo titulo="Declara o bruto, não o líquido recebido">
          A comissão da plataforma é despesa da tua atividade, não uma redução da receita. Declarar
          apenas o que te foi transferido subdeclara o rendimento — e o bruto costuma constar dos
          relatórios que a própria plataforma emite.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O regime de isenção e os seus limites">
        <Paragrafo>
          Enquanto o volume de negócios anual ficar abaixo de{" "}
          <strong>{fmt(IVA_ISENCAO_LIMITE.value)}</strong>, aplica-se o regime de isenção: não
          liquidas IVA e não deduzes o que suportas.
        </Paragrafo>
        <Paragrafo>
          No primeiro ano de atividade o limiar é <strong>proporcional</strong> aos meses em que
          exerceste. E o limiar conta o volume de negócios <em>total</em> — não só a parte
          portuguesa.
        </Paragrafo>
        <AvisoPrazo titulo="Estar isento cá não resolve o IVA de outros países">
          A isenção do art. 53.º é do regime interno português. Não dispensa as obrigações que
          nasçam da localização de operações noutros Estados-Membros: são regimes diferentes, e o
          segundo não se apaga por causa do primeiro.
        </AvisoPrazo>
        <VaiPara href="/guias/mudar-regime-iva">Como se faz a passagem de regime</VaiPara>
      </Seccao>

      <Seccao titulo="Privacidade: o que consta e o que não consta">
        <Paragrafo>
          A fatura tem de conter o que a lei exige — identificação das partes, data, descrição da
          operação e valor. A descrição identifica <strong>o serviço</strong>, não o conteúdo
          concreto nem o subscritor individual.
        </Paragrafo>
        <Paragrafo>
          Quando o cliente é a plataforma, a fatura é uma só, dirigida a ela, e não expõe subscritor
          nenhum. Quando os clientes são os subscritores, aplicam-se as regras normais de faturação a
          consumidores finais — que não exigem NIF, salvo se o cliente o pedir.
        </Paragrafo>
        <Nota titulo="Os teus dados também constam de algum lado">
          A atividade é registada em teu nome, e o cadastro fiscal não é público. Mas quem receber
          uma fatura tua vê o nome com que a atividade está aberta — o que é relevante para quem
          trabalha sob pseudónimo, e é uma decisão a tomar no início, com um contabilista
          certificado.
        </Nota>
        <VaiPara href="/guias/criadores-de-conteudo">
          Se além de subscrições há patrocínios e permutas
        </VaiPara>
      </Seccao>
    </>
  );
}
