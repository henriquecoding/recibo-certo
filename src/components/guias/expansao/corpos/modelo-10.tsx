import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, RETENCAO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 101.º e art. 119.º do CIRS, e art. 116.º do RGIT.
//
// O pacote manda «confirmar o prazo de entrega (habitualmente
// janeiro/fevereiro) na portaria em vigor». Não foi possível confirmá-lo em
// fonte legível nesta revisão — pelo que o guia diz que é anual, diz em que
// altura do ano cai e manda confirmar a data.
export default function CorpoModelo10() {
  return (
    <>
      <Seccao titulo="O que se declara na Modelo 10">
        <Paragrafo>
          Rendimentos pagos a <strong>residentes</strong> em Portugal e as retenções que sobre eles
          foram feitas — quando essa informação{" "}
          <strong>não conste já da declaração mensal de remunerações</strong>.
        </Paragrafo>
        <Paragrafo>
          É uma declaração de <em>fecho</em>: existe para apanhar o que não foi comunicado mês a mês.
          O caso típico de uma pequena empresa é o dos honorários pagos a prestadores de serviços — a
          categoria B.
        </Paragrafo>
        <Nota titulo="Declara-se o pago, e a retenção feita">
          Valor bruto pago no ano, retenção efetuada e a natureza do rendimento. É a partir daqui que
          a AT pré-preenche a declaração de quem recebeu — e que confronta o que ele declara com o que
          tu declaraste.
        </Nota>
      </Seccao>

      <Seccao titulo="A fronteira com a DMR">
        <Paragrafo>
          É a única coisa que interessa perceber neste guia, e resolve-se com uma pergunta: o
          rendimento é de <strong>trabalho dependente</strong>?
        </Paragrafo>
        <Paragrafo>
          Sendo — salários, subsídios, o que se paga a quem tem contrato de trabalho —, vai na{" "}
          <strong>declaração mensal de remunerações</strong>, todos os meses. Não sendo, vai na
          Modelo 10, uma vez por ano.
        </Paragrafo>
        <AvisoPrazo titulo="Declarar nas duas duplica o rendimento de alguém">
          É o erro mais frequente e o mais desagradável para quem recebe: o mesmo valor aparece duas
          vezes no pré-preenchido dele, e a correção obriga a substituições dos dois lados.
        </AvisoPrazo>
        <VaiPara href="/guias/dmr-dmis">
          A DMR e a DMIS, as duas declarações mensais que se esquecem
        </VaiPara>
      </Seccao>

      <Seccao titulo="Prazo de entrega">
        <Paragrafo>
          É <strong>anual</strong>, respeita ao ano civil anterior, e cai no{" "}
          <strong>início do ano</strong> — antes da campanha do IRS, precisamente porque é o que
          alimenta o pré-preenchido.
        </Paragrafo>
        <Paragrafo>
          O dia concreto consta da portaria aplicável e do calendário fiscal do ano. Confirma-o no
          Portal das Finanças — este guia não o fixa, porque é matéria de portaria.
        </Paragrafo>
        <AvisoPrazo titulo="Falhar este prazo prejudica outra pessoa antes de te prejudicar a ti">
          Sem a Modelo 10, o rendimento e a retenção não aparecem no pré-preenchido de quem recebeu.
          Ele declara à mão, ou não declara — e num caso e no outro tem trabalho ou problema por causa
          de uma declaração que não era dele.
        </AvisoPrazo>
        <VaiPara href="/dashboard/prazos">O calendário fiscal, com alertas antecipados</VaiPara>
      </Seccao>

      <Seccao titulo="Quem tem obrigação">
        <Paragrafo>
          Quem <strong>paga</strong> rendimentos sujeitos a declaração — e isso inclui empresas,
          entidades públicas e também <strong>profissionais independentes com contabilidade
          organizada</strong> que paguem a outros prestadores.
        </Paragrafo>
        <Paragrafo>
          A obrigação nasce do pagamento, não de ter havido retenção. Rendimentos pagos com dispensa
          de retenção declaram-se na mesma.
        </Paragrafo>
        <Nota titulo="As taxas de retenção que aqui se comunicam">
          São as do art. 101.º do CIRS, e variam com o enquadramento de quem recebe:{" "}
          {pctExato(RETENCAO.art151.value)} nas profissões da tabela do art. 151.º,{" "}
          {pctExato(RETENCAO.outros.value)} nas restantes atividades e{" "}
          {pctExato(RETENCAO.diretosAutor.value)} nos direitos de autor.
        </Nota>
        <VaiPara href="/guias/retencao-na-fonte">
          Como funciona a retenção, e quando se dispensa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Erros mais comuns">
        <Passos
          passos={[
            {
              titulo: "Esquecer os pagamentos com dispensa de retenção",
              texto: "A dispensa é de reter, não de declarar. Um prestador que invocou a dispensa continua a ter de constar da tua Modelo 10.",
            },
            {
              titulo: "Declarar o líquido em vez do bruto",
              texto: "O valor a declarar é o bruto pago; a retenção vai em campo próprio. Declarar o líquido subdeclara o rendimento de quem recebeu.",
            },
            {
              titulo: "Usar o código de rendimento errado",
              texto: "Cada natureza de rendimento tem o seu. O código errado põe o valor na categoria errada da declaração de quem recebeu.",
            },
            {
              titulo: "Confundir o ano do pagamento com o da fatura",
              texto: "A Modelo 10 segue o pagamento. Uma fatura de dezembro paga em janeiro declara-se no ano do pagamento.",
            },
            {
              titulo: "Não declarar pagamentos a não residentes aqui",
              texto: "E bem: esses vão na Modelo 30, que é mensal e tem regime próprio. Pô-los na Modelo 10 é declará-los no sítio errado.",
            },
          ]}
        />
        <VaiPara href="/guias/modelo-30">
          A Modelo 30, para pagamentos a entidades não residentes
        </VaiPara>
      </Seccao>

      <Seccao titulo="Substituição">
        <Paragrafo>
          Corrige-se por declaração de substituição, que <strong>repõe o ano completo</strong> — não
          se acrescenta o que faltava numa segunda declaração.
        </Paragrafo>
        <Paragrafo>
          Substituir cedo é o que evita o efeito em cadeia: quanto mais tarde, maior a probabilidade
          de quem recebeu já ter entregado a declaração dele com o valor errado.
        </Paragrafo>
        <AvisoPrazo titulo="A moldura da coima, e a redução">
          A falta ou atraso de declarações vai de {fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}. Entregar por iniciativa própria, antes de
          qualquer ação da AT, reduz ao mínimo legal — com o piso de{" "}
          {fmt(COIMAS_RGIT.minimoComReducao.value)}.
        </AvisoPrazo>
        <Nota titulo="Avisa quem recebeu">
          É a cortesia que evita o problema maior. Uma mensagem a dizer «corrigi a declaração, o teu
          pré-preenchido vai mudar» poupa-lhe uma substituição feita à pressa em junho.
        </Nota>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A redução da coima, e a janela que a permite
        </VaiPara>
      </Seccao>
    </>
  );
}
