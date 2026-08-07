import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, FATURACAO_PRAZOS, REDUCAO_COIMA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto aos prazos de faturação e às coimas:
// art. 36.º do CIVA na coleção consolidada, e arts. 26.º, 30.º e 117.º do
// RGIT.
//
// O pacote avisa: «o prazo já foi alterado várias vezes (dia 5, 8, 12).
// Confirmar o prazo em vigor no DL 28/2019 antes de publicar». Não foi
// possível confirmá-lo — o Diário da República serve um shell vazio —,
// pelo que o dia NÃO é publicado. O guia diz que o prazo é mensal, diz que
// mudou várias vezes e manda confirmá-lo.
export default function CorpoSafTFaturacao() {
  return (
    <>
      <Seccao titulo="O que é o SAF-T e o que contém">
        <Paragrafo>
          É um ficheiro normalizado que o teu programa de faturação gera e que comunica à AT{" "}
          <strong>todos os documentos emitidos</strong> no período — faturas, faturas-recibo, notas de
          crédito e de débito, guias de transporte.
        </Paragrafo>
        <Paragrafo>
          Contém, documento a documento: a identificação do emitente e do adquirente, a data, os
          valores por taxa, o total, o ATCUD e a assinatura. É a partir dele que a AT alimenta o
          e-Fatura e cruza a tua faturação com as declarações que entregas.
        </Paragrafo>
        <Nota titulo="Não é a declaração de IVA, e não a substitui">
          O SAF-T comunica <em>documentos</em>; a declaração periódica apura <em>imposto</em>. São
          obrigações distintas, com prazos distintos — e é o cruzamento entre as duas que revela
          divergências.
        </Nota>
        <VaiPara href="/guias/declaracao-periodica-iva">
          A declaração periódica de IVA, campo a campo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quem é obrigado a comunicar">
        <Paragrafo>
          Todos os sujeitos passivos que emitam documentos fiscalmente relevantes. Não depende de
          estares no regime normal ou no de isenção, nem de teres contabilidade organizada.
        </Paragrafo>
        <Paragrafo>
          Quem factura no Portal das Finanças não tem de fazer nada: os documentos já são emitidos e
          registados pela própria AT. A obrigação prática recai sobre quem usa programa próprio.
        </Paragrafo>
        <AvisoPrazo titulo="Estar isento de IVA não te dispensa">
          É a confusão mais frequente. A isenção do art. 53.º diz respeito a liquidar imposto — não a
          comunicar documentos. Quem emite faturas comunica-as.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O prazo mensal">
        <Paragrafo>
          A comunicação é <strong>mensal</strong>, e respeita aos documentos emitidos no{" "}
          <strong>mês anterior</strong>. Isso é estável e não mudou.
        </Paragrafo>
        <Paragrafo>
          O <em>dia</em> concreto do mês é que mudou várias vezes ao longo dos anos, por diplomas
          sucessivos. Este guia não o fixa porque não foi possível confirmar o prazo em vigor em fonte
          oficial legível nesta revisão.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o dia no calendário fiscal do ano">
          É publicado pela AT e é a fonte a usar. Um prazo escrito num guia e desatualizado por um
          diploma faz falhar exatamente a obrigação que o guia queria ajudar a cumprir.
        </AvisoPrazo>
        <VaiPara href="/dashboard/prazos">O calendário fiscal, com alertas antecipados</VaiPara>
      </Seccao>

      <Seccao titulo="Meses sem faturação">
        <Paragrafo>
          Comunica-se na mesma. Um mês sem documentos emitidos gera uma comunicação{" "}
          <strong>sem documentos</strong> — não gera ausência de comunicação.
        </Paragrafo>
        <Paragrafo>
          A diferença é toda: a AT distingue «este contribuinte não teve atividade» de «este
          contribuinte não comunicou». A segunda é uma falta, e é detetada automaticamente.
        </Paragrafo>
        <AvisoPrazo titulo="A falta é por período, e as coimas somam">
          Cada mês em falta é uma infração autónoma. Seis meses esquecidos não são um problema — são
          seis, e a moldura de cada um vai de {fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Comunicar por webservice, ficheiro ou manualmente">
        <Paragrafo>
          Há três vias, e a escolha é de conveniência, não de legalidade.
        </Paragrafo>
        <Paragrafo>
          · <strong>Webservice</strong> — o programa comunica cada documento à AT em tempo real ou por
          lote, sem intervenção tua. É o que os programas certificados fazem por defeito.
          <br />· <strong>Ficheiro SAF-T</strong> — geras o ficheiro do mês e submete-lo no Portal das
          Finanças. É o caminho de quem tem programa que não integra.
          <br />· <strong>Inserção manual</strong> — documento a documento no Portal. Só faz sentido
          para volumes muito baixos.
        </Paragrafo>
        <Nota titulo="Verifica que o webservice está mesmo a funcionar">
          É a falha mais silenciosa desta obrigação: uma credencial expirada ou uma configuração
          perdida numa atualização param a comunicação sem aviso. Confirma no Portal das Finanças, uma
          vez por mês, que os documentos lá estão.
        </Nota>
      </Seccao>

      <Seccao titulo="O que falha e como se corrige">
        <Passos
          passos={[
            {
              titulo: "Documentos comunicados mas não emitidos, ou o contrário",
              texto: "Confere o total do mês no Portal das Finanças com o total do teu programa. A divergência aparece aí, e resolve-se cedo.",
            },
            {
              titulo: "Comunicação parada por credenciais expiradas",
              texto: "Renova as credenciais de webservice e recomunica os períodos em falta. O programa não te avisa.",
            },
            {
              titulo: "Séries não comunicadas antes de emitir",
              texto: "Documentos de uma série sem código de validação são documentos com problema de origem. Comunica a série e confirma que os documentos passam a ser aceites.",
            },
            {
              titulo: "Períodos em falta — comunicar já, sem esperar",
              texto: `Comunicar por iniciativa própria, antes de qualquer ação da AT, reduz a coima a ${pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)} do mínimo legal, com o piso de ${fmt(COIMAS_RGIT.minimoComReducao.value)}. Depois de a AT agir, não há redução.`,
            },
            {
              titulo: "Ao mudar de programa, recomunicar nada — exportar tudo",
              texto: "O que foi comunicado está comunicado. O que tens de garantir é ficar com o SAF-T de cada mês do programa antigo, para a conservação.",
            },
          ]}
        />
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução da coima, e o que a fecha
        </VaiPara>
      </Seccao>

      <Seccao titulo="SAF-T da contabilidade: obrigação distinta">
        <Paragrafo>
          Têm o mesmo nome e não são a mesma coisa — e a confusão entre os dois é constante.
        </Paragrafo>
        <Paragrafo>
          O SAF-T da <strong>faturação</strong> é <strong>mensal</strong>, sai do programa de
          faturação e comunica documentos. O SAF-T da <strong>contabilidade</strong> é{" "}
          <strong>anual</strong>, sai da contabilidade organizada e destina-se ao pré-preenchimento da
          declaração de rendimentos das empresas.
        </Paragrafo>
        <Nota titulo="Quem está no regime simplificado não tem o segundo">
          Não tem contabilidade organizada, logo não há SAF-T da contabilidade a entregar. Continua a
          ter o da faturação, todos os meses.
        </Nota>
        <AvisoPrazo titulo="E o prazo de emissão das faturas é outro ainda">
          Não se confunde com nenhum dos dois: a fatura emite-se até ao{" "}
          {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil seguinte ao momento em que o imposto
          é devido. Três obrigações, três relógios.
        </AvisoPrazo>
        <VaiPara href="/guias/faturacao-eletronica">
          As três obrigações que se confundem
        </VaiPara>
      </Seccao>
    </>
  );
}
