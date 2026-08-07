import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { AJUSTE_BASE_SS, SS_COEFICIENTE, SUBSIDIO_DOENCA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: o prazo de garantia, as percentagens por
// duração e a majoração vêm do motor (DL 28/2004), com fonte na Segurança
// Social.
//
// O pacote avisa: «o período de espera difere entre independentes e
// trabalhadores por conta de outrem — confirmar no Código Contributivo e na
// regulamentação antes de publicar números». Não foi possível confirmar o
// número aplicável aos independentes nesta revisão: o Diário da República
// serve um shell vazio e o portal da Segurança Social é renderizado por
// JavaScript. O guia diz que o período existe, que é MAIOR do que o dos
// trabalhadores por conta de outrem, e manda confirmá-lo — sem o inventar.
export default function CorpoSubsidioDoencaIndependentes() {
  return (
    <>
      <Seccao titulo="Prazo de garantia: quantos meses de descontos">
        <Paragrafo>
          Antes de haver direito a subsídio, é preciso ter{" "}
          <strong>{SUBSIDIO_DOENCA.prazoGarantiaMeses.value} meses</strong> com registo de
          remunerações — seguidos ou interpolados. Não têm de ser os seis meses imediatamente
          anteriores, e não têm de ser consecutivos.
        </Paragrafo>
        <Paragrafo>
          «Registo de remunerações» é a expressão a reter: são os meses em que houve{" "}
          <em>contribuição</em>, não os meses em que houve atividade. Um período de isenção
          contributiva não conta para este prazo.
        </Paragrafo>
        <AvisoPrazo titulo="Quem começou há pouco não tem cobertura ainda">
          É a consequência direta e pouco intuitiva da isenção do primeiro ano: durante esse período
          não há contribuição, logo não há registo de remunerações, logo não corre o prazo de
          garantia. Adoecer no primeiro ano de atividade é a pior altura possível.
        </AvisoPrazo>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          O que os períodos de isenção custam em proteção
        </VaiPara>
      </Seccao>

      <Seccao titulo="Período de espera antes do primeiro pagamento">
        <Paragrafo>
          Há um número de dias iniciais de incapacidade que não são pagos — o{" "}
          <strong>período de espera</strong>. Só a partir dele começa o subsídio.
        </Paragrafo>
        <Paragrafo>
          Para os trabalhadores por conta de outrem esse período é de{" "}
          <strong>{SUBSIDIO_DOENCA.periodoEsperaDias.value} dias</strong>. Para os{" "}
          <strong>trabalhadores independentes é maior</strong> — e este guia não fixa o número porque
          não foi possível confirmá-lo em fonte oficial verificável nesta revisão.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o teu período de espera antes de contar com o subsídio">
          Verifica-o na Segurança Social Direta ou no guia prático do subsídio de doença. É a
          diferença entre saber ao certo quantos dias ficas sem rendimento e descobri-lo já de baixa
          — e é precisamente o género de número que não deve ser lido de segunda mão.
        </AvisoPrazo>
        <Nota titulo="Há situações em que o período de espera não se aplica">
          Internamento hospitalar, tuberculose e doença profissional estão entre as exceções
          previstas. Nesses casos o subsídio começa desde o primeiro dia.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se calcula a remuneração de referência">
        <Paragrafo>
          Esta é a parte que liga tudo o resto. O subsídio é uma percentagem da{" "}
          <strong>remuneração de referência</strong> — e a remuneração de referência de um
          independente sai da <strong>base de incidência</strong> que ele próprio declarou nas
          trimestrais.
        </Paragrafo>
        <Paragrafo>
          Não sai da faturação. Sai de{" "}
          <strong>{pctExato(SS_COEFICIENTE.servicos.value)}</strong> do rendimento declarado, nas
          prestações de serviços, ajustado pelo que tiveres escolhido no ajuste voluntário.
        </Paragrafo>
        <Nota titulo="Quem fatura muito e declara pouco recebe pouco">
          É a consequência que ninguém antecipa. A Segurança Social não sabe quanto faturaste — sabe
          quanto declaraste. Uma carreira construída sobre bases mínimas dá um subsídio mínimo,
          independentemente do volume real do negócio.
        </Nota>
      </Seccao>

      <Seccao titulo="Percentagens por duração da baixa">
        <Paragrafo>
          A percentagem sobe com a duração da incapacidade, em quatro escalões — todos na tabela de
          dados aqui em baixo. Começa em{" "}
          {pctExato(SUBSIDIO_DOENCA.escaloes.value[0]?.taxa ?? 0)} da remuneração de referência nos
          primeiros 30 dias e chega a{" "}
          {pctExato(SUBSIDIO_DOENCA.escaloes.value[3]?.taxa ?? 0)} acima de um ano.
        </Paragrafo>
        <Paragrafo>
          Há ainda uma <strong>majoração de {pctExato(SUBSIDIO_DOENCA.majoracao.value)}</strong> nos
          escalões mais baixos, quando a remuneração de referência não excede{" "}
          {fmt(SUBSIDIO_DOENCA.majoracaoRemuneracaoLimite.value)} ou o agregado tem três ou mais
          descendentes.
        </Paragrafo>
        <AvisoPrazo titulo="Os primeiros 30 dias são os mais mal pagos">
          E são a esmagadora maioria das baixas. A percentagem mais baixa aplica-se exatamente ao
          período mais provável — o que torna a reserva de tesouraria mais importante para um
          independente do que para quem tem vencimento.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Limite máximo de dias">
        <Paragrafo>
          A concessão do subsídio de doença tem um limite máximo de dias por período de incapacidade,
          fixado na regulamentação e diferenciado consoante a situação. Ultrapassado esse limite, a
          via deixa de ser o subsídio de doença e passa a ser a avaliação de incapacidade
          permanente.
        </Paragrafo>
        <Paragrafo>
          Confirma o limite aplicável ao teu caso na Segurança Social — como o período de espera, é
          um número que depende de regulamentação e não deve ser assumido.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Como se requer">
        <Passos
          passos={[
            {
              titulo: "O certificado de incapacidade é emitido pelo médico",
              texto: "Por via eletrónica, e é ele que dá entrada no sistema. Não é o doente que o submete.",
            },
            {
              titulo: "Confirmar que chegou à Segurança Social Direta",
              texto: "Aparece na tua área. Se não aparecer em poucos dias, o problema é de submissão e resolve-se com o médico — não à espera.",
            },
            {
              titulo: "Ter a situação contributiva regularizada",
              texto: "É condição de atribuição. Uma dívida por regularizar trava o pagamento de uma prestação a que terias direito.",
            },
            {
              titulo: "Confirmar o IBAN registado",
              texto: "É por onde o subsídio é pago. Um IBAN desatualizado atrasa tudo depois de o resto estar resolvido.",
            },
            {
              titulo: "Continuar a entregar as declarações trimestrais",
              texto: "A obrigação declarativa não suspende com a baixa. E o rendimento do trimestre, se houve, declara-se na mesma.",
            },
          ]}
        />
        <VaiPara href="/guias/situacao-regularizada">
          Como se confirma a situação contributiva regularizada
        </VaiPara>
      </Seccao>

      <Seccao titulo="Porque baixar a base de incidência sai caro aqui">
        <Paragrafo>
          O ajuste voluntário de{" "}
          <strong>±{pctExato(AJUSTE_BASE_SS.amplitude.value)}</strong> na declaração trimestral é a
          única alavanca que tens sobre a contribuição — e é neste guia que se vê o preço de a puxar
          para baixo.
        </Paragrafo>
        <Paragrafo>
          Baixar a base baixa a contribuição e baixa o subsídio de doença{" "}
          <strong>na mesma proporção</strong>. A poupança é de alguns euros por mês; o custo aparece
          inteiro no mês em que ficas sem poder trabalhar.
        </Paragrafo>
        <AvisoPrazo titulo="E não se corrige a tempo">
          A remuneração de referência sai de meses anteriores à baixa. Quando percebes que precisas
          do subsídio, os meses que o determinam já passaram — e o ajuste que fizeste há um ano já
          não se desfaz.
        </AvisoPrazo>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          O ajuste da base, e o que ele troca
        </VaiPara>
        <VaiPara href="/guias/parentalidade-independentes">
          A mesma lógica, do lado do subsídio parental
        </VaiPara>
      </Seccao>
    </>
  );
}
