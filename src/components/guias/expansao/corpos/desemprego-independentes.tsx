import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IAS, SS_COEFICIENTE, SUBSIDIO_DESEMPREGO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: prazo de garantia, percentagem, limites e
// duração vêm do motor, com fonte na Segurança Social.
//
// O pacote avisa para distinguir independentes em geral de economicamente
// dependentes — os regimes de proteção não são iguais. É a secção central
// deste guia.
export default function CorpoDesempregoIndependentes() {
  return (
    <>
      <Seccao titulo="Quem está abrangido">
        <Paragrafo>
          Há proteção no desemprego para quem trabalha por conta própria — mas não é a mesma para
          todos, e a diferença é grande.
        </Paragrafo>
        <Paragrafo>
          De um lado, os <strong>trabalhadores independentes economicamente dependentes</strong>: os
          que obtêm de uma única entidade contratante uma parte determinante do seu rendimento. Do
          outro, os <strong>independentes em geral</strong>, incluindo empresários em nome individual
          e membros de órgãos estatutários.
        </Paragrafo>
        <AvisoPrazo titulo="Os dois regimes não têm as mesmas condições">
          Confundi-los leva a expectativas erradas nos dois sentidos: quem é economicamente
          dependente pode ter direito e não saber; quem não é pode contar com uma proteção que o seu
          regime não lhe dá nos mesmos termos. Confirma o teu enquadramento na Segurança Social antes
          de contar com o subsídio.
        </AvisoPrazo>
        <VaiPara href="/guias/entidade-contratante">
          O que é dependência económica, e como se apura
        </VaiPara>
      </Seccao>

      <Seccao titulo="Prazo de garantia">
        <Paragrafo>
          É preciso ter <strong>{SUBSIDIO_DESEMPREGO.prazoGarantiaDias.value} dias</strong> com
          registo de remunerações num período de referência anterior à cessação — e são dias de
          contribuição efetiva, não dias de atividade.
        </Paragrafo>
        <Paragrafo>
          Períodos de isenção contributiva não geram registo de remunerações, pelo que não contam. É
          a mesma lógica de todas as prestações contributivas, e a mesma armadilha para quem começou
          há pouco.
        </Paragrafo>
        <Nota titulo="Confirma o período de referência aplicável ao teu caso">
          O prazo de garantia mede-se dentro de uma janela temporal definida na regulamentação, e
          essa janela difere entre regimes. É uma verificação a fazer na Segurança Social, não a
          assumir.
        </Nota>
      </Seccao>

      <Seccao titulo="O que conta como cessação involuntária">
        <Paragrafo>
          É a condição que separa este subsídio de uma decisão de mudar de vida. A cessação da
          atividade tem de ser <strong>involuntária</strong> — e a prova é o ponto crítico do
          processo.
        </Paragrafo>
        <Paragrafo>
          Nos economicamente dependentes, a situação típica é o <strong>fim do contrato de prestação
          de serviços</strong> com a entidade de que se dependia, por iniciativa dela. Nos
          independentes em geral, exige-se demonstração de que a cessação resultou de circunstâncias
          alheias à vontade — e não da simples decisão de fechar.
        </Paragrafo>
        <AvisoPrazo titulo="Encerrar por decisão própria não dá direito">
          Cessar atividade porque se quer mudar de área, ou porque se prefere outra coisa, é
          voluntário. E a Segurança Social vê a cessação declarada por ti — pelo que a prova do
          carácter involuntário é toda tua.
        </AvisoPrazo>
        <Nota titulo="Guarda a comunicação de fim de contrato">
          A carta ou o email em que o cliente comunica que não renova é, na prática, o documento
          central do processo de quem é economicamente dependente. Pede-o por escrito.
        </Nota>
      </Seccao>

      <Seccao titulo="Economicamente dependentes: o regime próprio">
        <Paragrafo>
          É o regime desenhado para quem, sendo formalmente independente, vive de um só cliente — e
          por isso fica exposto ao mesmo risco de um trabalhador por conta de outrem sem ter a mesma
          proteção.
        </Paragrafo>
        <Paragrafo>
          É a contrapartida da contribuição de <strong>entidade contratante</strong>: a mesma
          dependência económica que faz o cliente contribuir é a que abre a porta a esta proteção. As
          duas peças pertencem ao mesmo desenho.
        </Paragrafo>
        <Nota titulo="Não é automático por se ser dependente">
          O enquadramento como economicamente dependente resulta do apuramento da Segurança Social, e
          as condições de acesso ao subsídio têm de estar preenchidas na mesma. Ser dependente abre a
          porta; não a atravessa.
        </Nota>
      </Seccao>

      <Seccao titulo="Cálculo e duração">
        <Paragrafo>
          O subsídio é de <strong>{pctExato(SUBSIDIO_DESEMPREGO.taxa.value)}</strong> da remuneração
          de referência, que num independente sai da{" "}
          <strong>base de incidência declarada</strong> — {pctExato(SS_COEFICIENTE.servicos.value)}{" "}
          do rendimento, nas prestações de serviços.
        </Paragrafo>
        <Paragrafo>
          Há um piso e um teto, ambos indexados ao IAS: o mínimo é{" "}
          {SUBSIDIO_DESEMPREGO.minimoIAS.value} × IAS —{" "}
          {fmt(SUBSIDIO_DESEMPREGO.minimoIAS.value * IAS.value)} — e o máximo é{" "}
          {SUBSIDIO_DESEMPREGO.maximoIAS.value} × IAS —{" "}
          {fmt(SUBSIDIO_DESEMPREGO.maximoIAS.value * IAS.value)}.
        </Paragrafo>
        <Paragrafo>
          A duração vai de <strong>{SUBSIDIO_DESEMPREGO.duracaoMinimaDias.value}</strong> a{" "}
          <strong>{SUBSIDIO_DESEMPREGO.duracaoMaximaDias.value} dias</strong>, conforme a idade e a
          carreira contributiva.
        </Paragrafo>
        <AvisoPrazo titulo="Quem declarou bases mínimas recebe o mínimo">
          A remuneração de referência sai do que declaraste, não do que faturaste. Anos de ajuste
          para baixo na declaração trimestral chegam aqui transformados num subsídio no piso legal.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          O ajuste da base, e o que ele troca no futuro
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se requer">
        <Passos
          passos={[
            {
              titulo: "Inscrever-se para emprego no centro de emprego",
              texto: "É condição, e o momento em que se faz conta para o prazo. Não é um passo formal a fazer depois.",
            },
            {
              titulo: "Requerer o subsídio na Segurança Social Direta",
              texto: "Há um prazo a contar da cessação, e requerer fora dele reduz ou faz perder o direito.",
            },
            {
              titulo: "Juntar a prova da cessação involuntária",
              texto: "A comunicação da entidade contratante, a denúncia do contrato, o que houver. É a peça que decide o processo.",
            },
            {
              titulo: "Ter a situação contributiva regularizada",
              texto: "Como em todas as prestações. Verifica antes, não depois de indeferido.",
            },
            {
              titulo: "Cessar a atividade, quando é isso que está em causa",
              texto: "Manter atividade aberta enquanto se pede subsídio de desemprego é contraditório — e a atividade aberta continua a gerar obrigação contributiva.",
            },
          ]}
        />
        <VaiPara href="/guias/cessar-atividade">Como se cessa a atividade</VaiPara>
      </Seccao>

      <Seccao titulo="Acumulação com nova atividade">
        <Paragrafo>
          Começar a trabalhar durante o período de subsídio tem de ser{" "}
          <strong>comunicado</strong>. Não comunicar transforma prestações recebidas em prestações
          indevidas — que são restituídas, com as consequências próprias.
        </Paragrafo>
        <Paragrafo>
          Há regimes que permitem acumulação parcial, e há apoios à criação do próprio emprego que
          usam o subsídio de outra forma — antecipando-o para financiar o arranque de uma atividade
          em vez de o pagar mês a mês.
        </Paragrafo>
        <AvisoPrazo titulo="Comunicar é sempre melhor do que arriscar">
          A Segurança Social cruza os seus próprios registos com os da AT. Uma atividade aberta ou
          uma fatura emitida aparecem — e a diferença entre ter comunicado e não ter comunicado é a
          diferença entre um ajuste e um processo de restituição.
        </AvisoPrazo>
        <VaiPara href="/guias/subsidio-desemprego">
          O subsídio de desemprego de quem trabalhava por conta de outrem
        </VaiPara>
      </Seccao>
    </>
  );
}
