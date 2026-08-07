import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ISENCAO_IVA_REGIME, IVA_ISENCAO_EXCESSO, IVA_TAXAS } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção CONSOLIDADA
// (`civa_rep`), já com a redação do Decreto-Lei n.º 35/2025: arts. 32.º,
// 53.º, 54.º e 58.º do CIVA.
//
// O pacote avisa que os arts. 53.º e 58.º foram alterados pelo DL 35/2025 e
// manda ler sempre a redação em vigor. Foi lida — e mudou mais do que os
// números: mudou a epígrafe do art. 53.º e a estrutura do art. 58.º.
export default function CorpoMudarRegimeIva() {
  return (
    <>
      <Seccao titulo="Como se conta o volume de negócios">
        <Paragrafo>
          O limiar é de <strong>{fmt(ISENCAO_IVA_REGIME.limiarNacional.value)}</strong> de volume de
          negócios anual <strong>em território nacional</strong>, no ano civil anterior. A precisão
          «em território nacional» é nova e é da reforma de 2025 — antes o artigo não a tinha.
        </Paragrafo>
        <Paragrafo>
          Conta-se o valor das operações, sem IVA. Não é o lucro, não é o que entrou na conta, e não
          se abatem despesas: é a faturação do ano.
        </Paragrafo>
        <AvisoPrazo titulo="No primeiro ano, o limiar é proporcional">
          Quem inicia atividade a meio do ano toma em consideração o volume de negócios{" "}
          <strong>estimado para o ano civil corrente</strong>. Começar em setembro não dá o limiar
          inteiro — é a armadilha silenciosa de quem abre atividade no último trimestre.
        </AvisoPrazo>
        <Nota titulo="A isenção não é para todos, mesmo abaixo do limiar">
          A lei exclui do regime quem pratique operações de exportação ou atividades conexas, quem
          faça uma só operação tributável nas condições do art. 2.º, e as transmissões
          intracomunitárias de meios de transporte novos.
        </Nota>
      </Seccao>

      <Seccao titulo="O prazo para a declaração de alterações">
        <Paragrafo>
          Deixando de reunir as condições da isenção, há que entregar a{" "}
          <strong>declaração de alterações</strong> do art. 32.º — e o prazo é curto:{" "}
          <strong>{ISENCAO_IVA_REGIME.prazoDeclaracaoAlteracoesDiasUteis.value} dias úteis</strong>.
        </Paragrafo>
        <Paragrafo>
          Quando a ultrapassagem se verifica <em>no ano anterior</em>, contam-se do último dia desse
          ano. Quando deixa de se verificar outra das condições do art. 53.º, contam-se do momento em
          que isso acontece.
        </Paragrafo>
        <AvisoPrazo titulo="Não entregar é contraordenação">
          A falta ou o atraso da declaração de alterações tem moldura própria e mais alta do que a
          das declarações comuns — e a mudança de regime acontece na mesma, com ou sem declaração.
          Falhar o prazo não adia nada: só acrescenta uma coima.
        </AvisoPrazo>
        <VaiPara href="/guias/coimas-fiscais">
          As molduras das coimas, e como se reduzem
        </VaiPara>
      </Seccao>

      <Seccao titulo="A partir de quando liquidas IVA">
        <Paragrafo>
          Depende de <em>como</em> passaste o limiar, e são dois regimes diferentes.
        </Paragrafo>
        <Paragrafo>
          Se o ultrapassaste <strong>no ano civil anterior</strong>, o imposto é devido{" "}
          {ISENCAO_IVA_REGIME.efeitoNoAnoSeguinte.value}. Tens o resto do ano corrente para te
          preparares — e é o caso confortável.
        </Paragrafo>
        <Paragrafo>
          Se o excedeste <strong>em mais de {pctExato(ISENCAO_IVA_REGIME.excessoQueTornaImediato.value)}</strong>{" "}
          no ano em curso, o imposto é devido{" "}
          {ISENCAO_IVA_REGIME.efeitoImediato.value} — sem esperar por janeiro.
        </Paragrafo>
        <Nota titulo="A taxa que passas a liquidar">
          A normal, no continente, é de{" "}
          <strong>{pctExato(IVA_TAXAS.continente.value.normal)}</strong>. Há taxas intermédia e
          reduzida para bens e serviços determinados, e taxas próprias na Madeira e nos Açores.
        </Nota>
        <VaiPara href="/dashboard/comparar">
          Comparar o efeito de liquidar IVA no teu preço
        </VaiPara>
      </Seccao>

      <Seccao titulo="A regra da ultrapassagem e o efeito imediato">
        <Paragrafo>
          É a regra que apanha mais gente de surpresa, e vale a pena ver o número: excedido o limiar
          em mais de {pctExato(ISENCAO_IVA_REGIME.excessoQueTornaImediato.value)} — isto é, acima de{" "}
          <strong>{fmt(IVA_ISENCAO_EXCESSO.value)}</strong> —, o regime normal aplica-se{" "}
          <strong>a partir desse momento</strong>.
        </Paragrafo>
        <Paragrafo>
          Não é a partir da declaração, nem do mês seguinte, nem do ano seguinte. É da operação que
          fez ultrapassar esse patamar.
        </Paragrafo>
        <AvisoPrazo titulo="A fatura que passa o patamar já leva IVA">
          E é aí que o problema nasce: quem só percebe depois emitiu faturas sem IVA que já o
          deviam ter. O imposto é devido na mesma — e sai do bolso de quem faturou, se o cliente já
          pagou e não aceita a retificação.
        </AvisoPrazo>
        <Nota titulo="Vigia o acumulado, não a fatura individual">
          O limiar é anual e acumulado. Quem está perto dele deve saber, a cada fatura emitida, quanto
          falta — porque a decisão de emitir com ou sem IVA depende disso.
        </Nota>
      </Seccao>

      <Seccao titulo="O que fazer às faturas já emitidas">
        <Passos
          passos={[
            {
              titulo: "Identificar a operação que fez passar o patamar",
              texto: "É a fronteira. As anteriores estão bem emitidas sem IVA; a partir dela, o imposto é devido.",
            },
            {
              titulo: "Retificar as faturas emitidas sem IVA depois desse momento",
              texto: "Por nota de crédito e nova fatura, ou por documento retificativo, conforme o caso. A retificação a favor do Estado é obrigatória.",
            },
            {
              titulo: "Falar com os clientes antes de emitir",
              texto: "Um cliente empresa deduz o IVA e não perde nada; um consumidor final vê o preço subir. A conversa é mais fácil antes do documento do que depois.",
            },
            {
              titulo: "Entregar a declaração de alterações no prazo",
              texto: `${ISENCAO_IVA_REGIME.prazoDeclaracaoAlteracoesDiasUteis.value} dias úteis. É o que põe o cadastro a corresponder à realidade — e sem isso o sistema continua a tratar-te como isento.`,
            },
            {
              titulo: "Entregar a primeira declaração periódica no prazo certo",
              texto: "A periodicidade — mensal ou trimestral — depende do volume de negócios, e a primeira entrega é a que mais se falha por desconhecimento do calendário.",
            },
          ]}
        />
        <VaiPara href="/guias/nota-de-credito">
          Como se retifica um documento já comunicado
        </VaiPara>
        <VaiPara href="/guias/declaracao-periodica-iva">
          A declaração periódica, e os prazos
        </VaiPara>
      </Seccao>

      <Seccao titulo="Regularizar IVA suportado antes da mudança">
        <Paragrafo>
          Aqui há dinheiro à espera, e quase ninguém o vai buscar. Enquanto estavas isento não podias
          deduzir o IVA que suportaste — mas há um mecanismo de{" "}
          <strong>regularização a favor do sujeito passivo</strong> para quem passa do regime de
          isenção ao regime normal.
        </Paragrafo>
        <Paragrafo>
          Aplica-se, em condições e prazos próprios, ao imposto suportado em{" "}
          <strong>existências</strong> ainda não vendidas e em <strong>bens do ativo</strong>{" "}
          adquiridos antes da mudança e ainda em uso.
        </Paragrafo>
        <AvisoPrazo titulo="Tem prazo, e perde-se em silêncio">
          Ninguém te avisa de que este direito existe nem de quando expira. Quem acabou de investir em
          equipamento pouco antes de passar ao regime normal tem aqui um valor material a recuperar —
          e vale a pena falar com um contabilista certificado no mês da mudança, não um ano depois.
        </AvisoPrazo>
        <VaiPara href="/guias/renunciar-isencao-iva">
          Quando compensa sair da isenção por opção, antes de ser obrigado
        </VaiPara>
      </Seccao>
    </>
  );
}
