import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { CONTRATO_A_TERMO, PERIODO_EXPERIMENTAL } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra os arts. 140.º, 141.º, 147.º e
// 148.º do Código do Trabalho (articulado consolidado, PGD Lisboa; lista
// de alterações confirmada contra a DGERT).
export default function CorpoContratoATermo() {
  return (
    <>
      <Seccao titulo="É a exceção, e a lei diz isso por palavras">
        <Paragrafo>
          O contrato a termo {CONTRATO_A_TERMO.soNecessidadesTemporarias.value}.
        </Paragrafo>
        <Paragrafo>
          Repara nas duas condições: a necessidade tem de ser <strong>temporária</strong>, e o contrato
          só pode durar o <strong>período estritamente necessário</strong> a satisfazê-la. Um posto de
          trabalho permanente não admite contrato a termo, por muito que a empresa prefira.
        </Paragrafo>
        <AvisoPrazo titulo="E a prova é do empregador, não tua">
          {CONTRATO_A_TERMO.onusDaProva.value}. Num tribunal, não tens de provar que a necessidade era
          permanente — é a empresa que tem de provar que era temporária.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Os motivos que a lei admite">
        <Paragrafo>
          A lei enumera-os. Substituição de trabalhador ausente, impedido, em licença sem retribuição
          ou com ação de despedimento pendente; passagem de um trabalhador a tempo parcial; atividade
          sazonal; acréscimo excecional de atividade; tarefa ocasional ou serviço determinado, definido
          e não duradouro; execução de obra, projeto ou atividade definida e temporária.
        </Paragrafo>
        <Paragrafo>
          E, fora dessa lista, duas situações próprias do termo <strong>certo</strong>: lançamento de
          nova atividade de duração incerta ou início de funcionamento de empresa ou estabelecimento
          de empresa com menos de{" "}
          <strong>{CONTRATO_A_TERMO.novaEmpresaTrabalhadores.value} trabalhadores</strong>, nos dois
          anos posteriores; e contratação de quem esteja em desemprego de muito longa duração.
        </Paragrafo>
        <Nota titulo="O motivo tem de ser CONCRETO, e escrito">
          «Acréscimo de atividade» não é motivo. «Acréscimo excecional de encomendas do cliente X para
          a campanha Y, entre março e setembro» é. A menção do motivo tem de estabelecer a relação
          entre a justificação e o termo estipulado.
        </Nota>
      </Seccao>

      <Seccao titulo="Quanto tempo pode durar">
        <Paragrafo>
          · <strong>Termo certo</strong>: não pode ser superior a{" "}
          <strong>{CONTRATO_A_TERMO.duracaoMaximaTermoCerto.value} anos</strong>.
          <br />· <strong>Termo incerto</strong>: não pode ser superior a{" "}
          <strong>{CONTRATO_A_TERMO.duracaoMaximaTermoIncerto.value} anos</strong>.
        </Paragrafo>
        <Paragrafo>
          Abaixo, também há limite: o contrato a termo certo só pode ser celebrado por prazo inferior a{" "}
          <strong>{CONTRATO_A_TERMO.duracaoMinimaMeses.value} meses</strong> nas situações da lista de
          necessidades temporárias — e, violando-se essa regra, considera-se celebrado{" "}
          <strong>por {CONTRATO_A_TERMO.duracaoMinimaMeses.value} meses</strong>, desde que
          corresponda a necessidade temporária.
        </Paragrafo>
        <AvisoPrazo titulo="O tempo em trabalho temporário conta para o limite">
          A lei inclui no cômputo a duração de contratos a termo ou de trabalho temporário no mesmo
          posto, e de prestação de serviços para o mesmo objeto, com o mesmo empregador ou com
          sociedades em relação de domínio ou de grupo. Mudar o nome da empresa do grupo não reinicia
          a contagem.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Sem motivo válido, o contrato é sem termo">
        <Paragrafo>
          É a consequência que dá sentido a tudo o resto. Faltando o motivo justificativo, sendo ele
          genérico, ou não estabelecendo relação com o termo estipulado, o <strong>termo é
          nulo</strong> — e o contrato considera-se <strong>sem termo</strong>.
        </Paragrafo>
        <Paragrafo>
          Não é uma nulidade parcial simpática: significa que o contrato nunca teve termo, que não
          caduca no fim do prazo, e que fazê-lo cessar nessa data é um <strong>despedimento
          ilícito</strong>.
        </Paragrafo>
        <Nota titulo="E é contraordenação">
          {CONTRATO_A_TERMO.contraordenacao.value}.
        </Nota>
        <VaiPara href="/guias/despedimento">
          O que é um despedimento ilícito, e o que dá direito a
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que muda no dia a dia">
        <Paragrafo>
          Um trabalhador a termo tem os <strong>mesmos direitos</strong> de quem tem contrato sem termo,
          na proporção da duração: retribuição, férias, subsídios, formação, proteção contra
          discriminação.
        </Paragrafo>
        <Paragrafo>
          A diferença real está no fim, e no período experimental — que é bastante mais curto:{" "}
          {PERIODO_EXPERIMENTAL.termoSeisMesesOuMais.value} dias em contratos de seis meses ou mais, e{" "}
          {PERIODO_EXPERIMENTAL.termoMenosDeSeisMeses.value} nos mais curtos.
        </Paragrafo>
        <VaiPara href="/guias/periodo-experimental">
          As durações do período experimental, e o que as reduz
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se lê um contrato a termo em cinco minutos">
        <Passos
          passos={[
            {
              titulo: "Procurar o motivo justificativo, e lê-lo em voz alta",
              texto: "Se soa a fórmula geral aplicável a qualquer empresa do país, é genérico — e um motivo genérico não sustenta o termo.",
            },
            {
              titulo: "Verificar se o motivo liga ao prazo escrito",
              texto: "Uma campanha de três meses não justifica um contrato de dois anos, e uma substituição de baixa médica dura o que durar a baixa.",
            },
            {
              titulo: "Somar todo o tempo já feito no mesmo posto",
              texto: "Contratos anteriores, trabalho temporário, prestação de serviços, empresas do mesmo grupo. É esse total que se compara com o limite.",
            },
            {
              titulo: "Confirmar que o contrato está escrito e assinado por ambos",
              texto: "A forma escrita é condição de validade do termo. Um contrato a termo verbal é um contrato sem termo.",
            },
            {
              titulo: "Guardar cópia de tudo, desde o primeiro",
              texto: "É o histórico que sustenta a conversão em contrato sem termo — e ninguém o reconstrói anos depois.",
            },
            {
              titulo: "Antes do fim, contar os dias do aviso de caducidade",
              texto: "A caducidade do contrato a termo certo exige comunicação escrita com antecedência legal. Falhá-la tem consequências para o empregador.",
            },
          ]}
        />
        <VaiPara href="/guias/fim-do-contrato">
          O que se recebe quando o contrato acaba
        </VaiPara>
        <VaiPara href="/guias/falsos-recibos-verdes">
          Quando o «contrato» nem contrato é
        </VaiPara>
      </Seccao>

      <Seccao titulo="Renovações, e como se conta o tempo todo">
        <Paragrafo>
          O contrato a termo certo <strong>renova-se automaticamente</strong> no fim do prazo se
          nenhuma das partes o fizer cessar, e por igual período — salvo estipulação em contrário. A
          renovação está sujeita aos mesmos requisitos do contrato inicial, e conta para o limite de
          duração.
        </Paragrafo>
        <Paragrafo>
          É por isso que a pergunta útil não é «quantas renovações já houve», mas{" "}
          <strong>«quanto tempo já passou no total»</strong> — somando contratos anteriores, trabalho
          temporário no mesmo posto e prestação de serviços para o mesmo objeto.
        </Paragrafo>
        <AvisoPrazo titulo="Ultrapassado o limite, o contrato converte-se">
          Não é preciso pedir nada nem assinar nada: a lei converte-o em contrato sem termo. O que é
          preciso é conseguir demonstrar o tempo — e isso faz-se com os contratos guardados.
        </AvisoPrazo>
      </Seccao>
    </>
  );
}
