import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FALTA_ENTREGA_PRESTACAO, NAO_RESIDENTES } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 71.º (n.os 1 e 4) e art. 72.º (n.os 1 e 6) do CIRS, art. 101.º e
// art. 119.º do CIRS, art. 22.º da LGT e art. 114.º do RGIT.
//
// O pacote manda sublinhar a responsabilidade do substituto tributário —
// quem não retém responde pelo imposto. É a última secção.
export default function CorpoModelo30() {
  return (
    <>
      <Seccao titulo="Que pagamentos geram obrigação">
        <Paragrafo>
          Pagar a uma entidade <strong>não residente</strong> por algo que se considere obtido em
          Portugal cria duas obrigações de uma vez: <strong>reter na fonte</strong> e{" "}
          <strong>comunicar</strong> o pagamento.
        </Paragrafo>
        <Paragrafo>
          Os casos mais comuns na vida de uma pequena empresa portuguesa são estes: honorários a um
          prestador estrangeiro, <strong>royalties</strong> pela utilização de software ou de
          conteúdos, juros de financiamento, e prestações de serviços técnicos.
        </Paragrafo>
        <AvisoPrazo titulo="É a obrigação mais esquecida de quem compra serviços lá fora">
          Contratar um designer no estrangeiro, licenciar software, pagar a um consultor de outro país
          — tudo isto pode gerar retenção na fonte em Portugal. E quem paga é quem responde.
        </AvisoPrazo>
        <Nota titulo="Não se confunde com o IVA da autoliquidação">
          São dois impostos diferentes sobre a mesma fatura. A autoliquidação do IVA é uma coisa; a
          retenção de IRS ou IRC sobre o rendimento do não residente é outra. Podem coexistir na
          mesma operação.
        </Nota>
        <VaiPara href="/guias/autoliquidacao-iva">
          A autoliquidação do IVA, que é a outra metade da mesma fatura
        </VaiPara>
      </Seccao>

      <Seccao titulo="Retenção na fonte: taxas internas">
        <Paragrafo>
          Sem invocação de convenção, aplicam-se as <strong>taxas internas</strong> portuguesas — que
          variam com a categoria do rendimento e estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          Rendimentos de trabalho e empresariais e profissionais sofrem retenção liberatória a{" "}
          <strong>{pctExato(NAO_RESIDENTES.taxaTrabalhoEPensoes.value)}</strong>; os rendimentos de
          capitais, a <strong>{pctExato(NAO_RESIDENTES.taxaCapitais.value)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="A retenção incide sobre o valor ILÍQUIDO">
          É sobre o valor total da fatura, não sobre o que sobra. E há um problema comercial que daí
          decorre: o fornecedor estrangeiro contava receber o valor cheio, e recebe menos.
        </AvisoPrazo>
        <Nota titulo="Contratos com cláusula de gross-up transferem o custo para ti">
          Quando o contrato obriga a pagar um valor líquido, a retenção passa a ser custo teu por
          cima do preço. Vale a pena ler essa cláusula antes de assinar, não quando a fatura chega.
        </Nota>
      </Seccao>

      <Seccao titulo="Dispensa ou redução ao abrigo de convenção">
        <Paragrafo>
          Existindo convenção entre Portugal e o país do fornecedor, a taxa aplicável pode ser{" "}
          <strong>reduzida ou nula</strong> — mas a redução <strong>não é automática</strong>.
        </Paragrafo>
        <Paragrafo>
          Depende de teres em mãos, no momento em que pagas, o formulário próprio devidamente
          preenchido pelo beneficiário e certificado — ou acompanhado do certificado de residência
          fiscal emitido pela autoridade do país dele.
        </Paragrafo>
        <AvisoPrazo titulo="Sem o formulário, retém-se à taxa interna">
          Não é uma opção: é o que a lei manda a quem paga. E é a razão pela qual o formulário se
          pede <em>antes</em> do primeiro pagamento, e não depois de ele estar feito.
        </AvisoPrazo>
        <VaiPara href="/guias/convencao-dupla-tributacao">
          Como ler a convenção do país em causa
        </VaiPara>
      </Seccao>

      <Seccao titulo="O papel do RFI e do certificado de residência">
        <Paragrafo>
          O formulário RFI é preenchido pelo <strong>beneficiário</strong> — o teu fornecedor — e
          entregue a ti. É a ti que compete guardá-lo, porque és tu que respondes pela retenção que
          deixaste de fazer.
        </Paragrafo>
        <Paragrafo>
          O documento decisivo é a <strong>certificação da residência fiscal</strong> pela autoridade
          do outro Estado: ou no próprio formulário, ou em certificado autónomo anexo. E a{" "}
          <strong>validade é anual</strong> — um certificado do ano passado não sustenta a retenção
          reduzida deste ano.
        </Paragrafo>
        <Nota titulo="Pede o formulário na negociação, não na faturação">
          A emissão do certificado depende da administração do outro país e demora semanas em vários
          deles. Incluir o pedido nas condições iniciais evita reter à taxa interna à primeira fatura
          e ter de corrigir depois.
        </Nota>
        <VaiPara href="/guias/modelo-21-rfi">
          O formulário RFI, e o certificado que o faz valer
        </VaiPara>
      </Seccao>

      <Seccao titulo="Prazo de entrega da Modelo 30">
        <Paragrafo>
          A Modelo 30 comunica à AT os rendimentos pagos ou colocados à disposição de entidades não
          residentes, e é <strong>mensal</strong>: respeita aos pagamentos de cada mês.
        </Paragrafo>
        <Paragrafo>
          O prazo concreto consta da portaria aplicável e do calendário fiscal do ano. Confirma-o no
          Portal das Finanças — este guia não o fixa, porque é matéria de portaria e muda.
        </Paragrafo>
        <AvisoPrazo titulo="Entrega-se mesmo quando há dispensa de retenção">
          É o erro que mais gente comete. Ter formulário RFI válido dispensa de <em>reter</em> — não
          dispensa de <em>comunicar</em>. O pagamento existiu, e a AT quer saber dele.
        </AvisoPrazo>
        <VaiPara href="/dashboard/prazos">O calendário fiscal, com alertas antecipados</VaiPara>
      </Seccao>

      <Seccao titulo="Consequências de não reter">
        <Paragrafo>
          Aqui está o ponto mais sério deste guia, e é preciso dizê-lo sem rodeios: quem devia reter e
          não reteve <strong>responde pelo imposto</strong>. A responsabilidade do substituto
          tributário não é subsidiária de o fornecedor pagar — é dele.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "O imposto passa a ser dívida tua",
              texto: "Não retiveste, mas o imposto era devido. A AT liquida-o a quem tinha a obrigação de o reter — a ti.",
            },
            {
              titulo: "Acrescem juros compensatórios",
              texto: "Desde a data em que a entrega devia ter sido feita. Não têm redução.",
            },
            {
              titulo: "E há coima pela falta de entrega da prestação",
              texto: `Por negligência, entre ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMin.value)} e ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMax.value)} do imposto em falta; por dolo, pode chegar ao dobro do valor em falta.`,
            },
            {
              titulo: "Recuperar do fornecedor é problema comercial, não fiscal",
              texto: "Perante a AT, o devedor és tu. Se o contrato te permite reaver o valor do fornecedor, isso resolve-se entre vocês — e raramente resolve.",
            },
            {
              titulo: "Regularizar cedo reduz a coima",
              texto: "Entregar e pagar por iniciativa própria, antes de qualquer ação da AT, mantém aberta a redução ao mínimo legal.",
            },
          ]}
        />
        <AvisoPrazo titulo="Na dúvida, retém — e corrige depois">
          Reter a mais é reversível: o fornecedor pede reembolso do excesso, com o certificado de
          residência. Não reter não é reversível do teu lado — o imposto fica-te.
        </AvisoPrazo>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução da coima, e o que a fecha
        </VaiPara>
        <VaiPara href="/guias/nao-residentes-irs">
          Como Portugal tributa quem cá não reside
        </VaiPara>
      </Seccao>
    </>
  );
}
