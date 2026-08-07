import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { AJUSTE_BASE_SS, SS_COEFICIENTE, SS_MIN_MENSAL } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto à base de incidência e ao ajuste
// voluntário (Código dos Regimes Contributivos, via motor).
//
// O pacote manda «confirmar prazo de garantia e período de referência na
// regulamentação do Código Contributivo». Não foi possível verificar esses
// números em fonte oficial legível nesta revisão — o Diário da República
// serve um shell vazio e o portal da Segurança Social é renderizado por
// JavaScript. O guia descreve o mecanismo, diz onde confirmar, e não fixa
// prazos que não leu.
export default function CorpoParentalidadeIndependentes() {
  return (
    <>
      <Seccao titulo="Prazo de garantia">
        <Paragrafo>
          Como em todas as prestações contributivas, é preciso ter um número mínimo de meses com{" "}
          <strong>registo de remunerações</strong> antes de haver direito. São meses em que houve
          contribuição — não meses em que houve atividade.
        </Paragrafo>
        <Paragrafo>
          O prazo concreto consta da regulamentação do Código dos Regimes Contributivos, e este guia
          não o fixa porque não foi possível confirmá-lo em fonte oficial verificável. Confirma-o na
          Segurança Social Direta ou no guia prático da parentalidade{" "}
          <strong>antes de contares com o subsídio</strong> — e, sobretudo, antes de planear.
        </Paragrafo>
        <AvisoPrazo titulo="Períodos de isenção não contam para o prazo">
          É a consequência que mais surpreende. A isenção do primeiro ano de atividade não gera
          registo de remunerações, pelo que não faz correr o prazo de garantia. Quem abriu atividade
          há pouco pode não ter cobertura ainda.
        </AvisoPrazo>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          O que os períodos de isenção custam em proteção
        </VaiPara>
      </Seccao>

      <Seccao titulo="As modalidades de licença e as percentagens">
        <Paragrafo>
          As modalidades são as mesmas dos trabalhadores por conta de outrem — a licença parental
          inicial, com durações alternativas e percentagens diferentes conforme a opção; a licença
          exclusiva do pai; e as licenças por riscos clínicos, interrupção da gravidez e adoção.
        </Paragrafo>
        <Paragrafo>
          A escolha entre as durações alternativas da licença inicial é uma troca entre{" "}
          <strong>tempo e percentagem</strong>: mais meses de licença correspondem a uma percentagem
          menor da remuneração de referência, e o total recebido não é indiferente à opção.
        </Paragrafo>
        <Nota titulo="A partilha entre progenitores mexe na percentagem">
          As modalidades partilhadas têm percentagens próprias, pensadas para incentivar a divisão da
          licença. Vale a pena fazer a conta com as duas hipóteses antes de decidir — a diferença
          costuma ser material.
        </Nota>
        <VaiPara href="/guias/licenca-parental">
          As modalidades e as durações, em detalhe
        </VaiPara>
      </Seccao>

      <Seccao titulo="Remuneração de referência: de onde sai">
        <Paragrafo>
          É o ponto que distingue um independente de um trabalhador por conta de outrem, e é onde
          este guia se torna concreto.
        </Paragrafo>
        <Paragrafo>
          Para quem tem vencimento, a remuneração de referência sai do que a entidade patronal
          declarou. Para um independente, sai da <strong>base de incidência</strong> que ele próprio
          declarou nas trimestrais — isto é, de{" "}
          <strong>{pctExato(SS_COEFICIENTE.servicos.value)}</strong> do rendimento declarado nas
          prestações de serviços, com o ajuste que tiver escolhido.
        </Paragrafo>
        <AvisoPrazo titulo="Quem contribui pelo mínimo recebe pelo mínimo">
          A contribuição mínima mensal é de{" "}
          <strong>{fmt(SS_MIN_MENSAL.value)}</strong>, e é ela que fixa o piso da remuneração
          registada. Uma carreira construída sobre bases mínimas dá um subsídio parental mínimo,
          independentemente do que o negócio realmente fatura.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Partilha entre os progenitores">
        <Paragrafo>
          Cada progenitor recebe pela <strong>sua própria</strong> remuneração de referência, apurada
          no seu próprio regime. Um casal em que um é independente e o outro trabalha por conta de
          outrem tem duas contas diferentes, feitas por regras diferentes.
        </Paragrafo>
        <Paragrafo>
          É uma variável a mais na decisão de como repartir a licença: além do tempo que cada um quer
          ou pode tirar, há a diferença entre as duas remunerações de referência — e ela pode ser
          grande quando um dos dois declarou bases baixas.
        </Paragrafo>
        <Nota titulo="A licença exclusiva do pai é obrigatória e é dele">
          Não é transferível nem depende de acordo. Para um pai independente, aplica-se a sua própria
          remuneração de referência, com a mesma lógica.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se requer e prazos">
        <Passos
          passos={[
            {
              titulo: "Requerer na Segurança Social Direta",
              texto: "Há um prazo a contar do início da licença, e requerer fora dele pode fazer perder dias de subsídio. Trata disto na primeira semana.",
            },
            {
              titulo: "Ter a situação contributiva regularizada",
              texto: "É condição de atribuição. Uma dívida pendente trava o pagamento de uma prestação a que terias direito — e resolvê-la a meio da licença é o pior momento.",
            },
            {
              titulo: "Juntar a documentação do nascimento ou da adoção",
              texto: "E, nas modalidades partilhadas, a declaração de ambos os progenitores sobre a repartição escolhida.",
            },
            {
              titulo: "Confirmar o IBAN registado",
              texto: "É por onde o subsídio é pago. Vale a pena verificar antes de precisar.",
            },
            {
              titulo: "Continuar a entregar as declarações trimestrais",
              texto: "A obrigação declarativa não suspende durante a licença.",
            },
          ]}
        />
        <VaiPara href="/guias/situacao-regularizada">
          Como se confirma a situação contributiva regularizada
        </VaiPara>
      </Seccao>

      <Seccao titulo="O efeito de ter baixado a base de incidência">
        <Paragrafo>
          O ajuste voluntário de <strong>±{pctExato(AJUSTE_BASE_SS.amplitude.value)}</strong>, em
          degraus de {pctExato(AJUSTE_BASE_SS.degrau.value)}, é a alavanca que tens sobre a
          contribuição. Aqui vê-se o preço de a puxar para baixo.
        </Paragrafo>
        <Paragrafo>
          A remuneração de referência sai da base declarada nos meses relevantes —{" "}
          <strong>anteriores ao nascimento</strong>. Quando a licença começa, esses meses já
          passaram, e o ajuste que fizeste há um ano já não se desfaz.
        </Paragrafo>
        <AvisoPrazo titulo="É o único caso em que se pode planear com antecedência">
          Ao contrário de uma baixa médica, uma gravidez dá meses de aviso. Quem sabe que vai ter um
          filho pode <em>subir</em> a base de incidência nas trimestrais seguintes — pagando mais
          agora para receber mais durante a licença. É a utilização mais útil do ajuste para cima, e
          quase ninguém a faz.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          O ajuste da base, e o que ele troca
        </VaiPara>
      </Seccao>

      <Seccao titulo="Situação contributiva regularizada como condição">
        <Paragrafo>
          Vale a pena isolá-la, porque é a causa mais frequente de indeferimento e a mais fácil de
          evitar. Ter a situação contributiva regularizada é <strong>condição de atribuição</strong>{" "}
          das prestações parentais — não é uma formalidade.
        </Paragrafo>
        <Paragrafo>
          Uma dívida antiga e esquecida, uma declaração trimestral em falta, um trimestre por pagar:
          qualquer um trava o processo no pior momento possível.
        </Paragrafo>
        <Nota titulo="Verifica agora, não quando precisares">
          Confirma-se em minutos na Segurança Social Direta. Havendo dívida, o plano prestacional
          repõe a situação regularizada — mas leva tempo, e é tempo que não tens com um filho a
          nascer.
        </Nota>
        <VaiPara href="/guias/plano-prestacoes">
          Pagar em prestações para repor a situação regularizada
        </VaiPara>
      </Seccao>
    </>
  );
}
