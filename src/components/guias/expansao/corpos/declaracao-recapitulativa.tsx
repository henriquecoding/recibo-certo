import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, FATURACAO_PRAZOS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 6.º, 29.º, 30.º e 36.º do CIVA, e art. 117.º do RGIT.
//
// O pacote manda sublinhar que a obrigação existe mesmo para quem está no
// regime de isenção do art. 53.º — «é o ponto que gera mais incumprimento».
// É a primeira secção deste guia, por isso mesmo.
export default function CorpoDeclaracaoRecapitulativa() {
  return (
    <>
      <Seccao titulo="Quem é obrigado a entregar">
        <Paragrafo>
          Quem realiza <strong>operações intracomunitárias</strong>: transmissões de bens para outros
          Estados-Membros, e prestações de serviços a sujeitos passivos de outros Estados-Membros que
          sejam tributáveis no território deles.
        </Paragrafo>
        <Paragrafo>
          E aqui está o ponto que gera mais incumprimento de toda esta secção:{" "}
          <strong>estar no regime de isenção do art. 53.º não dispensa</strong>. Quem está isento em
          Portugal e presta um serviço a uma empresa espanhola tem de entregar a recapitulativa.
        </Paragrafo>
        <AvisoPrazo titulo="São dois regimes que não se tocam">
          A isenção do art. 53.º respeita ao imposto interno — se liquidas IVA nas tuas faturas
          portuguesas. A recapitulativa respeita ao circuito intracomunitário, que existe em paralelo.
          Estar isento num não te tira do outro.
        </AvisoPrazo>
        <VaiPara href="/guias/vies">
          O registo para operações intracomunitárias, que também é preciso
        </VaiPara>
      </Seccao>

      <Seccao titulo="Periodicidade: mensal ou trimestral">
        <Paragrafo>
          Depende do <strong>montante das operações</strong> declaradas: acima de um limiar, a
          entrega é mensal; abaixo, pode ser trimestral. E há uma regra de escalada — ultrapassar o
          limiar a meio de um trimestre obriga a passar a mensal.
        </Paragrafo>
        <Paragrafo>
          O limiar e o prazo do mês constam da regulamentação e do calendário fiscal do ano.
          Confirma-os no Portal das Finanças — como todos os calendários, é matéria que se verifica no
          ano em causa e não se assume de um guia.
        </Paragrafo>
        <Nota titulo="A periodicidade da recapitulativa é independente da do IVA">
          Podes ser trimestral na declaração periódica e mensal na recapitulativa. São critérios
          diferentes, e nada obriga a que coincidam.
        </Nota>
        <VaiPara href="/dashboard/prazos">O calendário fiscal, com alertas antecipados</VaiPara>
      </Seccao>

      <Seccao titulo="O que se declara e com que código">
        <Paragrafo>
          Declara-se, por <strong>cliente</strong>: o número de identificação fiscal com o prefixo do
          país, o valor total das operações no período, e o <strong>código</strong> que identifica o
          tipo de operação.
        </Paragrafo>
        <Paragrafo>
          Os códigos distinguem transmissões de bens, prestações de serviços e operações
          triangulares. Não são intermutáveis: o código errado descreve uma operação que não é a tua,
          e é o que gera divergência com a declaração do teu cliente do outro lado.
        </Paragrafo>
        <AvisoPrazo titulo="É por valor total e por cliente, não documento a documento">
          Não se lista cada fatura: soma-se o que faturaste a cada cliente no período. É por isso que
          um erro de imputação a um cliente errado é difícil de detetar — o total geral bate certo.
        </AvisoPrazo>
        <Nota titulo="O prazo da fatura nestas operações é próprio">
          Nas prestações intracomunitárias de serviços tributáveis noutro Estado-Membro, a fatura
          emite-se até ao dia{" "}
          <strong>{FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte</strong>{" "}
          — e não no {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil da regra geral.
        </Nota>
      </Seccao>

      <Seccao titulo="Relação com o VIES">
        <Paragrafo>
          É uma relação circular, e perceber isso explica porque é que a recapitulativa importa tanto.
        </Paragrafo>
        <Paragrafo>
          Tu <strong>consultas</strong> o VIES para validar o número do cliente antes de faturar sem
          IVA. E a tua recapitulativa <strong>alimenta</strong> o VIES do outro lado: a administração
          do país do cliente vê o que declaraste, e confronta-o com o que ele declarou ter adquirido.
        </Paragrafo>
        <AvisoPrazo titulo="A divergência é detetada automaticamente, e dos dois lados">
          Se declaraste 10 000 € a um cliente alemão e ele declarou ter adquirido 8 000 €, os dois
          recebem pedidos de esclarecimento. Não é uma auditoria: é o sistema a funcionar como foi
          desenhado.
        </AvisoPrazo>
        <VaiPara href="/guias/autoliquidacao-iva">
          A autoliquidação, que é o mecanismo por trás disto tudo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Relação com a declaração periódica">
        <Paragrafo>
          As mesmas operações aparecem nas duas — e têm de <strong>bater certo</strong>.
        </Paragrafo>
        <Paragrafo>
          Na declaração periódica, entram nos campos das operações isentas ou não tributadas, sem
          imposto liquidado. Na recapitulativa, entram detalhadas por cliente e por código.
        </Paragrafo>
        <Nota titulo="Confere os totais antes de submeter, todos os períodos">
          É a verificação mais rentável desta obrigação: o total das operações intracomunitárias da
          declaração periódica tem de coincidir com o total da recapitulativa do mesmo período. Não
          coincidindo, há um erro — e é melhor encontrá-lo agora.
        </Nota>
        <VaiPara href="/guias/declaracao-periodica-iva">
          A declaração periódica, campo a campo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Erros e substituição">
        <Passos
          passos={[
            {
              titulo: "Número de cliente inválido ou desatualizado",
              texto: "Valida no VIES antes de faturar, e guarda a prova da consulta. Um número inválido põe em causa o tratamento da operação, não só a declaração.",
            },
            {
              titulo: "Código de operação errado",
              texto: "Bens declarados como serviços, ou o inverso. Corrige-se por substituição do período, e é o erro que mais divergências gera com o outro lado.",
            },
            {
              titulo: "Operação declarada no período errado",
              texto: "O período é o da exigibilidade do imposto, não o do pagamento. Uma operação de dezembro paga em fevereiro pertence a dezembro.",
            },
            {
              titulo: "Períodos em falta",
              texto: `Cada período em falta é uma infração autónoma, com moldura de ${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}. Entregar por iniciativa própria, antes de qualquer ação da AT, reduz cada uma ao mínimo.`,
            },
            {
              titulo: "Substituir o período inteiro, não acrescentar",
              texto: "A declaração de substituição repõe o período completo. Entregar uma segunda declaração com «o que faltava» duplica o que já lá estava.",
            },
          ]}
        />
        <VaiPara href="/guias/regularizacao-voluntaria">
          A redução da coima, e a janela que a permite
        </VaiPara>
      </Seccao>
    </>
  );
}
