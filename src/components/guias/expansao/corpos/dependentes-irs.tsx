import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_DEPENDENTE, DEDUCAO_DEPENDENTE_BEBE, DEPENDENTES_IRS, GUARDA_PARTILHADA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 13.º (n.os 4 a 10) e art. 78.º-A do CIRS.
//
// O pacote avisa que «o limite de rendimentos do dependente é indexado e
// atualizado — ler o art. 13.º CIRS em vigor». Lido: a lei não fixa
// montante próprio, remete para a retribuição mínima mensal garantida. O
// motor deriva-o do salário mínimo, e acompanha-o sozinho.
export default function CorpoDependentesIrs() {
  return (
    <>
      <Seccao titulo="Quem é dependente para o IRS">
        <Paragrafo>
          A lei enumera quatro grupos, e a diferença entre eles é o que decide quase todos os casos de
          fronteira.
        </Paragrafo>
        <Paragrafo>
          · <strong>Menores</strong> — filhos, adotados e enteados não emancipados, e menores sob
          tutela. Sem condições adicionais.
          <br />· <strong>Maiores até aos {DEPENDENTES_IRS.idadeMaxima.value} anos</strong>, com
          limite de rendimentos.
          <br />· <strong>Maiores inaptos</strong> para o trabalho e para angariar meios de
          subsistência — <em>sem</em> limite de idade.
          <br />· <strong>Afilhados civis</strong>, nas mesmas condições dos maiores.
        </Paragrafo>
        <AvisoPrazo titulo="Todos têm de estar identificados pelo número fiscal">
          A lei condiciona a qualidade de dependente a estarem «devidamente identificados pelo número
          fiscal de contribuinte na declaração de rendimentos». Um filho sem NIF na declaração não é
          dependente para efeitos fiscais.
        </AvisoPrazo>
        <Nota titulo="A situação que conta é a de 31 de dezembro">
          {DEPENDENTES_IRS.situacaoRelevanteEm.value}. Um filho que faz 26 anos em janeiro foi
          dependente no ano anterior inteiro; um que os fez em dezembro, não.
        </Nota>
      </Seccao>

      <Seccao titulo="O limite de rendimentos do dependente">
        <Paragrafo>
          É o ponto mais mal compreendido desta matéria, e a lei resolve-o de uma forma que não fixa
          número: o dependente maior não pode auferir{" "}
          <strong>anualmente rendimentos superiores ao valor da retribuição mínima mensal
          garantida</strong>.
        </Paragrafo>
        <Paragrafo>
          O limiar é, por isso, <strong>{fmt(DEPENDENTES_IRS.limiteRendimentoAnual.value)}</strong> —
          e sobe sozinho todos os anos, com o salário mínimo. É bastante mais baixo do que a maior
          parte das pessoas supõe.
        </Paragrafo>
        <AvisoPrazo titulo="Um trabalho de verão pode tirar um filho do agregado">
          Dois meses bem pagos chegam para ultrapassar o limiar. E a consequência não é só perder a
          dedução por dependente: são todas as despesas dele que deixam de contar no teu IRS.
        </AvisoPrazo>
        <Nota titulo="Conta o rendimento dele, não o que ele te dá">
          O critério é o rendimento auferido pelo dependente, seja de trabalho, de bolsa tributável,
          de pensão de alimentos ou de qualquer outra fonte tributável.
        </Nota>
      </Seccao>

      <Seccao titulo="Estudantes e o requisito de formação">
        <Paragrafo>
          Vale a pena ser direto sobre o que a lei <em>não</em> exige: a redação em vigor do art. 13.º
          fixa, para os maiores, o limite de idade e o limite de rendimentos — e não faz depender a
          qualidade de dependente de estar matriculado num estabelecimento de ensino.
        </Paragrafo>
        <Paragrafo>
          Um filho de 23 anos que não estude e não tenha rendimentos acima do limiar continua, pela
          letra da norma, a preencher os requisitos.
        </Paragrafo>
        <Nota titulo="Onde a frequência de ensino importa mesmo">
          Nas <strong>despesas de educação</strong>, que têm dedução própria e requisitos próprios; e
          em benefícios e apoios fora do IRS, que têm as suas regras. Não confundir uma coisa com a
          outra é o que este parágrafo existe para dizer.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As despesas de educação, e os seus limites
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dependentes com deficiência">
        <Paragrafo>
          Os filhos, adotados, enteados e sujeitos a tutela <strong>maiores, inaptos para o trabalho e
          para angariar meios de subsistência</strong> são dependentes{" "}
          <strong>sem limite de idade</strong>. É uma alínea autónoma, e não tem o teto dos{" "}
          {DEPENDENTES_IRS.idadeMaxima.value} anos.
        </Paragrafo>
        <Paragrafo>
          A esta qualidade acrescem, verificando-se grau de incapacidade legalmente exigido e o
          atestado que o comprova, os benefícios próprios do regime das pessoas com deficiência.
        </Paragrafo>
        <AvisoPrazo titulo="O atestado multiuso é o documento que abre tudo">
          Sem ele, os benefícios próprios não se aplicam — por muito evidente que a situação seja. E
          tem validade: um atestado caducado suspende os benefícios até ser renovado.
        </AvisoPrazo>
        <VaiPara href="/guias/deficiencia-irs">
          Os benefícios no IRS, e o que o atestado desbloqueia
        </VaiPara>
      </Seccao>

      <Seccao titulo="O efeito nas deduções à coleta">
        <Paragrafo>
          Cada dependente traz uma dedução fixa: <strong>{fmt(DEDUCAO_DEPENDENTE.value)}</strong> por
          dependente com mais de três anos, e{" "}
          <strong>{fmt(DEDUCAO_DEPENDENTE_BEBE.value)}</strong> por dependente até aos três anos —
          com majorações a partir do segundo dependente em idades definidas na lei.
        </Paragrafo>
        <Paragrafo>
          Mas a dedução fixa é a parte pequena. O que pesa mais é que as{" "}
          <strong>despesas dele</strong> — saúde, educação, gerais familiares — passam a contar nas
          tuas deduções.
        </Paragrafo>
        <AvisoPrazo titulo="Constando das duas declarações, tudo é reduzido a metade">
          {pctExato(GUARDA_PARTILHADA.fracaoPorSujeitoPassivo.value)} por sujeito passivo, salvo
          repartição diferente acordada quantitativamente e comunicada por ambos até ao fim de
          fevereiro.
        </AvisoPrazo>
        <VaiPara href="/guias/guarda-partilhada-irs">
          A repartição em guarda conjunta, e o prazo que a fixa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando compensa sair do agregado">
        <Paragrafo>
          Um dependente pode ser tributado autonomamente — apresentar declaração própria — e há
          situações em que isso é melhor para a família no seu conjunto.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Quando ele tem rendimentos e tu já estás no limite global das deduções",
              texto: "Se as tuas deduções já batem no teto, acrescentar as despesas dele não muda o teu imposto — e o rendimento dele sobe o teu escalão.",
            },
            {
              titulo: "Quando o rendimento dele o coloca abaixo do mínimo de existência",
              texto: "Declarando separadamente, pode não ter imposto a pagar. Somado ao teu, é tributado à tua taxa marginal.",
            },
            {
              titulo: "Quando ele tem retenções a recuperar",
              texto: "Um estudante com um trabalho de verão e retenções feitas pode ter reembolso na declaração própria dele.",
            },
            {
              titulo: "Mas lembra-te de que ele não pode estar nos dois sítios",
              texto: "A lei é expressa: integrando um agregado familiar, não pode ser considerado sujeito passivo autónomo. É uma escolha, não uma acumulação.",
            },
            {
              titulo: "Faz as duas contas antes de decidir",
              texto: "Não há regra geral — depende dos rendimentos de cada lado e das despesas em causa. É o género de decisão que o simulador resolve em minutos.",
            },
          ]}
        />
        <VaiPara href="/dashboard/simulador">
          Simular as duas hipóteses, com e sem o dependente no agregado
        </VaiPara>
        <VaiPara href="/guias/tributacao-conjunta">
          A outra decisão do mesmo ecrã: conjunta ou separada
        </VaiPara>
      </Seccao>
    </>
  );
}
