import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  SIFIDE_MAJORACAO_PME_JOVEM,
  SIFIDE_REPORTE_ANOS,
  SIFIDE_TAXA_BASE,
  SIFIDE_TAXA_INCREMENTAL,
  SIFIDE_TETO_INCREMENTAL,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026. As taxas vêm do motor (arts. 35.º a 42.º
// do Código Fiscal do Investimento). A vigência do SIFIDE é prorrogada por
// diploma e o guia diz isso em vez de a dar por adquirida.
export default function CorpoSifide() {
  return (
    <>
      <Seccao titulo="A percentagem não é o problema">
        <Paragrafo>
          O SIFIDE tem a taxa de apoio mais alta de todo o sistema fiscal português:{" "}
          <strong>{pctExato(SIFIDE_TAXA_BASE.value)}</strong> das despesas de investigação e
          desenvolvimento, deduzidos diretamente à coleta de IRC.
        </Paragrafo>
        <Paragrafo>
          E é precisamente por isso que a dificuldade está noutro sítio. Nenhuma empresa perde o
          SIFIDE por causa da taxa — perde-o por não conseguir provar que aquilo que fez é{" "}
          <strong>investigação e desenvolvimento</strong> no sentido em que a lei usa a expressão.
        </Paragrafo>
        <AvisoPrazo titulo="Desenvolver software não é, por si só, I&D">
          É o mal-entendido mais caro desta matéria. Construir um produto, ainda que difícil e
          original, é desenvolvimento de produto. I&D exige incerteza técnica — um problema cuja
          solução não era conhecida à partida e que exigiu investigação para se resolver.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A taxa incremental, que quase ninguém aproveita">
        <Paragrafo>
          Além da taxa base, há uma segunda camada:{" "}
          <strong>{pctExato(SIFIDE_TAXA_INCREMENTAL.value)}</strong> do{" "}
          <em>aumento</em> de despesas de I&D face à média dos dois anos anteriores.
        </Paragrafo>
        <Paragrafo>
          O incremento elegível tem teto: <strong>{fmt(SIFIDE_TETO_INCREMENTAL.value)}</strong>. E
          para empresas jovens há ainda uma majoração de{" "}
          <strong>{pctExato(SIFIDE_MAJORACAO_PME_JOVEM.value)}</strong>, para PME que ainda não
          completaram dois exercícios e nunca beneficiaram da taxa incremental.
        </Paragrafo>
        <Nota titulo="Duas camadas, não duas alternativas">
          A taxa base aplica-se a toda a despesa do período; a incremental, só ao aumento. Somam-se —
          é por isso que um ano de investimento forte depois de dois anos fracos vale muito mais do
          que a média sugere.
        </Nota>
      </Seccao>

      <Seccao titulo="Não ter coleta não faz perder o crédito">
        <Paragrafo>
          É a pergunta que trava metade das candidaturas: «e se a empresa não tiver lucro?».
        </Paragrafo>
        <Paragrafo>
          O crédito que não puder ser deduzido por insuficiência de coleta é reportável por{" "}
          <strong>{SIFIDE_REPORTE_ANOS.value} exercícios</strong>. Uma empresa que investe hoje em
          I&D e só dá lucro daqui a cinco anos continua a poder usar o crédito.
        </Paragrafo>
        <AvisoPrazo titulo="Mas tem de ser pedido no ano em que a despesa acontece">
          O reporte salva a dedução, não salva a candidatura. Quem não a apresenta no ano da despesa
          não tem crédito nenhum para reportar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A vigência, e porque é que isto se confirma todos os anos">
        <Paragrafo>
          O SIFIDE não é um regime permanente: a sua vigência é <strong>prorrogada por
          diploma</strong>, período de tributação a período de tributação. Já foi prorrogado várias
          vezes, e cada prorrogação é uma decisão política nova.
        </Paragrafo>
        <Paragrafo>
          Antes de estruturar um plano plurianual de investimento à volta deste benefício, confirma
          até que período está prorrogado — e conta com a hipótese de não o estar para o ano
          seguinte.
        </Paragrafo>
        <Nota titulo="O SIFIDE indireto acabou">
          A dedução por via de subscrição de fundos de investimento em I&D foi eliminada. Só conta o
          investimento direto. Quem tenha sido abordado com uma proposta desse género deve confirmar
          o enquadramento antes de avançar.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se prepara uma candidatura que sobrevive a uma inspeção">
        <Passos
          passos={[
            {
              titulo: "Escrever o problema técnico antes de escrever a solução",
              texto: "O que é que não se sabia fazer, e porquê. É a única coisa que distingue I&D de desenvolvimento de produto — e a que os avaliadores procuram primeiro.",
            },
            {
              titulo: "Registar o tempo das pessoas por projeto, durante o ano",
              texto: "A maior parte da despesa de I&D é pessoal. Reconstruir a afetação de horas em dezembro, de memória, é a origem mais comum de correções.",
            },
            {
              titulo: "Separar contabilisticamente a despesa elegível",
              texto: "Contas ou centros de custo próprios. Uma despesa que só se identifica por interpretação da fatura é uma despesa frágil.",
            },
            {
              titulo: "Guardar o que ficou registado do processo, não só o resultado",
              texto: "Repositórios, cadernos de ensaios, atas, versões abandonadas. As tentativas falhadas são a melhor prova de que houve incerteza técnica.",
            },
            {
              titulo: "Confirmar a situação fiscal e contributiva regularizada",
              texto: "É condição transversal aos benefícios fiscais. Uma certidão bloqueada por uma coima antiga chega para inviabilizar a candidatura.",
            },
            {
              titulo: "Candidatar no prazo, mesmo sem coleta",
              texto: "O crédito reporta-se; a candidatura fora de prazo não se recupera.",
            },
          ]}
        />
        <VaiPara href="/guias/rfai">
          O outro benefício do mesmo lado da declaração: investimento produtivo
        </VaiPara>
        <VaiPara href="/guias/situacao-regularizada">
          A certidão que trava candidaturas, e o que a desbloqueia
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas elegíveis: onde está o dinheiro">
        <Paragrafo>
          A maior fatia é quase sempre <strong>pessoal afeto a I&D</strong> — e é também a que mais
          se perde por falta de registo de afetação. Somam-se aquisições de ativos afetos a
          investigação, contratação de I&D a entidades reconhecidas, registo e manutenção de
          patentes, auditorias e ações de demonstração.
        </Paragrafo>
        <Paragrafo>
          O que não conta é tão importante quanto o que conta: despesas correntes de exploração,
          esforço comercial, instalação de produto no cliente, manutenção evolutiva. É a fronteira que
          separa um projeto elegível de um projeto que apenas foi difícil.
        </Paragrafo>
        <AvisoPrazo titulo="Subsídios recebidos abatem à despesa elegível">
          Uma despesa comparticipada por outro apoio não conta pelo valor bruto. É a correção mais
          comum em empresas que somam SIFIDE a financiamento comunitário sobre o mesmo projeto.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A prova, e a cumulação com outros benefícios">
        <Paragrafo>
          O reconhecimento da natureza de I&D não é feito pela administração fiscal: é feito pela
          entidade competente para a certificação da atividade de investigação e desenvolvimento, com
          base na descrição técnica que a empresa apresenta.
        </Paragrafo>
        <Paragrafo>
          Quer dizer que a candidatura é, antes de tudo, um <strong>documento técnico</strong>. Quem a
          escreve como se fosse um formulário fiscal tem um problema — e quem a manda escrever a um
          engenheiro sem revisão fiscal tem outro.
        </Paragrafo>
        <AvisoPrazo titulo="Sobre a mesma despesa, não há duas deduções">
          As regras de não cumulação impedem que a mesma despesa elegível sustente dois benefícios em
          simultâneo. Ter SIFIDE e RFAI ao mesmo tempo é possível; aplicá-los ao mesmo euro não é.
        </AvisoPrazo>
        <VaiPara href="/guias/prejuizos-fiscais">
          O que acontece à coleta quando há prejuízos a reportar
        </VaiPara>
      </Seccao>
    </>
  );
}
