import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FORMACAO_CONTINUA, TRABALHADOR_ESTUDANTE } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra os arts. 89.º a 96.º do Código do
// Trabalho (articulado consolidado, PGD Lisboa), com destaque para o art.
// 94.º. Os quantitativos de dispensa e de faltas variam com o regime de
// horário e NÃO são publicados sem confirmação artigo a artigo.
export default function CorpoTrabalhadorEstudante() {
  return (
    <>
      <Seccao titulo="Quem tem direito ao estatuto">
        <Paragrafo>
          É trabalhador-estudante quem presta atividade sob autoridade e direção de outrem e{" "}
          <strong>frequenta qualquer nível de ensino</strong> ou curso de pós-graduação, mestrado ou
          doutoramento em instituição de ensino, ou ainda curso de formação profissional ou programa
          de ocupação temporária de jovens com duração mínima legalmente fixada.
        </Paragrafo>
        <Paragrafo>
          Não depende da idade, não depende de o curso ter relação com o trabalho, e não depende de
          autorização do empregador.
        </Paragrafo>
        <Nota titulo="Não é um favor — é um estatuto legal">
          A empresa não «concede» o estatuto. Verifica os pressupostos, e havendo-os, aplica-o.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se ativa, dos dois lados">
        <Paragrafo>
          {TRABALHADOR_ESTUDANTE.provaDaCondicao.value}.
        </Paragrafo>
        <Paragrafo>
          E do outro lado é simétrico: {TRABALHADOR_ESTUDANTE.aproveitamentoEscolar.value.startsWith("transição") ? "para a escola, é preciso fazer prova, por qualquer meio legalmente admissível, da condição de trabalhador" : ""}.
          São dois pedidos, em dois sítios, e falhar um deles deixa o estatuto pela metade.
        </Paragrafo>
        <AvisoPrazo titulo="Entrega o horário das aulas, não só a declaração de matrícula">
          A lei exige as duas coisas. É o horário que permite ao empregador organizar a dispensa — e é
          a sua ausência que, na prática, trava mais pedidos.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que o estatuto dá">
        <Paragrafo>
          Em traços largos: <strong>dispensa de trabalho para frequência de aulas</strong> quando o
          horário o exija; <strong>faltas para prestação de provas de avaliação</strong>, consideradas
          justificadas e retribuídas nos termos da lei; e{" "}
          <strong>preferência na marcação de férias</strong> e proteção quanto a trabalho suplementar.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica os quantitativos</strong> de horas de dispensa e de dias de
          falta. Variam com o regime de horário — completo ou parcial, flexível ou fixo — e com o tipo
          de prova, e reproduzir um número único seria dar por simples o que a lei articula em vários
          números. Confirma-os no articulado ou com o teu sindicato.
        </Paragrafo>
        <Nota titulo="Mas há uma coisa que se soma sozinha">
          As horas de dispensa para aulas e as faltas para provas contam para o cumprimento do direito
          individual à formação contínua — as{" "}
          {FORMACAO_CONTINUA.horasAnuais.value} horas anuais que o empregador deve.
        </Nota>
        <VaiPara href="/guias/formacao-40-horas">
          As horas de formação, e o crédito que geram
        </VaiPara>
      </Seccao>

      <Seccao titulo="A obrigação que mantém o estatuto vivo">
        <Paragrafo>
          O estatuto exige <strong>aproveitamento escolar</strong>, e a lei define-o:{" "}
          {TRABALHADOR_ESTUDANTE.aproveitamentoEscolar.value}.
        </Paragrafo>
        <Paragrafo>
          Não é «passar a tudo». É metade — e, em percursos modulares, metade dos módulos ou unidades
          equivalentes de cada disciplina.
        </Paragrafo>
        <AvisoPrazo titulo="Há causas que salvam o ano">
          Considera-se que tem aproveitamento quem não o consiga por acidente de trabalho ou doença
          profissional, doença prolongada, licença em situação de risco clínico durante a gravidez, ou
          licença parental inicial, por adoção ou complementar de duração não inferior a um mês.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Duas regras que fazem perder direitos sem se dar por isso">
        <Paragrafo>
          A primeira: {TRABALHADOR_ESTUDANTE.horarioCompativel.value}. Escolher um horário de aulas
          que colide com o trabalho havendo alternativa é motivo para não beneficiar do estatuto.
        </Paragrafo>
        <Paragrafo>
          A segunda: {TRABALHADOR_ESTUDANTE.naoCumulavel.value} — nomeadamente quanto a dispensa para
          aulas, licenças por motivos escolares ou faltas para provas. Quem já tem um regime especial
          equivalente não soma os dois.
        </Paragrafo>
        <Nota titulo="Guarda a prova de que escolheste o horário compatível">
          A lista de turmas disponíveis no momento da inscrição, por exemplo. É a única forma de
          demonstrar que a colisão não foi escolha tua.
        </Nota>
      </Seccao>

      <Seccao titulo="Passo a passo, no início de cada ano letivo">
        <Passos
          passos={[
            {
              titulo: "Inscrever-se escolhendo o horário mais compatível",
              texto: "E guardar prova das alternativas que existiam. É a condição de que os direitos dependem.",
            },
            {
              titulo: "Pedir à escola declaração de matrícula e horário",
              texto: "As duas coisas. A declaração sozinha não cumpre o que a lei exige.",
            },
            {
              titulo: "Entregar ao empregador por escrito, com registo",
              texto: "Email ou protocolo. É a data de entrega que marca o início dos direitos.",
            },
            {
              titulo: "Fazer prova da condição de trabalhador na escola",
              texto: "Por qualquer meio legalmente admissível — contrato, recibo de vencimento, declaração da entidade patronal.",
            },
            {
              titulo: "Comunicar as provas de avaliação com antecedência",
              texto: "As faltas para provas têm regras de comunicação. Avisar na véspera transforma um direito num conflito.",
            },
            {
              titulo: "No fim do ano, entregar o comprovativo de aproveitamento",
              texto: "É o que renova o estatuto. Sem ele, o ano seguinte começa sem direitos.",
            },
          ]}
        />
        <VaiPara href="/guias/banco-de-horas">
          Como o tempo de trabalho pode ser adaptado
        </VaiPara>
        <VaiPara href="/guias/dependentes-irs">
          Um filho estudante que trabalha: o efeito no IRS da família
        </VaiPara>
      </Seccao>
    </>
  );
}
