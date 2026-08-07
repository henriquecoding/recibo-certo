import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { RESIDENCIA_FISCAL } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 15.º, art. 16.º (n.os 1 a 3) e art. 57.º do CIRS, art. 19.º da LGT e
// art. 12.º-A do CIRS quanto à elegibilidade dos ex-residentes.
//
// O pacote avisa que o prazo de inscrição no IFICI é curto e se perde, e
// manda confirmar a data-limite em vigor antes de publicar. Não foi possível
// confirmá-la nesta verificação — pelo que o guia diz que o prazo existe e
// que fecha, sem afirmar uma data que não leu. Um prazo inventado é o pior
// dos dois erros possíveis aqui.
export default function CorpoPrimeiroAnoFiscalPortugal() {
  return (
    <>
      <Seccao titulo="Passo 1: NIF e representação, se aplicável">
        <Paragrafo>
          O número de identificação fiscal é a primeira coisa, e é anterior a tudo o resto: sem ele
          não se arrenda casa, não se abre conta, não se assina contrato de trabalho.
        </Paragrafo>
        <Paragrafo>
          Quem o pede <em>antes</em> de se tornar residente pede-o como não residente — e aí pode
          precisar de representante fiscal, conforme o país de origem. Quem já está cá e vai
          registar-se como residente não precisa disso: passa direto ao passo seguinte.
        </Paragrafo>
        <Nota titulo="Um NIF de não residente não é um NIF diferente">
          É o mesmo número. O que muda é o estatuto associado a ele no cadastro, e esse muda-se com
          uma comunicação — não é preciso pedir outro NIF quando passas a residente.
        </Nota>
        <VaiPara href="/guias/representante-fiscal">
          Quando o representante é preciso, e a alternativa que o dispensa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Passo 2: registo e domicílio fiscal">
        <Paragrafo>
          É o passo decisivo e o que mais gente adia. Comunicar o domicílio fiscal em Portugal é o
          que faz o cadastro da AT passar a tratar-te como residente — e a lei diz que{" "}
          <strong>é ineficaz a mudança de domicílio enquanto não for comunicada</strong>.
        </Paragrafo>
        <Paragrafo>
          Sempre que se altera o estatuto de residência, a comunicação faz-se no prazo de{" "}
          <strong>{RESIDENCIA_FISCAL.prazoComunicarDias.value} dias</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="A ordem certa evita meses de correções">
          Registo de residência primeiro, domicílio fiscal a seguir, e só depois as decisões sobre
          regimes. Fazer ao contrário — pedir um regime antes de o cadastro dizer que resides cá — é
          a origem da maior parte dos indeferimentos do primeiro ano.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Passo 3: quando começas a ser residente">
        <Paragrafo>
          Não é no dia em que comunicas: é no dia em que a lei diz. Preenchidos os critérios do art.
          16.º, tornas-te residente desde o{" "}
          <strong>{RESIDENCIA_FISCAL.inicioResidencia.value}</strong> em território português.
        </Paragrafo>
        <Paragrafo>
          Daí resulta a residência parcial: o ano da chegada parte-se em dois, e em cada metade
          aplica-se a regra do estatuto respetivo. Antes, só o rendimento obtido em Portugal; depois,
          a totalidade dos rendimentos, incluindo os obtidos fora.
        </Paragrafo>
        <Nota titulo="A exceção de quem já cá foi residente">
          Se tiveres sido residente em <em>qualquer dia do ano anterior</em>, és residente desde 1 de
          janeiro do ano em que se verifique qualquer dos critérios — e não desde o dia da chegada. É
          a regra que apanha quem vai e volta em anos consecutivos.
        </Nota>
        <VaiPara href="/guias/residencia-fiscal">
          Os quatro critérios, e como se contam os 183 dias
        </VaiPara>
      </Seccao>

      <Seccao titulo="Passo 4: regimes a que podes aceder e respetivos prazos">
        <Paragrafo>
          Há regimes com prazo de adesão, e é aqui que o primeiro ano se joga. O que se perde por
          ter passado a data não se recupera na declaração — não é uma opção que se exerce mais
          tarde, é uma porta que fecha.
        </Paragrafo>
        <Paragrafo>
          O <strong>regime dos ex-residentes</strong> — o Programa Regressar — exige que já tenhas
          sido residente em Portugal num período anterior. Quem chega pela primeira vez{" "}
          <strong>não é elegível</strong>, por muito tempo que tenha vivido fora.
        </Paragrafo>
        <Paragrafo>
          O <strong>incentivo fiscal à investigação científica e inovação</strong> — o regime do art.
          58.º-A do Estatuto dos Benefícios Fiscais, sucessor do residente não habitual — tem
          requisitos quanto à atividade exercida e um <strong>prazo de inscrição que fecha</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma a data-limite antes de contares com o regime">
          A data de inscrição no regime do art. 58.º-A é fixada por regulamentação e não foi possível
          verificá-la nesta revisão — pelo que este guia não a afirma. Confirma-a no Portal das
          Finanças ou com um contabilista certificado logo nas primeiras semanas: é um prazo curto
          contado sobre o ano em que te tornas residente, e perdê-lo custa o benefício inteiro.
        </AvisoPrazo>
        <VaiPara href="/guias/programa-regressar">
          O regime dos ex-residentes: condições, teto e janela
        </VaiPara>
      </Seccao>

      <Seccao titulo="A primeira Modelo 3: o que muda">
        <Paragrafo>
          A declaração do primeiro ano entrega-se no ano seguinte e tem duas particularidades que as
          seguintes já não têm.
        </Paragrafo>
        <Paragrafo>
          A primeira é a <strong>residência parcial</strong>: havendo dois estatutos no mesmo ano,
          declara-se cada período com a regra que lhe corresponde. A segunda é o{" "}
          <strong>pré-preenchimento vazio</strong> — a AT só conhece o que entidades portuguesas lhe
          comunicaram, e no ano da chegada isso é quase nada.
        </Paragrafo>
        <Paragrafo>
          A partir do momento em que passas a residente, entram em cena as obrigações que não tinhas:
          declarar os rendimentos obtidos fora, com o crédito de imposto correspondente, e
          identificar as contas abertas em instituições financeiras não residentes.
        </Paragrafo>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, e a identificação de contas
        </VaiPara>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          Como não pagar duas vezes sobre o mesmo rendimento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Erros que criam divergências logo no primeiro ano">
        <Passos
          passos={[
            {
              titulo: "Manter o domicílio fiscal no país de origem",
              texto: `A mudança é ineficaz enquanto não for comunicada, e o prazo é de ${RESIDENCIA_FISCAL.prazoComunicarDias.value} dias. Sem ela, nada do resto encaixa.`,
            },
            {
              titulo: "Declarar o ano inteiro como residente quando houve residência parcial",
              texto: "Traz para a tributação portuguesa rendimentos de um período em que ainda não eras residente. Paga-se imposto que não era devido.",
            },
            {
              titulo: "Contar com o pré-preenchido",
              texto: "No primeiro ano vem quase vazio. O que não estiver lá tens de o pôr — e a ausência não é uma dispensa.",
            },
            {
              titulo: "Não identificar a conta do país de origem",
              texto: "A obrigação de identificar contas em instituições financeiras não residentes existe mesmo sem rendimentos, e a conta antiga é a que mais se esquece.",
            },
            {
              titulo: "Deixar passar o prazo de adesão a um regime",
              texto: "É a única coisa desta lista que não se corrige depois. Trata-a nas primeiras semanas.",
            },
            {
              titulo: "Confundir autorização de residência com residência fiscal",
              texto: "São coisas independentes. Dá para ser residente fiscal sem autorização de residência, e o contrário também.",
            },
          ]}
        />
        <Nota titulo="Guarda a prova da data de chegada">
          Bilhetes, contrato de arrendamento, contrato de trabalho, registo na junta de freguesia. É
          o que sustenta o início da residência se um dia a data for discutida — e é muito mais fácil
          guardar agora do que reconstruir daqui a três anos.
        </Nota>
      </Seccao>
    </>
  );
}
