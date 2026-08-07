import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { MAIS_VALIAS_REPORTE } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// art. 55.º (n.º 1, als. c) e d), e n.º 8), art. 43.º, art. 22.º e art. 72.º
// do CIRS. O pacote mandava confirmar o número de anos antes de o indicar —
// está confirmado, e são cinco.
export default function CorpoReporteMenosValias() {
  return (
    <>
      <Seccao titulo="Como se apura o saldo do ano">
        <Paragrafo>
          Não se tributa operação a operação: tributa-se o <strong>saldo</strong> entre as
          mais-valias e as menos-valias realizadas no mesmo ano. Vender com ganho em janeiro e com
          perda em novembro compensa-se dentro do próprio ano, sem qualquer formalidade e sem
          depender de opção nenhuma.
        </Paragrafo>
        <Paragrafo>
          É por isso que a primeira decisão de quem tem uma posição a perder não é fiscal — é de
          calendário. Realizar a perda no mesmo ano civil do ganho é a forma mais simples de a
          aproveitar, e a única que não tem condições associadas.
        </Paragrafo>
        <Nota titulo="Realizar é vender">
          Uma perda que existe no ecrã não existe para o fisco. Só há menos-valia quando há
          alienação — e o mesmo vale para o ganho.
        </Nota>
      </Seccao>

      <Seccao titulo="A condição do englobamento">
        <Paragrafo>
          Quando o saldo do ano fecha negativo, ele pode transitar. Mas a lei põe uma condição, e é
          esta a frase que decide tudo: o saldo negativo pode ser reportado{" "}
          <strong>«quando o sujeito passivo opte ou seja obrigado a englobar esses
          rendimentos»</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Sem englobamento no ano da perda, não há reporte">
          Não é uma formalidade a cumprir depois. É uma opção a exercer{" "}
          <strong>na declaração do ano em que a perda ocorreu</strong>. Quem deixa correr a taxa
          especial por defeito nesse ano fica sem nada para abater nos anos seguintes — e a opção
          não se recupera mais tarde, quando o ano bom chegar.
        </AvisoPrazo>
        <Paragrafo>
          Repare-se no que isto significa na prática: no ano da perda, englobar não te custa
          imposto nenhum — não há saldo positivo para tributar. O que a opção faz é{" "}
          <em>guardar</em> a perda. É das raras decisões fiscais em que o custo imediato é zero e o
          custo de não a tomar aparece anos depois.
        </Paragrafo>
        <VaiPara href="/guias/escaloes-irs">
          O que englobar significa, e o que arrasta consigo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quantos anos dura o reporte">
        <Paragrafo>
          O saldo negativo transita para os <strong>{MAIS_VALIAS_REPORTE.anos.value} anos
          seguintes</strong> àquele a que respeita. Vale para as operações com valores mobiliários e
          para as operações com criptoativos, que estão entre as alíneas abrangidas.
        </Paragrafo>
        <Paragrafo>
          As mais-valias <strong>imobiliárias</strong> têm regra própria, no mesmo artigo: o que
          transita é a <em>percentagem</em> do saldo negativo que corresponde à fração tributável
          — a mesma que é considerada quando o saldo é positivo. Os prazos estão na tabela de dados
          aqui em baixo.
        </Paragrafo>
        <Nota titulo="O prazo conta a partir do ano da perda">
          Não a partir do ano em que decides usá-la. Uma perda de há seis anos já não abate nada,
          por muito bem documentada que esteja.
        </Nota>
      </Seccao>

      <Seccao titulo="O que não se reporta">
        <Paragrafo>
          O reporte é <strong>dentro da mesma categoria</strong>. Uma menos-valia de ações não abate
          a rendimentos do trabalho, nem a rendas, nem a rendimentos de capitais. Compensa
          mais-valias, e mais nada.
        </Paragrafo>
        <Paragrafo>
          E não se reporta o que a lei excluiu de tributação. É o caso da cripto detida pelo período
          que dá direito à exclusão: não sendo o ganho tributado, a perda também não conta. A
          exclusão corta nos dois sentidos, e é uma consequência que apanha muita gente de
          surpresa.
        </Paragrafo>
        <VaiPara href="/guias/cripto-365-dias">
          A regra dos 365 dias e o que ela exclui — nos dois sentidos
        </VaiPara>
      </Seccao>

      <Seccao titulo="Ordem de imputação">
        <Paragrafo>
          Quando existem perdas de vários anos por usar, gastam-se pela ordem em que{" "}
          <strong>caducam</strong>: primeiro as mais antigas, que são as que estão mais perto de
          expirar. Deixar a mais antiga para o fim é a forma mais fácil de a perder.
        </Paragrafo>
        <Paragrafo>
          E a perda só se imputa a saldos <em>positivos</em>. Um ano que também feche negativo não
          consome nada — acumula outra perda, com o seu próprio prazo a contar do seu próprio ano.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que declarar em cada ano">
        <Passos
          passos={[
            {
              titulo: "No ano da perda: declarar e optar pelo englobamento",
              texto: "As operações declaram-se todas, com ganho ou com perda. E a opção pelo englobamento tem de ficar assinalada — é ela que preserva o direito ao reporte.",
            },
            {
              titulo: "Nos anos seguintes: manter o rasto",
              texto: "O saldo negativo por utilizar acompanha-te de ano para ano. Guarda as declarações anteriores: é nelas que o valor e o ano de origem estão fixados.",
            },
            {
              titulo: "No ano do ganho: imputar",
              texto: "Declara-se o saldo positivo do ano e abate-se o negativo transitado, começando pelo mais antigo. Confirma que a origem de cada parcela está identificada.",
            },
          ]}
        />
        <Paragrafo>
          Uma nota final de arquivo: cinco anos de reporte significam que precisas de conseguir
          justificar operações com cinco anos. Corretoras encerram e plataformas apagam histórico —
          o teu registo tem de sobreviver a isso, porque o ónus da prova é teu.
        </Paragrafo>
        <VaiPara href="/guias/corretoras-estrangeiras-irs">
          O que exportar da corretora, e quando
        </VaiPara>
        <VaiPara href="/guias/mais-valias">
          As mais-valias de cada classe de ativos
        </VaiPara>
      </Seccao>
    </>
  );
}
