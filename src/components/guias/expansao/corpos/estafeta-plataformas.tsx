import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IVA_ISENCAO_LIMITE, SS_ISENCAO_PRIMEIRO_ANO_MESES, SS_COEFICIENTE, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 3.º, 31.º e 101.º do CIRS, art. 53.º
// do CIVA e o Código dos Regimes Contributivos.
//
// O pacote manda ligar ao guia `falsos-recibos-verdes` em vez de duplicar o
// teste da subordinação — é o que se faz na última secção.
export default function CorpoEstafetaPlataformas() {
  return (
    <>
      <Seccao titulo="Abrir atividade e escolher o CAE">
        <Paragrafo>
          Entregar ao domicílio por plataforma é <strong>prestação de serviços</strong>: abre-se
          atividade, emitem-se faturas-recibo e o rendimento é da categoria B. A plataforma é tua
          cliente, não tua entidade patronal.
        </Paragrafo>
        <Paragrafo>
          Como em toda esta secção, o enquadramento faz-se por{" "}
          <strong>profissão da tabela do art. 151.º</strong> ou por <strong>CAE</strong>, e a
          escolha determina o coeficiente e a retenção. Os dois cenários estão na tabela de dados
          aqui em baixo.
        </Paragrafo>
        <Nota titulo="Uma plataforma estrangeira não retém nada">
          Se quem te paga não tem sede nem estabelecimento estável em Portugal, não há retenção na
          fonte. O imposto não desaparece — aparece todo de uma vez no acerto do ano seguinte.
        </Nota>
      </Seccao>

      <Seccao titulo="O rendimento relevante e a base de incidência">
        <Paragrafo>
          As contribuições não incidem sobre a faturação: incidem sobre a{" "}
          <strong>base de incidência</strong>, que nos serviços é{" "}
          {pctExato(SS_COEFICIENTE.servicos.value)} do rendimento declarado. Sobre essa base aplica-se
          a taxa contributiva de {pctExato(SS_TAXA.value)}.
        </Paragrafo>
        <Paragrafo>
          A base apura-se trimestralmente, a partir do que declarares na declaração trimestral — e é
          essa declaração que fixa o valor a pagar nos três meses seguintes.
        </Paragrafo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          A declaração trimestral, campo a campo
        </VaiPara>
      </Seccao>

      <Seccao titulo="A isenção do primeiro ano e o que vem depois">
        <Paragrafo>
          É o eixo deste guia. Nos primeiros{" "}
          <strong>{SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses</strong> de atividade não pagas
          contribuições. Não é um desconto: é uma isenção total, automática, que termina sozinha.
        </Paragrafo>
        <Paragrafo>
          A partir daí, com <em>exatamente a mesma faturação</em>, aparece um custo fixo mensal que
          antes não existia — e que, para quem entrega a tempo inteiro, costuma ser o maior encargo
          da atividade, à frente do IRS.
        </Paragrafo>
        <AvisoPrazo titulo="O segundo ano é onde as contas rebentam">
          Quem calibrou a vida pelo rendimento líquido do primeiro ano encontra no décimo terceiro
          mês uma despesa nova e recorrente. Simula o segundo ano <em>durante</em> o primeiro, e
          começa a reservar antes de a primeira nota de cobrança chegar.
        </AvisoPrazo>
        <VaiPara href="/dashboard/simulador">Simular o ano completo, com contribuições</VaiPara>
      </Seccao>

      <Seccao titulo="IVA: quando ainda não é preciso">
        <Paragrafo>
          Abaixo de <strong>{fmt(IVA_ISENCAO_LIMITE.value)}</strong> de volume de negócios anual,
          aplica-se o regime de isenção: não liquidas IVA nas faturas e não deduzes o que suportas
          nas compras.
        </Paragrafo>
        <Paragrafo>
          No primeiro ano de atividade o limiar é <strong>proporcional</strong> aos meses em que
          exerceste — começar em setembro não te dá o limiar inteiro. É a armadilha silenciosa de
          quem abre atividade no último trimestre.
        </Paragrafo>
        <VaiPara href="/guias/mudar-regime-iva">Quando e como se muda de regime</VaiPara>
      </Seccao>

      <Seccao titulo="Despesas que efetivamente contam">
        <Paragrafo>
          No regime simplificado não se deduzem despesas uma a uma — o coeficiente já assume um nível
          de gasto. O que as tuas despesas fazem é servir a regra das despesas a justificar, que a
          tabela de dados
          identifica: a parte não justificada é acrescida ao rendimento tributável.
        </Paragrafo>
        <Paragrafo>
          Contam, com fatura e NIF: mota ou bicicleta e a sua manutenção, combustível ou
          eletricidade, mochila térmica, telemóvel e dados, equipamento de proteção, seguro da
          atividade. Não conta o que é manifestamente pessoal.
        </Paragrafo>
        <Nota titulo="A comissão da plataforma é despesa, e o bruto é receita">
          Declara-se o valor bruto da entrega e a comissão é custo. Declarar só o que a plataforma
          transferiu subdeclara o rendimento — e a plataforma comunica o bruto.
        </Nota>
      </Seccao>

      <Seccao titulo="Sinais de que a relação é, na verdade, subordinada">
        <Paragrafo>
          A forma jurídica não decide: decide a substância. Se a relação tem as marcas de um
          contrato de trabalho, pode ser requalificada como tal — com contribuições e direitos
          laborais retroativos.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Horários impostos, e não escolhidos",
              texto: "Turnos atribuídos, obrigação de aceitar entregas ou penalização por recusar são indícios fortes de subordinação.",
            },
            {
              titulo: "Instruções sobre o modo de executar",
              texto: "Não é dizer o que entregar, é dizer como: rota obrigatória, tempo máximo, comportamento exigido.",
            },
            {
              titulo: "Equipamento e imagem fornecidos por quem paga",
              texto: "Farda, mochila com marca e aplicação de uso obrigatório apontam para integração na organização.",
            },
            {
              titulo: "Exclusividade, de direito ou de facto",
              texto: "Não poder trabalhar para concorrentes — ou o sistema tornar isso inviável — é dos indícios mais pesados.",
            },
            {
              titulo: "Avaliação, disciplina e desativação",
              texto: "Um poder disciplinar com outro nome continua a ser poder disciplinar.",
            },
          ]}
        />
        <AvisoPrazo titulo="O teste faz-se pelo conjunto, não por um indício isolado">
          Nenhum destes sinais decide sozinho. O que conta é o quadro completo — e é sobre ele que
          se pronunciam a Autoridade para as Condições do Trabalho e os tribunais.
        </AvisoPrazo>
        <VaiPara href="/guias/falsos-recibos-verdes">
          Os indícios de subordinação, um a um, e o que fazer com eles
        </VaiPara>
        <VaiPara href="/guias/tvde-motorista">
          Se além de entregares também conduzes em TVDE
        </VaiPara>
      </Seccao>
    </>
  );
}
