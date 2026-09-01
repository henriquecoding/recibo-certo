import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  AUTOLIQUIDACAO_CONSTRUCAO,
  FATURACAO_PRAZOS,
  IVA_CONSTRUCAO_HABITACAO,
  IVA_TAXAS,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Atualizado a 01/09/2026: o Decreto-Lei n.º 97/2026, de 20 de maio, alargou a
// al. j) do n.º 1 do art. 2.º do CIVA, com efeitos a 1 de julho de 2026. A
// secção da construção civil passou a ter de distinguir DOIS casos, porque a
// resposta à pergunta «o adquirente deduz?» deixou de decidir sozinha.
//
// Corpo verificado a 07/08/2026 contra o articulado na coleção CONSOLIDADA
// (`civa_rep` — a coleção que o pacote citava serve a redação anterior ao
// Pacote IVA de 2010): arts. 2.º, 6.º, 27.º, 29.º e 36.º do CIVA.
//
// O pacote avisa: «a menção deve reproduzir a fórmula legal — indicar a
// redação exata exigida pelo CIVA e não uma tradução livre». O guia diz que
// a menção é obrigatória, diz onde está fixada e manda usá-la tal e qual,
// em vez de propor uma redação própria que seria exatamente a tradução
// livre que o pacote proíbe.
/** Datas legais em pt-PT por extenso: "2026-07-01" → "1 de julho de 2026". */
const dataPt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function CorpoAutoliquidacaoIva() {
  return (
    <>
      <Seccao titulo="Onde se localiza o serviço">
        <Paragrafo>
          Tudo neste guia depende de uma pergunta anterior a todas: <strong>em que país se considera
          que o serviço foi prestado?</strong> Não é onde estás, nem onde o trabalho foi feito — é o
          que o art. 6.º do Código do IVA determinar.
        </Paragrafo>
        <Paragrafo>
          A resposta muda conforme o destinatário seja ou não sujeito passivo, e há exceções por tipo
          de serviço — imóveis, transportes, eventos, restauração. A regra geral, essa, é simples e
          resolve a maioria dos casos.
        </Paragrafo>
        <Nota titulo="Localização não é o mesmo que isenção">
          Um serviço localizado noutro país não está «isento»: está fora do campo de aplicação do IVA
          português. A distinção parece académica e não é — muda a menção obrigatória na fatura e o
          sítio onde a operação é declarada.
        </Nota>
      </Seccao>

      <Seccao titulo="B2B intracomunitário: a regra geral">
        <Paragrafo>
          Numa prestação de serviços a um <strong>sujeito passivo</strong> estabelecido noutro
          Estado-Membro, a regra geral localiza a operação no{" "}
          <strong>país do adquirente</strong>. Não liquidas IVA português.
        </Paragrafo>
        <Paragrafo>
          O imposto é devido lá — e é o <strong>cliente</strong> que o liquida e simultaneamente o
          deduz, na declaração dele. É isto que se chama autoliquidação, e é a razão pela qual, para
          um cliente com direito à dedução integral, a operação é neutra.
        </Paragrafo>
        <AvisoPrazo titulo="Depende de o cliente ter número válido no VIES">
          É a condição prática. Sem número válido, não podes tratar a operação por esta regra — e
          passas a ter de liquidar IVA português, à taxa normal do continente de{" "}
          {pctExato(IVA_TAXAS.continente.value.normal)}, quando aplicável.
        </AvisoPrazo>
        <VaiPara href="/guias/vies">
          Como validar o número do cliente, e guardar prova
        </VaiPara>
      </Seccao>

      <Seccao titulo="A menção obrigatória na fatura">
        <Paragrafo>
          Uma fatura sem IVA tem de <strong>dizer porquê</strong>. E não basta escrever «isento» ou
          «sem IVA»: a lei exige a menção do motivo, e para a autoliquidação a menção é própria e
          distinta de qualquer isenção.
        </Paragrafo>
        <Paragrafo>
          A fórmula a usar é a que consta do Código do IVA — reproduz-a{" "}
          <strong>tal e qual</strong>, no idioma e nos termos exigidos, em vez de a traduzir ou
          parafrasear. Programas certificados têm-na pré-configurada; vale a pena confirmar qual está
          selecionada antes de emitir a primeira fatura.
        </Paragrafo>
        <AvisoPrazo titulo="Uma menção errada não é um detalhe estético">
          É o que sustenta a não liquidação. Uma fatura que não identifica corretamente o motivo pode
          levar a AT a considerar o imposto devido — e a liquidá-lo a quem emitiu.
        </AvisoPrazo>
        <Nota titulo="E a fatura tem prazo próprio">
          Nas prestações intracomunitárias de serviços tributáveis noutro Estado-Membro, a fatura
          emite-se até ao dia{" "}
          <strong>{FATURACAO_PRAZOS.intracomunitariasAteDiaDoMesSeguinte.value} do mês seguinte</strong>{" "}
          — e não no {FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil da regra geral.
        </Nota>
      </Seccao>

      <Seccao titulo="Como declaras quando és o adquirente">
        <Paragrafo>
          A autoliquidação funciona nos dois sentidos, e o lado que apanha as pessoas de surpresa é
          este: quando <em>compras</em> um serviço a um fornecedor de outro Estado-Membro, és{" "}
          <strong>tu</strong> o devedor do imposto em Portugal.
        </Paragrafo>
        <Paragrafo>
          Recebes uma fatura sem IVA, e na tua declaração periódica{" "}
          <strong>liquidas</strong> o imposto à taxa portuguesa e, tendo direito a isso,{" "}
          <strong>deduzes</strong>-o no mesmo período. Para quem deduz integralmente, o efeito é nulo
          — mas o registo tem de existir.
        </Paragrafo>
        <AvisoPrazo titulo="Quem não deduz, paga mesmo">
          Um sujeito passivo isento, ou com atividade isenta sem direito a dedução, liquida e{" "}
          <strong>não</strong> deduz. A subscrição de software estrangeira que parecia não ter IVA
          passa a ter — e é imposto a entregar ao Estado, do teu bolso.
        </AvisoPrazo>
        <Nota titulo="É por isto que o isento também se regista">
          Quem adquire serviços a fornecedores de outros Estados-Membros precisa de registo para
          operações intracomunitárias, mesmo estando isento nas suas próprias operações.
        </Nota>
        <VaiPara href="/guias/declaracao-periodica-iva">
          Onde a autoliquidação entra na declaração periódica
        </VaiPara>
      </Seccao>

      <Seccao titulo="Autoliquidação interna (construção civil, sucatas)">
        <Paragrafo>
          A autoliquidação não é só um mecanismo internacional. Há operações <strong>internas</strong>
          — entre dois sujeitos passivos portugueses — em que a lei desloca a obrigação de liquidar do
          fornecedor para o adquirente.
        </Paragrafo>
        <Paragrafo>
          Os casos mais frequentes são os <strong>serviços de construção civil</strong> e as{" "}
          <strong>transmissões de resíduos, sucatas e desperdícios</strong>. A razão é de combate à
          fraude: elimina-se o risco de o fornecedor cobrar o imposto e não o entregar.
        </Paragrafo>
        <AvisoPrazo titulo="Nem tudo o que parece obra é construção civil">
          O âmbito é definido por lista e por entendimentos da AT, e há trabalhos de fronteira —
          manutenção, instalação de equipamento, montagem — que geram dúvidas reais. Confirma o
          enquadramento antes de emitir, com um contabilista certificado.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que mudou a 1 de julho de 2026">
        <Paragrafo>
          Até essa data, a inversão na construção civil dependia de uma condição do lado do
          cliente: só se aplicava se o <strong>adquirente</strong> praticasse operações com
          direito à dedução. Um promotor que só vende habitação — operação isenta, sem direito a
          deduzir — ficava de fora, e recebia a fatura <em>com</em> imposto.
        </Paragrafo>
        <Paragrafo>
          O Decreto-Lei n.º 97/2026, de 20 de maio, acrescentou um segundo caso. Desde{" "}
          <strong>{dataPt(AUTOLIQUIDACAO_CONSTRUCAO.alargamentoProduzEfeitosEm.value)}</strong>
          , quando o que se adquire é uma <strong>empreitada da verba 2.42</strong> — construção ou
          reabilitação de habitação —, a inversão aplica-se{" "}
          <strong>mesmo que o adquirente não tenha direito à dedução nenhum</strong>.
        </Paragrafo>
        <Nota titulo="Para quem emite a fatura, a pergunta mudou">
          Antes bastava saber se o cliente deduzia. Agora, se ele não deduz, falta perguntar uma
          segunda coisa: <strong>a obra cabe na verba 2.42?</strong> Se couber, a fatura sai sem
          imposto na mesma.
        </Nota>
        <AvisoPrazo titulo="E deste lado o imposto não é neutro">
          Quando o adquirente <strong>deduz</strong>, autoliquidar é um lançamento que se anula a
          si próprio. Quando <strong>não deduz</strong> — que é precisamente o caso novo —, o
          imposto que ele liquida é dinheiro que entrega ao Estado e não recupera. É custo, e tem
          de estar orçamentado.
        </AvisoPrazo>
        <Nota titulo="Pode recuar a janeiro, mas só de comum acordo">
          O regime admite aplicação desde{" "}
          {dataPt(AUTOLIQUIDACAO_CONSTRUCAO.opcaoConjuntaDesde.value)}, e a
          lei é expressa quanto ao modo: exige <strong>opção conjunta</strong> do prestador e do
          adquirente. Não é uma escolha que se faça sozinho, nem depois do facto.
        </Nota>
      </Seccao>

      <Seccao titulo="A empreitada de habitação à taxa reduzida (verba 2.42)">
        <Paragrafo>
          A mesma reforma criou a verba 2.42 da lista I: as empreitadas de{" "}
          <strong>construção ou reabilitação</strong> de imóveis destinados à venda para habitação
          própria e permanente, ou exclusivamente ao arrendamento habitacional, passam da taxa
          normal para a <strong>taxa reduzida</strong> —{" "}
          {pctExato(IVA_CONSTRUCAO_HABITACAO.taxaPorRegiao.value.continente)} no continente, em vez
          de {pctExato(IVA_TAXAS.continente.value.normal)}.
        </Paragrafo>
        <Paragrafo>
          A redução não é para qualquer obra: o imóvel tem de ficar dentro dos limites de valor
          moderado — até{" "}
          <strong>{fmt(IVA_CONSTRUCAO_HABITACAO.precoModeradoVenda.value)}</strong> de preço de
          venda, ou <strong>{fmt(IVA_CONSTRUCAO_HABITACAO.rendaModeradaMensal.value)}</strong> de
          renda mensal.
        </Paragrafo>
        <AvisoPrazo titulo="A taxa reduzida pode ser retirada depois da obra">
          As condições confirmam-se no fim: a venda tem de ocorrer em{" "}
          {IVA_CONSTRUCAO_HABITACAO.prazoVendaOuPrimeiroArrendamentoMeses.value} meses a contar do
          início de utilização, o título aquisitivo tem de mencionar expressamente a verba, e no
          arrendamento o imóvel tem de estar arrendado pelo menos{" "}
          {IVA_CONSTRUCAO_HABITACAO.arrendamentoMinimoMeses.value} meses nos primeiros cinco anos.
          Falhando qualquer uma, o imposto é <strong>regularizado a favor do Estado</strong>, com
          juros compensatórios.
        </AvisoPrazo>
        <Nota titulo="Móveis e extras contam para o limite">
          O valor a aferir não é só o do contrato: acrescem os equipamentos e partes acessórias
          ligados ao imóvel com carácter de permanência e os serviços que o valorizem — ainda que
          contratados à parte. Separar a cozinha num contrato próprio não baixa o valor.
        </Nota>
        <Nota titulo="A verba tem prazo">
          Aplica-se a obras cuja iniciativa procedimental (o pedido de licenciamento ou a
          comunicação prévia) se inicie até{" "}
          {dataPt(IVA_CONSTRUCAO_HABITACAO.iniciativaProcedimentalAte.value)}
          , e cessa vigência a{" "}
          {dataPt(IVA_CONSTRUCAO_HABITACAO.cessaVigenciaEm.value)}.
        </Nota>
        <Nota titulo="A menção também é obrigatória aqui, e é outra">
          A fatura de um serviço de construção civil sujeito a autoliquidação leva menção própria,
          distinta da das operações intracomunitárias. Não são intermutáveis.
        </Nota>
      </Seccao>

      <Seccao titulo="Erros que geram liquidação adicional">
        <Passos
          passos={[
            {
              titulo: "Não validar o número do cliente no VIES",
              texto: "Sem número válido, a regra geral não se aplica. O imposto é devido, e sai de quem emitiu.",
            },
            {
              titulo: "Escrever «isento» em vez da menção legal da autoliquidação",
              texto: "São coisas diferentes. Uma fatura mal fundamentada pode levar a AT a considerar o imposto devido.",
            },
            {
              titulo: "Esquecer a autoliquidação nas aquisições",
              texto: "O lado da compra é o mais esquecido de todos. Software, publicidade e serviços digitais comprados a fornecedores da UE geram imposto a liquidar em Portugal.",
            },
            {
              titulo: "Aplicar a regra geral a serviços com regra própria",
              texto: "Serviços relacionados com imóveis localizam-se onde o imóvel está; eventos, onde ocorrem. Aplicar a regra geral a estes é erro comum em projetos internacionais.",
            },
            {
              titulo: "Tratar um consumidor final como sujeito passivo",
              texto: "A regra geral do B2B não se aplica a particulares. Aí entram as regras dos serviços a consumidores finais — e, muitas vezes, o balcão único.",
            },
            {
              titulo: "Não entregar a declaração recapitulativa",
              texto: "As operações intracomunitárias declaram-se, mesmo sem imposto liquidado. É a omissão que a administração deteta primeiro, porque o cliente declarou do outro lado.",
            },
          ]}
        />
        <VaiPara href="/guias/oss-iva">
          Quando o cliente é um consumidor final noutro Estado-Membro
        </VaiPara>
        <VaiPara href="/guias/declaracao-recapitulativa">
          A declaração recapitulativa das operações intracomunitárias
        </VaiPara>
      </Seccao>
    </>
  );
}
