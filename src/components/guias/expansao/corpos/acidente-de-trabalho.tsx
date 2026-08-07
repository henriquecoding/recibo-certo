import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { TELETRABALHO } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 quanto às normas do Código do Trabalho
// sobre segurança e saúde e sobre teletrabalho (art. 166.º, n.º 4, al. b),
// que fixa o local de trabalho). Os montantes das prestações e os prazos
// de participação constam da Lei n.º 98/2009, que NÃO foi possível ler em
// fonte oficial consolidada nesta revisão — e não são publicados.
export default function CorpoAcidenteDeTrabalho() {
  return (
    <>
      <Seccao titulo="O que é, e o que muita gente não sabe que é">
        <Paragrafo>
          Acidente de trabalho é o que ocorre <strong>no local e no tempo de trabalho</strong> e produz
          lesão corporal, perturbação funcional ou doença de que resulte redução da capacidade de
          trabalho ou de ganho, ou a morte.
        </Paragrafo>
        <Paragrafo>
          Mas o conceito é mais largo do que a intuição sugere: abrange o{" "}
          <strong>trajeto</strong> de ida e volta entre a residência e o local de trabalho — o chamado
          acidente <em>in itinere</em> — e as deslocações em serviço.
        </Paragrafo>
        <Nota titulo="Em teletrabalho, a tua casa é o local de trabalho">
          {TELETRABALHO.localDeTrabalho.value}. Um acidente durante o horário acordado, no espaço onde
          se trabalha, é acidente de trabalho — e essa é uma das razões pelas quais o acordo escrito e
          o horário fixado importam tanto.
        </Nota>
        <VaiPara href="/guias/teletrabalho">
          O acordo de teletrabalho, e o que tem de conter
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quem responde: o seguro é obrigatório">
        <Paragrafo>
          A reparação dos danos emergentes de acidente de trabalho é da responsabilidade do{" "}
          <strong>empregador</strong>, que é obrigado a <strong>transferi-la para uma seguradora</strong>{" "}
          mediante contrato de seguro.
        </Paragrafo>
        <Paragrafo>
          Não é opcional, e a sua falta não te deixa desprotegido: existe um fundo público que assegura
          o pagamento das prestações quando não há seguro válido ou o responsável não as paga — sem
          prejuízo do direito de regresso contra quem devia ter segurado.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma que o seguro cobre a tua retribuição real">
          Um seguro subscrito por um valor inferior à retribuição efetiva cobre proporcionalmente
          menos. É o problema que só aparece no dia do acidente, e é do trabalhador que ele sai.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que a lei repara">
        <Paragrafo>
          Em traços largos: <strong>prestações em espécie</strong> — assistência médica e cirúrgica,
          medicamentos, reabilitação, próteses, transportes — e <strong>prestações em dinheiro</strong>,
          por incapacidade temporária ou permanente, e por morte.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica percentagens nem montantes</strong>. As prestações da Lei n.º
          98/2009 variam com o tipo e o grau de incapacidade, e não foi possível confirmar o articulado
          consolidado em fonte oficial legível nesta revisão. Um número errado aqui leva alguém a
          aceitar um acordo por menos do que lhe cabe — que é o pior resultado possível desta página.
        </Paragrafo>
        <Nota titulo="A escolha do médico e do hospital não é livre">
          A assistência é prestada por indicação da seguradora. Recorrer a assistência particular sem
          o comunicar pode comprometer o reembolso.
        </Nota>
      </Seccao>

      <Seccao titulo="A participação, e o erro que a inviabiliza">
        <Paragrafo>
          O acidente deve ser participado ao <strong>empregador</strong> logo que possível, e o
          empregador participa-o à <strong>seguradora</strong>. É desta cadeia que depende tudo o
          resto.
        </Paragrafo>
        <Paragrafo>
          O erro que mais casos destrói é anterior a qualquer prazo: <strong>ir ao hospital sem dizer
          que foi acidente de trabalho</strong>. Um episódio registado como doença comum passa a
          exigir prova posterior de uma coisa que ficou documentada de outra maneira.
        </Paragrafo>
        <AvisoPrazo titulo="Diz «acidente de trabalho» na admissão, e confirma que ficou escrito">
          É a frase que separa um processo simples de um processo litigioso. Pede cópia do registo
          clínico ainda no serviço de urgência.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Doença profissional é outra coisa">
        <Paragrafo>
          A doença profissional não resulta de um evento súbito: resulta da <strong>exposição
          continuada</strong> a um risco no exercício da atividade. Tem lista própria e um regime de
          reparação distinto do dos acidentes.
        </Paragrafo>
        <Paragrafo>
          Confundir as duas é comum e tem consequências práticas — mudam a entidade a quem se
          participa, os prazos e a prova exigida.
        </Paragrafo>
        <Nota titulo="Uma lesão por esforço repetitivo raramente é acidente">
          É o exemplo mais frequente. Tratá-la como acidente costuma levar a uma recusa, quando o
          caminho certo era o da doença profissional.
        </Nota>
      </Seccao>

      <Seccao titulo="O que fazer, pela ordem que preserva o direito">
        <Passos
          passos={[
            {
              titulo: "Comunicar ao empregador imediatamente, por escrito",
              texto: "Mesmo que a lesão pareça pequena. Muitas incapacidades permanentes começam por uma queixa que se desvalorizou.",
            },
            {
              titulo: "Dizer que é acidente de trabalho no serviço de saúde",
              texto: "E confirmar que ficou registado como tal. Pedir cópia do registo no próprio dia.",
            },
            {
              titulo: "Guardar prova das circunstâncias",
              texto: "Fotografias do local, nomes de testemunhas, registo de entrada e saída, mensagens da altura. O que não se recolhe nas primeiras horas perde-se.",
            },
            {
              titulo: "Confirmar que o empregador participou à seguradora",
              texto: "E pedir o número do processo. A participação é obrigação dele — verificar que aconteceu é do teu interesse.",
            },
            {
              titulo: "Não assinar acordos de incapacidade sem apoio",
              texto: "O grau de incapacidade fixa o que se recebe para o resto da vida. É a fase em que vale mesmo a pena ter advogado ou o sindicato.",
            },
            {
              titulo: "Havendo desacordo, o processo segue para tribunal do trabalho",
              texto: "Começa por uma fase conciliatória junto do Ministério Público. Não é preciso pagar para lá chegar.",
            },
          ]}
        />
        <VaiPara href="/guias/baixa-medica">
          A incapacidade temporária, e o que se recebe entretanto
        </VaiPara>
        <VaiPara href="/guias/deficiencia-irs">
          Ficando incapacidade permanente: o efeito no IRS
        </VaiPara>
      </Seccao>

      <Seccao titulo="Descaracterização: quando a lei retira a proteção">
        <Paragrafo>
          Há situações em que o acidente ocorre no trabalho mas deixa de dar direito a reparação — a
          chamada <strong>descaracterização</strong>. É o argumento que as seguradoras invocam com mais
          frequência, e vale a pena saber que existe.
        </Paragrafo>
        <Paragrafo>
          Abrange, em traços largos, o acidente provocado por violação sem causa justificativa de
          regras de segurança, o que resulta de privação permanente ou acidental do uso da razão, e o
          que provenha de ato ou omissão do sinistrado com violação grosseira dos seus deveres.
        </Paragrafo>
        <AvisoPrazo titulo="É a seguradora que tem de a provar">
          A descaracterização é a exceção, não a regra. Invocá-la não basta: tem de ser demonstrada — e
          é aí que a prova recolhida no dia do acidente decide.
        </AvisoPrazo>
        <Nota titulo="Não confundir com culpa">
          Distração, cansaço ou erro comum não descaracterizam. O regime é de responsabilidade
          objetiva, e existe precisamente para cobrir o erro humano no trabalho.
        </Nota>
      </Seccao>
    </>
  );
}
