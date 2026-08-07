import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { CREDITO_IMPOSTO_ESTRANGEIRO } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 15.º, 22.º, 71.º e 81.º (n.os 1 a 3) do CIRS.
export default function CorpoCreditoImpostoEstrangeiro() {
  return (
    <>
      <Seccao titulo="A regra do art. 81.º CIRS">
        <Paragrafo>
          O problema que este artigo resolve é simples de enunciar: sendo residente, Portugal
          tributa-te sobre o rendimento mundial; o país onde o rendimento nasceu já o tributou lá.
          Sem correção, o mesmo dinheiro pagava imposto duas vezes.
        </Paragrafo>
        <Paragrafo>
          A correção chama-se <strong>crédito de imposto por dupla tributação jurídica
          internacional</strong>. Não é uma dedução ao rendimento: é uma dedução{" "}
          <strong>à coleta</strong> — abate imposto a imposto, não rendimento a rendimento. É por
          isso que vale bastante mais do que uma dedução do mesmo montante.
        </Paragrafo>
        <Nota titulo="Vale para as taxas especiais também">
          O artigo é expresso: os titulares de rendimentos das diferentes categorias obtidos no
          estrangeiro, <em>incluindo os previstos no artigo 72.º</em>, têm direito ao crédito. Não
          é preciso englobar para o ter.
        </Nota>
      </Seccao>

      <Seccao titulo="O duplo limite: imposto português e taxa da convenção">
        <Paragrafo>
          O crédito não é «o que pagaste lá». É o <strong>menor</strong> de duas importâncias, e
          essa é a parte que desilude quem espera recuperar tudo:
        </Paragrafo>
        <Paragrafo>
          · o <strong>imposto sobre o rendimento pago no estrangeiro</strong>;
          <br />· a <strong>fração da coleta do IRS</strong>, calculada antes da dedução,
          correspondente aos rendimentos que naquele país podiam ser tributados, líquidos das
          deduções específicas.
        </Paragrafo>
        <Paragrafo>
          A lógica é esta: Portugal devolve o imposto estrangeiro até ao ponto em que ele{" "}
          <em>substitui</em> imposto português. Se pagaste lá mais do que aquele rendimento pagaria
          cá, o excesso não é problema do orçamento português.
        </Paragrafo>
        <AvisoPrazo titulo="E há um segundo teto quando existe convenção">
          Havendo convenção para eliminar a dupla tributação celebrada por Portugal, a dedução{" "}
          <strong>não pode ultrapassar o imposto pago no estrangeiro nos termos previstos pela
          convenção</strong>. Não é o que foi retido — é o que a convenção permitia reter.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Retenção acima da convenção: recupera-se lá, não cá">
        <Paragrafo>
          É a consequência prática do segundo teto, e a que mais dinheiro deixa por recuperar. Se a
          entidade pagadora reteve à taxa interna do país da fonte, em vez da taxa reduzida
          prevista na convenção, esse excesso <strong>não é creditável em Portugal</strong>.
        </Paragrafo>
        <Paragrafo>
          O caminho é pedir o reembolso ao país da fonte, segundo as regras dele. E quase sempre
          existe uma via preventiva melhor: submeter, <em>antes</em> do pagamento, o formulário que
          certifica a tua residência fiscal portuguesa, para que a retenção seja logo feita à taxa
          da convenção.
        </Paragrafo>
        <Nota titulo="A ordem importa e não se recupera">
          Uma certificação entregue depois do pagamento não corrige a retenção já feita — obriga a
          um pedido de reembolso no estrangeiro, com prazos e formalidades próprios. Pedir a
          certidão de residência fiscal antes vale mais do que qualquer diligência posterior.
        </Nota>
      </Seccao>

      <Seccao titulo="Documentos que a AT aceita como prova">
        <Passos
          passos={[
            {
              titulo: "Documento da autoridade fiscal estrangeira",
              texto: "Comprovativo do rendimento bruto e do imposto efetivamente pago naquele país, emitido ou certificado pela administração fiscal da fonte. É o padrão de prova mais seguro.",
            },
            {
              titulo: "Declaração da entidade pagadora ou da corretora",
              texto: "Relatório fiscal anual identificando rendimento bruto, imposto retido e país. É aceite na prática, mas é prova mais fraca do que a anterior se houver divergência.",
            },
            {
              titulo: "Certidão de residência fiscal portuguesa",
              texto: "É o documento do outro lado da operação: serve para obter a taxa da convenção na origem, e para instruir o pedido de reembolso quando ela não foi aplicada.",
            },
          ]}
        />
        <Paragrafo>
          Guarda por <strong>país</strong> e por <strong>ano</strong>. O crédito apura-se país a
          país, porque é país a país que se determina a convenção aplicável — agregar torna o
          cálculo impossível de justificar.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Quando o crédito se perde">
        <Paragrafo>
          Há três formas de o perder, e duas são evitáveis.
        </Paragrafo>
        <Paragrafo>
          A primeira: <strong>declarar o líquido</strong>. Quem declara o valor que chegou à conta
          está a esconder o imposto retido, e o crédito desaparece com ele. Declara-se o bruto e
          indica-se o retido à parte.
        </Paragrafo>
        <Paragrafo>
          A segunda: <strong>não identificar o país</strong>, ou juntar países numa linha só. Sem
          país não há convenção aplicável nem teto apurável.
        </Paragrafo>
        <Paragrafo>
          A terceira é a que não depende de ti: <strong>insuficiência de coleta</strong>. Se a
          coleta do ano não chegar para absorver o crédito, o remanescente não se perde de
          imediato — pode ser deduzido nos{" "}
          {CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} períodos de tributação seguintes, com o
          mesmo limite e depois da dedução do próprio ano.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Exemplo com dividendos">
        <Paragrafo>
          O caso típico é este, e não precisa de números para se perceber. Recebes um dividendo de
          uma empresa estrangeira. O país da fonte retém à sua taxa interna. A convenção com
          Portugal previa uma taxa mais baixa para dividendos.
        </Paragrafo>
        <Paragrafo>
          O que Portugal credita é, no máximo, o imposto <em>que a convenção permitia reter</em> — e
          nunca mais do que a fração da coleta portuguesa correspondente àquele dividendo. A parte
          retida acima da convenção fica de fora, e só se recupera pedindo o reembolso no país da
          fonte.
        </Paragrafo>
        <Paragrafo>
          Por isso é que a diligência que mais rende não é fiscal portuguesa: é entregar a
          certificação de residência à entidade pagadora <em>antes</em> de o dividendo ser pago.
        </Paragrafo>
        <VaiPara href="/guias/dividendos-irs">
          Os dividendos vistos do lado português: liberatória ou englobamento
        </VaiPara>
        <VaiPara href="/guias/anexo-j">
          Onde tudo isto se declara, e a obrigação de identificar contas
        </VaiPara>
        <VaiPara href="/guias/residencia-fiscal">
          Ser residente cá é o pressuposto de tudo o que está acima
        </VaiPara>
      </Seccao>
    </>
  );
}
