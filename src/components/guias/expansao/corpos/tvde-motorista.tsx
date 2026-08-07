import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { IVA_ISENCAO_EXCESSO, IVA_ISENCAO_LIMITE, REGIME_15PCT, SS_ISENCAO_PRIMEIRO_ANO_MESES } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// arts. 3.º, 31.º, 101.º e 151.º do CIRS, arts. 18.º e 53.º do CIVA, e o
// Código dos Regimes Contributivos quanto à base de incidência.
//
// O pacote põe o mesmo aviso nos dez guias desta secção: o CAE e o
// enquadramento no art. 151.º determinam coeficiente e retenção, e não se
// generaliza por nome de profissão. É por isso que a tabela de dados mostra
// os dois enquadramentos lado a lado, e o corpo explica como se escolhe.
export default function CorpoTvdeMotorista() {
  return (
    <>
      <Seccao titulo="Abrir atividade: CAE e enquadramento">
        <Paragrafo>
          Conduzir em TVDE é <strong>atividade independente</strong> — ou societária, se optares por
          criar empresa. Não é trabalho por conta de outrem da plataforma, e a plataforma não te
          desconta nada: o que te transfere é receita bruta tua.
        </Paragrafo>
        <Paragrafo>
          Na abertura de atividade escolhes entre duas vias, e a escolha condiciona tudo o resto:
          uma <strong>profissão da tabela do art. 151.º</strong> do Código do IRS, ou uma{" "}
          <strong>atividade identificada por CAE</strong> que não conste dessa tabela. Os
          coeficientes e as retenções de cada uma estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <AvisoPrazo titulo="Isto não se decide pelo nome da profissão">
          A escolha do código determina o coeficiente do regime simplificado e a taxa de retenção na
          fonte — e a diferença entre os dois enquadramentos é grande. Confirma o teu caso concreto
          com um contabilista certificado antes de submeter a declaração de início de atividade:
          mudar depois é possível, mas produz efeitos para a frente, não para trás.
        </AvisoPrazo>
        <VaiPara href="/dashboard/classificar-atividade">
          Ferramenta para classificar a tua atividade
        </VaiPara>
      </Seccao>

      <Seccao titulo="Coeficiente aplicável e o que ele já assume">
        <Paragrafo>
          No regime simplificado não declaras despesas: aplica-se um{" "}
          <strong>coeficiente</strong> ao rendimento bruto e o resultado é o que vai a imposto. A
          parte que fica de fora é a presunção legal de despesas — a lei assume que gastaste isso, e
          não te pede provas.
        </Paragrafo>
        <Paragrafo>
          É o ponto que mais engana quem conduz. Combustível, portagens, manutenção, seguro e
          aluguer da viatura <strong>não se somam</strong> por cima do coeficiente: já estão dentro
          da parte que o coeficiente deixa de fora.
        </Paragrafo>
        <AvisoPrazo titulo="Mas há a regra das despesas a justificar, que pede provas">
          Nos coeficientes de serviços, se não justificares com despesas{" "}
          {pctExato(REGIME_15PCT.value)} do rendimento bruto, a parte não justificada é{" "}
          <strong>acrescida</strong> ao rendimento tributável. É o único ponto do regime
          simplificado em que os teus recibos de despesa importam — e importam bastante.
        </AvisoPrazo>
        <Nota titulo="Quando a contabilidade organizada passa a fazer sentido">
          Quem tem custos reais muito acima da presunção legal — viatura em aluguer de longa
          duração, quilometragem alta — pode ficar melhor com contabilidade organizada, onde as
          despesas se deduzem pelo valor efetivo. Traz um contabilista certificado obrigatório e
          custos fixos: faz-se a conta antes, não depois.
        </Nota>
        <VaiPara href="/dashboard/comparar">Comparar os dois regimes com os teus números</VaiPara>
      </Seccao>

      <Seccao titulo="IVA: isenção, regime normal e a taxa dos serviços">
        <Paragrafo>
          Enquanto o volume de negócios anual ficar abaixo de{" "}
          <strong>{fmt(IVA_ISENCAO_LIMITE.value)}</strong>, aplica-se o regime de isenção do art.
          53.º: não liquidas IVA e não deduzes o IVA que suportas.
        </Paragrafo>
        <Paragrafo>
          Ultrapassado o limiar, passas ao regime normal — e há um degrau que apanha muita gente: se
          o excesso for superior a um quarto do limiar, isto é, acima de{" "}
          <strong>{fmt(IVA_ISENCAO_EXCESSO.value)}</strong>, a passagem é{" "}
          <strong>imediata</strong>, e não no ano seguinte.
        </Paragrafo>
        <AvisoPrazo titulo="No regime normal, o IVA nunca foi teu">
          O que a plataforma te transfere passa a incluir imposto que tens de entregar ao Estado.
          Quem não o separa em cada pagamento descobre na declaração periódica que gastou dinheiro
          que estava só de passagem.
        </AvisoPrazo>
        <VaiPara href="/guias/mudar-regime-iva">Como se faz a passagem de regime</VaiPara>
      </Seccao>

      <Seccao titulo="Segurança Social sobre o rendimento relevante">
        <Paragrafo>
          As contribuições não incidem sobre tudo o que faturas: incidem sobre uma fração do
          rendimento — a <strong>base de incidência</strong> —, e a taxa aplica-se a essa base. Os
          valores estão na tabela de dados.
        </Paragrafo>
        <Paragrafo>
          Nos primeiros <strong>{SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses</strong> de atividade há
          isenção. É a razão pela qual o segundo ano é sempre mais caro do que o primeiro, com
          exatamente a mesma faturação — e a razão pela qual tanta gente é apanhada de surpresa.
        </Paragrafo>
        <AvisoPrazo titulo="A declaração trimestral não se salta">
          Faz-se em janeiro, abril, julho e outubro, e é ela que fixa o valor a pagar no trimestre
          seguinte. Sem ela, a Segurança Social usa a última base conhecida — que pode ser muito
          superior ao que faturaste.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          A declaração trimestral, campo a campo
        </VaiPara>
        <VaiPara href="/guias/seguranca-social">As contribuições dos independentes</VaiPara>
      </Seccao>

      <Seccao titulo="Despesas: combustível, aluguer da viatura, plataforma">
        <Paragrafo>
          A comissão que a plataforma cobra é despesa da tua atividade, e a receita a declarar é o{" "}
          <strong>bruto da viagem</strong> — não o líquido transferido. Declarar só o que entrou na
          conta subdeclara o rendimento, mesmo quando a intenção é a oposta.
        </Paragrafo>
        <Paragrafo>
          Combustível, portagens, manutenção, lavagens, aluguer da viatura e seguro são despesas
          reais da atividade. No regime simplificado servem para a regra dos{" "}
          {pctExato(REGIME_15PCT.value)}; na contabilidade organizada deduzem-se pelo valor efetivo,
          com as regras próprias das viaturas.
        </Paragrafo>
        <Nota titulo="Guarda tudo com NIF">
          Uma despesa sem fatura com o teu NIF não conta para nada — nem para a regra dos{" "}
          {pctExato(REGIME_15PCT.value)}, nem para a contabilidade organizada, nem para o IVA. É o
          hábito mais barato de adquirir e o que mais rende.
        </Nota>
      </Seccao>

      <Seccao titulo="Seguros obrigatórios">
        <Paragrafo>
          A atividade de TVDE tem exigências próprias de seguro, distintas do seguro automóvel
          comum: além da responsabilidade civil automóvel, há cobertura exigida para os passageiros
          transportados na atividade.
        </Paragrafo>
        <Paragrafo>
          Os requisitos concretos constam da legislação do setor e da regulamentação do IMT, e são
          verificados no licenciamento. Confirma as coberturas exigidas junto do teu operador ou do
          regulador — este guia trata do lado fiscal e contributivo, não do licenciamento.
        </Paragrafo>
        <AvisoPrazo titulo="Um seguro particular não cobre atividade remunerada">
          Conduzir em TVDE com apólice de uso particular deixa-te sem cobertura no momento em que
          mais precisas dela. É a falha mais cara desta lista, e não é fiscal.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que guardar para justificar tudo">
        <Paragrafo>
          · <strong>Relatórios da plataforma</strong>, mês a mês, com o bruto das viagens e a
          comissão retida — é o que reconcilia o que declaras com o que te entrou na conta.
          <br />· <strong>Faturas de combustível e portagens</strong> com o teu NIF.
          <br />· <strong>Contrato e faturas de aluguer</strong> da viatura, se não for tua.
          <br />· <strong>Manutenção, pneus e revisões</strong>, com fatura.
          <br />· <strong>Apólice e recibos de seguro</strong> da atividade.
          <br />· <strong>Comprovativos das declarações trimestrais</strong> e dos pagamentos à
          Segurança Social.
        </Paragrafo>
        <Nota titulo="Quatro anos é o mínimo a guardar">
          Os documentos de suporte sustentam a declaração, e a AT pode pedi-los anos depois. Uma
          pasta por ano, digitalizada, resolve o problema antes de ele existir.
        </Nota>
        <VaiPara href="/guias/estafeta-plataformas">
          Se além de conduzires também entregas: a conta que muda no segundo ano
        </VaiPara>
      </Seccao>
    </>
  );
}
