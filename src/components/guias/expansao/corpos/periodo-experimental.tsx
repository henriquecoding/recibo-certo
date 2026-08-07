import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DENUNCIA_EXPERIMENTAL, PERIODO_EXPERIMENTAL } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra os arts. 112.º, 113.º e 114.º do
// Código do Trabalho, no articulado consolidado (PGD Lisboa), com a lista
// de alterações confirmada contra a DGERT — ambas terminam na Lei n.º
// 32/2025. O art. 112.º está na redação da Lei n.º 13/2023.
export default function CorpoPeriodoExperimental() {
  return (
    <>
      <Seccao titulo="Três durações, e a que te cabe não é a que te dizem">
        <Paragrafo>
          No contrato por tempo indeterminado, o período experimental tem uma de três durações — e a
          diferença entre a primeira e a última é de mais de cinco meses.
        </Paragrafo>
        <Paragrafo>
          · <strong>{PERIODO_EXPERIMENTAL.geral.value} dias</strong> para a generalidade dos
          trabalhadores;
          <br />· <strong>{PERIODO_EXPERIMENTAL.qualificados.value} dias</strong> para cargos de
          complexidade técnica, elevado grau de responsabilidade ou especial qualificação, funções de
          confiança, e para quem esteja à procura de primeiro emprego ou em desemprego de longa
          duração;
          <br />· <strong>{PERIODO_EXPERIMENTAL.direcao.value} dias</strong> para cargo de direção ou
          quadro superior.
        </Paragrafo>
        <AvisoPrazo titulo="Não é o contrato que decide — são as funções">
          Escrever «período experimental de {PERIODO_EXPERIMENTAL.direcao.value} dias» num contrato de
          quem não exerce cargo de direção não estende o prazo. A duração resulta da lei e das funções
          efetivamente exercidas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="No contrato a termo é muito mais curto">
        <Paragrafo>
          · <strong>{PERIODO_EXPERIMENTAL.termoSeisMesesOuMais.value} dias</strong> em contrato de
          duração igual ou superior a seis meses;
          <br />· <strong>{PERIODO_EXPERIMENTAL.termoMenosDeSeisMeses.value} dias</strong> em contrato
          a termo certo de duração inferior a seis meses, ou a termo incerto cuja duração previsível
          não ultrapasse esse limite.
        </Paragrafo>
        <Paragrafo>
          E em comissão de serviço só existe <strong>havendo estipulação expressa</strong> no acordo —
          não se presume — e não pode exceder{" "}
          {PERIODO_EXPERIMENTAL.comissaoDeServico.value} dias.
        </Paragrafo>
        <Nota titulo="É a diferença que apanha quem passa de termo a efetivo">
          Um contrato a termo de nove meses tem{" "}
          {PERIODO_EXPERIMENTAL.termoSeisMesesOuMais.value} dias de experimental, não{" "}
          {PERIODO_EXPERIMENTAL.geral.value}.
        </Nota>
      </Seccao>

      <Seccao titulo="Trabalho anterior reduz — ou elimina — o período">
        <Paragrafo>
          É a regra que mais direitos devolve, e a que menos gente invoca: o período experimental{" "}
          <strong>é reduzido ou excluído</strong> consoante a duração de contrato a termo anterior para
          a mesma atividade, de trabalho temporário no mesmo posto, de prestação de serviços para o
          mesmo objeto, ou de estágio profissional para a mesma atividade — desde que com o{" "}
          <strong>mesmo empregador</strong>.
        </Paragrafo>
        <Paragrafo>
          E há uma segunda porta, esta com <strong>empregador diferente</strong>: quem está no período
          de {PERIODO_EXPERIMENTAL.qualificados.value} dias por procurar primeiro emprego ou estar em
          desemprego de longa duração vê-o reduzido ou excluído se tiver tido contrato a termo — ou
          estágio profissional com avaliação positiva nos últimos 12 meses — de{" "}
          <strong>{PERIODO_EXPERIMENTAL.reducaoPorContratoAnterior.value} dias ou mais</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Ninguém te vai lembrar disto">
          A redução não é automática na prática: é preciso invocá-la, com prova do contrato ou do
          estágio anteriores. Guardar contratos antigos deixa de ser sentimentalismo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A denúncia, e os dois avisos prévios">
        <Paragrafo>
          Durante o período experimental, {DENUNCIA_EXPERIMENTAL.semAvisoPrevio.value}. É o que o
          define.
        </Paragrafo>
        <Paragrafo>
          Mas «sem aviso prévio» tem duas exceções, e ambas correm contra o{" "}
          <strong>empregador</strong>:
        </Paragrafo>
        <Paragrafo>
          · tendo durado mais de <strong>{DENUNCIA_EXPERIMENTAL.limiarAviso7Dias.value} dias</strong>,
          a denúncia pelo empregador depende de aviso prévio de{" "}
          <strong>{DENUNCIA_EXPERIMENTAL.aviso7Dias.value} dias</strong>;
          <br />· tendo durado mais de{" "}
          <strong>{DENUNCIA_EXPERIMENTAL.limiarAviso30Dias.value} dias</strong>, o aviso sobe para{" "}
          <strong>{DENUNCIA_EXPERIMENTAL.aviso30Dias.value} dias</strong>.
        </Paragrafo>
        <Nota titulo="Falhar o aviso não anula a denúncia — paga-se">
          {DENUNCIA_EXPERIMENTAL.faltaDeAviso.value}.
        </Nota>
      </Seccao>

      <Seccao titulo="Não é um período sem direitos">
        <Paragrafo>
          {PERIODO_EXPERIMENTAL.antiguidadeContaDesdeOInicio.value} — o que significa que os dias de
          experiência contam para tudo o que depende de antiguidade.
        </Paragrafo>
        <Paragrafo>
          E há denúncias que a lei trava: {DENUNCIA_EXPERIMENTAL.denunciaAbusiva.value}. Uma denúncia
          no dia seguinte a uma queixa, ou à comunicação de uma gravidez, tem esse nome.
        </Paragrafo>
        <AvisoPrazo titulo="Há denúncias que o empregador tem de comunicar">
          Tratando-se de trabalhadora grávida, puérpera ou lactante, de trabalhador em licença
          parental ou de trabalhador cuidador, a denúncia é comunicada à entidade competente na área
          da igualdade no prazo de{" "}
          {DENUNCIA_EXPERIMENTAL.comunicacaoIgualdadeDiasUteis.value} dias úteis. Não o fazer é
          contraordenação grave.
        </AvisoPrazo>
        <VaiPara href="/guias/despedimento">
          O que muda depois de terminado o período experimental
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que fazer antes de assinar, e durante">
        <Passos
          passos={[
            {
              titulo: "Ler a cláusula do período experimental antes de assinar",
              texto: "Confirma que a duração escrita corresponde às funções reais. Pode ser reduzida por acordo escrito ou por convenção coletiva — nunca ampliada além do que a lei permite.",
            },
            {
              titulo: "Verificar se trabalho anterior o reduz",
              texto: "Contrato a termo, trabalho temporário, prestação de serviços ou estágio para a mesma atividade, com o mesmo empregador. Com empregador diferente, vale para quem está no período dos primeiros empregos.",
            },
            {
              titulo: "Marcar os dois limiares no calendário",
              texto: `Dia ${DENUNCIA_EXPERIMENTAL.limiarAviso7Dias.value} e dia ${DENUNCIA_EXPERIMENTAL.limiarAviso30Dias.value}. É a partir deles que o empregador deixa de poder denunciar de um dia para o outro.`,
            },
            {
              titulo: "Guardar tudo por escrito, dos dois lados",
              texto: "Avaliações, elogios, objetivos atingidos. Numa denúncia abusiva, é o que sustenta o caso — e o carácter abusivo só pode ser declarado pelos tribunais judiciais.",
            },
            {
              titulo: "Se a denúncia chegar sem aviso, contar os dias",
              texto: "Passados os limiares, há retribuição a receber pelo aviso em falta. Não é indemnização — é retribuição, e é devida.",
            },
            {
              titulo: "Confirmar que a antiguidade ficou registada desde o primeiro dia",
              texto: "É o que a lei manda, e é o que decide férias, subsídios e compensações mais tarde.",
            },
          ]}
        />
        <VaiPara href="/guias/contrato-a-termo">
          O contrato a termo, e quando é que o termo é inválido
        </VaiPara>
        <VaiPara href="/guias/recibo-vencimento">
          O primeiro recibo, e o que verificar nele
        </VaiPara>
      </Seccao>
    </>
  );
}
