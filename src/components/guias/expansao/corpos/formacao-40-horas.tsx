import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FORMACAO_CONTINUA } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra os arts. 131.º, 132.º e 134.º do
// Código do Trabalho (articulado consolidado, PGD Lisboa).
export default function CorpoFormacao40Horas() {
  return (
    <>
      <Seccao titulo="É um direito individual, e tem número">
        <Paragrafo>
          O trabalhador tem direito, em cada ano, a um número mínimo de{" "}
          <strong>{FORMACAO_CONTINUA.horasAnuais.value} horas</strong> de formação contínua. Não é uma
          recomendação nem uma boa prática: é uma obrigação do empregador, cuja violação constitui
          contraordenação grave.
        </Paragrafo>
        <Paragrafo>
          Em contrato a termo de duração igual ou superior a três meses, o número é{" "}
          <strong>proporcional</strong> à duração do contrato nesse ano.
        </Paragrafo>
        <Nota titulo="E há uma segunda obrigação, de cobertura">
          O empregador deve assegurar, em cada ano, formação contínua a pelo menos{" "}
          {pctExato(FORMACAO_CONTINUA.fracaoMinimaDeTrabalhadores.value)} dos trabalhadores da empresa.
          São coisas diferentes: uma é por pessoa, a outra é sobre o conjunto.
        </Nota>
      </Seccao>

      <Seccao titulo="O que conta como formação">
        <Paragrafo>
          Formação desenvolvida pelo empregador, por entidade formadora certificada ou por
          estabelecimento de ensino reconhecido — e dá lugar a <strong>certificado</strong> e a registo
          na Caderneta Individual de Competências.
        </Paragrafo>
        <Paragrafo>
          A lei manda ainda contar as horas de dispensa para frequência de aulas e as faltas para
          provas de avaliação ao abrigo do <strong>regime de trabalhador-estudante</strong>, e as
          ausências no âmbito de processos de reconhecimento, validação e certificação de competências.
        </Paragrafo>
        <AvisoPrazo titulo="Uma sessão interna sem certificado é difícil de contar">
          Sem certificado e sem registo, a empresa fica sem prova de ter cumprido — e o trabalhador
          sem prova de ter recebido. É nos dois sentidos que o papel importa.
        </AvisoPrazo>
        <VaiPara href="/guias/trabalhador-estudante">
          O estatuto de trabalhador-estudante, e o que dá
        </VaiPara>
      </Seccao>

      <Seccao titulo="A empresa pode antecipar, e pode adiar">
        <Paragrafo>
          O empregador pode <strong>antecipar até {FORMACAO_CONTINUA.antecipacaoOuDiferimentoAnos.value} anos</strong>{" "}
          ou, prevendo-o o plano de formação, <strong>diferir por igual período</strong> a formação
          anual — imputando-se a formação realizada ao cumprimento da obrigação mais antiga.
        </Paragrafo>
        <Paragrafo>
          A antecipação sobe para{" "}
          <strong>{FORMACAO_CONTINUA.antecipacaoDuplaCertificacaoAnos.value} anos</strong> quando se
          trate de processo de reconhecimento, validação e certificação de competências ou de formação
          de dupla certificação.
        </Paragrafo>
        <Nota titulo="É por isso que a conta não fecha ano a ano">
          Uma empresa pode ter cumprido sem dar formação este ano. O que não pode é deixar passar o
          prazo — e é aí que o direito muda de mãos.
        </Nota>
      </Seccao>

      <Seccao titulo="Não dada a tempo, vira crédito de horas — teu">
        <Paragrafo>
          É a parte que quase ninguém conhece. As horas que não sejam asseguradas pelo empregador até
          ao termo dos <strong>{FORMACAO_CONTINUA.prazoAteViragemEmCredito.value} anos</strong>{" "}
          posteriores ao seu vencimento transformam-se em{" "}
          <strong>crédito de horas em igual número</strong>, para formação por{" "}
          <strong>iniciativa do trabalhador</strong>.
        </Paragrafo>
        <Paragrafo>
          E o crédito não é tempo emprestado: {FORMACAO_CONTINUA.creditoContaComoTrabalho.value}.
        </Paragrafo>
        <AvisoPrazo titulo="Usa-se com dez dias de antecedência — e caduca">
          A utilização exige comunicação ao empregador com a antecedência mínima de{" "}
          {FORMACAO_CONTINUA.antecedenciaComunicacaoDias.value} dias. E o crédito que não seja
          utilizado <strong>cessa passados {FORMACAO_CONTINUA.caducidadeDoCreditoAnos.value} anos</strong>{" "}
          sobre a sua constituição. Havendo créditos acumulados, a formação realizada é imputada ao
          mais antigo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="No fim do contrato, paga-se">
        <Paragrafo>
          {FORMACAO_CONTINUA.pagamentoNaCessacao.value}.
        </Paragrafo>
        <Paragrafo>
          Vale seja qual for a forma de cessação, e vale para quem sai por sua iniciativa. É dinheiro
          que se soma às contas finais — e que raramente aparece nelas sem ser pedido.
        </Paragrafo>
        <AvisoPrazo titulo="Confere as contas finais com o histórico de formação na mão">
          Anos sem formação registada, ou com menos horas do que o mínimo, são horas a receber. É a
          verificação mais rentável do último dia de trabalho.
        </AvisoPrazo>
        <VaiPara href="/guias/fim-do-contrato">
          Tudo o que entra nas contas finais
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como reclamar o que não foi dado">
        <Passos
          passos={[
            {
              titulo: "Reunir o histórico, ano a ano",
              texto: "Certificados, registos na Caderneta Individual de Competências, convocatórias internas. O que não tem prova conta como não dado — e é isso que joga a teu favor.",
            },
            {
              titulo: "Pedir por escrito o plano de formação da empresa",
              texto: "O empregador deve estruturar planos anuais ou plurianuais e assegurar o direito a informação e consulta dos trabalhadores e dos seus representantes.",
            },
            {
              titulo: "Contar os anos vencidos",
              texto: `Só vira crédito depois de passarem ${FORMACAO_CONTINUA.prazoAteViragemEmCredito.value} anos sobre o vencimento. Antes disso, a empresa ainda está em prazo.`,
            },
            {
              titulo: "Usar o crédito antes de caducar",
              texto: `Cessa ${FORMACAO_CONTINUA.caducidadeDoCreditoAnos.value} anos depois de se constituir. Acumular sem usar acaba por perder.`,
            },
            {
              titulo: "Comunicar a utilização por escrito, com os dez dias",
              texto: "Email chega, desde que fique registo. O prazo é o que dá à empresa a possibilidade de se organizar — e a ti a prova de que pediste.",
            },
            {
              titulo: "Não estando resolvido, queixa à ACT",
              texto: "A violação do direito individual à formação e da cobertura mínima é contraordenação grave, e é matéria de inspeção do trabalho.",
            },
          ]}
        />
        <VaiPara href="/guias/banco-de-horas">
          O outro regime de tempo que gera crédito
        </VaiPara>
        <VaiPara href="/guias/recibo-vencimento">
          Onde o tempo de formação aparece no recibo
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que a formação deve conter">
        <Paragrafo>
          A lei não deixa o conteúdo inteiramente ao critério do empregador: a formação contínua deve
          abranger, em cada ano, um conjunto de trabalhadores e visar a{" "}
          <strong>qualificação</strong> — melhorar a empregabilidade de quem a recebe, e não apenas
          servir a necessidade imediata do posto.
        </Paragrafo>
        <Paragrafo>
          O empregador deve ainda <strong>reconhecer e valorizar</strong> a qualificação adquirida. É a
          alínea que sustenta a conversa sobre progressão depois de uma formação certificada.
        </Paragrafo>
        <Nota titulo="Pode ser adaptada por convenção coletiva">
          O regime pode ser ajustado por convenção que tenha em conta o setor, a qualificação dos
          trabalhadores e a dimensão da empresa. Vale a pena ver o que a tua diz antes de assumir o
          regime supletivo.
        </Nota>
      </Seccao>
    </>
  );
}
