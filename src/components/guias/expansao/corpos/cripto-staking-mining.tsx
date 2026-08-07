import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CRIPTO_ISENCAO_DIAS } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// art. 5.º (n.º 2, al. u) e n.º 11), art. 3.º, art. 10.º (n.º 1, al. k) e
// n.º 19), art. 31.º e art. 112.º do CIRS.
//
// O pacote assinala este guia como PONTO SENSÍVEL, por as fontes divergirem
// entre categoria B e categoria E no staking. A divergência tem explicação e
// a lei resolve-a: quem lê só a al. u) do n.º 2 fica sem o n.º 11 do mesmo
// artigo, que trata o caso de a recompensa ser paga na própria cripto.
export default function CorpoCriptoStakingMining() {
  return (
    <>
      <Seccao titulo="As três categorias possíveis e porque isso importa">
        <Paragrafo>
          Cripto não tem uma categoria própria no IRS. Tem <strong>três portas</strong>, e a que se
          abre depende do que fizeste — não do ativo:
        </Paragrafo>
        <Paragrafo>
          · <strong>Categoria G</strong>, mais-valias: quando <em>alienas</em> criptoativos que não
          sejam valores mobiliários.
          <br />· <strong>Categoria E</strong>, rendimentos de capitais: quaisquer formas de
          remuneração decorrentes de operações relativas a criptoativos.
          <br />· <strong>Categoria B</strong>, rendimentos empresariais e profissionais: quando a
          atividade é exercida de forma habitual e organizada.
        </Paragrafo>
        <Paragrafo>
          A categoria não é uma etiqueta: decide a taxa, o anexo, o momento em que se paga e se há
          ou não contribuições para a Segurança Social. É a primeira pergunta a responder, e a que
          quase todas as discussões saltam.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Remuneração passiva vs. atividade habitual">
        <Paragrafo>
          Do lado da <strong>remuneração passiva</strong> — staking, lending e afins — a lei é mais
          clara do que a discussão pública sugere, desde que se leiam os dois números do art. 5.º e
          não apenas um.
        </Paragrafo>
        <Paragrafo>
          A alínea u) do n.º 2 diz que quaisquer formas de remuneração decorrentes de operações
          relativas a criptoativos são <strong>rendimentos de capitais</strong>. E o n.º 11 do mesmo
          artigo acrescenta a parte decisiva: esses rendimentos,{" "}
          <strong>quando assumam a forma de criptoativos</strong>, são tributados{" "}
          <strong>como mais-valia no momento da alienação</strong> dos criptoativos recebidos.
        </Paragrafo>
        <Nota titulo="A divergência entre fontes explica-se assim">
          Quem cita só a alínea u) conclui «categoria E, tributado ao receber». Quem lê o n.º 11
          percebe que, sendo a recompensa paga na própria cripto — que é o caso quase sempre —, não
          há facto tributário na receção. A diferença não é de classificação: é de{" "}
          <strong>momento</strong>. As duas leituras estão no mesmo artigo, e a segunda é a que
          governa o caso comum.
        </Nota>
        <AvisoPrazo titulo="Declarar ao receber é antecipar imposto que a lei manda cobrar depois">
          Quem declara staking pago em cripto no ano da receção paga mais cedo do que devia e, pior,
          arrisca declarar duas vezes o mesmo ganho: uma na receção e outra na venda. O que os dados
          desta página resumem é a regra do artigo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Mining: quando passa a ser atividade">
        <Paragrafo>
          Mining é a fronteira mais difícil, e é honesto dizê-lo. Não há um número na lei que
          separe o mineiro ocasional do profissional — há os <strong>indícios gerais da categoria
          B</strong>: habitualidade, organização de meios, investimento em equipamento afeto à
          atividade, escala e intenção de lucro continuada.
        </Paragrafo>
        <Paragrafo>
          Quando a conclusão é categoria B, deixa de ser uma questão declarativa e passa a ser
          operacional: abertura de atividade, obrigação de emitir documento pelas importâncias
          recebidas, regime simplificado com o coeficiente que couber à atividade, e contribuições
          para a Segurança Social.
        </Paragrafo>
        <Nota titulo="Uma rig em casa não é automaticamente uma empresa — nem automaticamente não é">
          A qualificação depende do conjunto dos indícios, não de um deles. É matéria em que a
          resposta certa exige olhar para o caso concreto, e em que vale a pena a confirmação de um
          contabilista certificado antes de escolher um caminho.
        </Nota>
        <VaiPara href="/guias/abrir-atividade">
          O que implica abrir atividade, se for esse o enquadramento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Airdrops e o momento do facto tributário">
        <Paragrafo>
          Um airdrop é uma atribuição de criptoativos sem contrapartida direta. Sendo uma forma de
          remuneração decorrente de operações relativas a criptoativos, cabe na mesma alínea u) — e
          por isso segue a mesma regra de momento: recebido <strong>em cripto</strong>, não há
          tributação na receção; há quando os criptoativos recebidos forem alienados.
        </Paragrafo>
        <Paragrafo>
          O que fica por resolver na prática é o <strong>custo de aquisição</strong> do que foi
          recebido sem pagar nada. É o ponto em que registar bem à cabeça poupa uma discussão anos
          depois — e a contagem dos {CRIPTO_ISENCAO_DIAS.value} dias também começa aqui, no momento
          em que os ativos passam a ser teus.
        </Paragrafo>
        <VaiPara href="/guias/cripto-365-dias">
          A regra dos 365 dias, que se aplica ao que recebeste
        </VaiPara>
      </Seccao>

      <Seccao titulo="O impacto em Segurança Social">
        <Paragrafo>
          É a consequência que muda mais dinheiro e que menos aparece nas conversas sobre cripto.
          Rendimentos das categorias E e G <strong>não geram contribuições</strong>. Rendimentos da
          categoria B geram — com declaração trimestral e contribuição sobre o rendimento
          relevante.
        </Paragrafo>
        <Paragrafo>
          Ou seja: a fronteira entre «remuneração passiva» e «atividade habitual» não é só uma
          questão de taxa de IRS. Atravessá-la traz consigo um regime contributivo inteiro, com
          obrigações trimestrais próprias.
        </Paragrafo>
        <VaiPara href="/guias/seguranca-social">
          Como se calcula a contribuição de um trabalhador independente
        </VaiPara>
      </Seccao>

      <Seccao titulo="Registo e prova: o que guardar">
        <Paragrafo>
          O ónus da prova é teu, e a matéria é volátil: guarda, por evento, a{" "}
          <strong>data e hora</strong>, o <strong>ativo</strong> e a <strong>quantidade</strong>{" "}
          recebida, o <strong>contravalor em euros</strong> à data, a <strong>natureza</strong> do
          evento (staking, mining, airdrop, venda) e a <strong>plataforma ou carteira</strong>.
        </Paragrafo>
        <Paragrafo>
          Guarda também o que sustenta o enquadramento que escolheste, se for categoria B: faturas
          de equipamento, custos de energia afetos, contratos. E guarda fora da plataforma —
          exchanges encerram, mudam de política de exportação e apagam histórico.
        </Paragrafo>
        <AvisoPrazo titulo="Este guia precisa de revisão periódica, e diz-se porquê">
          A doutrina sobre staking e mining está em consolidação, e o enquadramento concreto pode
          depender de informação vinculativa da Autoridade Tributária sobre o teu caso. O que está
          acima é o que os artigos dizem; o que decide o teu caso pode exigir confirmação
          especializada.
        </AvisoPrazo>
        <VaiPara href="/guias/regime-simplificado">
          Os coeficientes da categoria B, se for esse o enquadramento
        </VaiPara>
      </Seccao>
    </>
  );
}
