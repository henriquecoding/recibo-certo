import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 3.º e 31.º do CIRS (n.º 1, als. a, c e h), art. 53.º e art. 18.º do
// CIVA, e a Lista I anexa ao CIVA (verba 2.17), lida no PDF consolidado.
export default function CorpoAlojamentoLocal() {
  return (
    <>
      <Seccao titulo="Registo: o número de AL vem antes de tudo">
        <Paragrafo>
          O alojamento local começa por ser uma questão de licenciamento, não de impostos. O
          estabelecimento tem de estar <strong>registado</strong> e o número de registo tem de
          constar da publicidade e das plataformas. Sem ele, nada do que se segue é sequer legal —
          e a coima não depende de haver ou não imposto por pagar.
        </Paragrafo>
        <Paragrafo>
          O registo é municipal e o regime jurídico foi alterado mais do que uma vez nos últimos
          anos, incluindo quanto a suspensões de novos registos e a caducidade dos existentes.
          Confirma o quadro em vigor no teu município antes de contar com a exploração — é matéria
          que muda por deliberação camarária, não por lei fiscal.
        </Paragrafo>
        <VaiPara href="/guias/abrir-atividade">
          A abertura de atividade nas Finanças, que é o passo seguinte
        </VaiPara>
      </Seccao>

      <Seccao titulo="Porque é Categoria B e não Categoria F">
        <Paragrafo>
          Porque não estás a ceder o uso do imóvel: estás a <strong>prestar um serviço</strong>. A
          exploração de estabelecimentos de alojamento local é atividade empresarial e cai na{" "}
          <strong>categoria B</strong> — com tudo o que isso arrasta: abertura de atividade,
          faturação, IVA e contribuições para a Segurança Social.
        </Paragrafo>
        <Paragrafo>
          É a diferença de fundo face ao arrendamento, e explica quase tudo o resto. O senhorio da
          categoria F declara rendas e deduz gastos do imóvel; o titular de AL declara uma atividade
          e é tributado sobre uma percentagem do que fatura.
        </Paragrafo>
        <VaiPara href="/guias/arrendamento-categoria-f">
          Como funciona o outro lado — as rendas na categoria F
        </VaiPara>
      </Seccao>

      <Seccao titulo="O coeficiente e o que ele já assume">
        <Paragrafo>
          No regime simplificado não se deduzem despesas reais: aplica-se um{" "}
          <strong>coeficiente</strong> ao rendimento bruto e o resultado é o rendimento tributável.
          O coeficiente aplicável ao AL na modalidade de moradia ou apartamento está na tabela de
          dados aqui em baixo.
        </Paragrafo>
        <Nota titulo="A alínea que muita gente lê ao contrário">
          A restauração e a atividade hoteleira têm um coeficiente muito favorável — mas o art. 31.º
          <strong> exclui expressamente</strong> dessa alínea a exploração de AL na modalidade de
          moradia ou apartamento. É por isso que o AL não fica no coeficiente das atividades
          hoteleiras: cai na regra geral das prestações de serviços.
        </Nota>
        <Paragrafo>
          O coeficiente já assume as despesas: a parte que sobra dele é a margem presumida de custos
          da atividade. Não deduzes água, luz, limpezas ou comissões da plataforma por cima disso —
          já estão lá dentro, por presunção.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Zonas de contenção e a agravação">
        <Paragrafo>
          Há um coeficiente mais alto — também na tabela de dados — para os estabelecimentos de AL
          na modalidade de moradia ou apartamento <strong>localizados em área de contenção</strong>.
          Mais coeficiente é mais rendimento tributável sobre a mesma faturação.
        </Paragrafo>
        <AvisoPrazo titulo="Há uma dedução que se perde ao mesmo tempo">
          Os rendimentos das alíneas b) e c) do art. 31.º permitem deduzir as contribuições
          obrigatórias para regimes de proteção social na parte em que excedam 10% do rendimento
          bruto. A alínea das áreas de contenção <strong>não está nessa lista</strong>. Quem passa a
          área de contenção perde as duas coisas: sobe o coeficiente e deixa de ter aquela dedução.
        </AvisoPrazo>
        <Paragrafo>
          A delimitação das áreas de contenção é <strong>municipal</strong> e muda. Confirma sempre
          na câmara do teu concelho, e confirma por morada — dentro do mesmo município há freguesias
          dentro e fora.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="IVA: isenção do art. 53.º e a taxa aplicável">
        <Paragrafo>
          Duas coisas separadas, e é preciso perceber as duas. A primeira: enquanto o volume de
          negócios do ano anterior não ultrapassar o limiar do <strong>art. 53.º</strong>, ficas
          isento — não liquidas IVA e não o deduzes.
        </Paragrafo>
        <Paragrafo>
          A segunda, para quando deixares de estar isento: o alojamento{" "}
          <strong>não beneficia da isenção da locação de imóveis</strong>. O art. 9.º isenta a
          locação de bens imóveis, mas a isenção exclui expressamente as prestações de serviços de
          alojamento no âmbito da atividade hoteleira ou de outras com funções análogas.
        </Paragrafo>
        <Paragrafo>
          Aplica-se a <strong>taxa reduzida</strong> ao alojamento em estabelecimentos do tipo
          hoteleiro — e só ao <em>preço do alojamento</em>, incluindo o pequeno-almoço se não for
          faturado à parte. Os restantes serviços que vendas seguem a taxa que lhes couber, o que na
          prática obriga a discriminar na fatura.
        </Paragrafo>
        <VaiPara href="/guias/iva-recibos-verdes">
          O limiar da isenção e o que acontece quando o ultrapassas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Taxa turística municipal">
        <Paragrafo>
          Não é imposto do Estado nem entra no teu IRS: é uma <strong>taxa municipal</strong>,
          cobrada ao hóspede por noite e entregue à câmara. Existe em alguns municípios e não em
          outros, com valores, épocas e limites de noites diferentes.
        </Paragrafo>
        <Paragrafo>
          Para ti é dinheiro em trânsito — cobras e entregas. Mas é uma obrigação declarativa
          autónoma, com prazos próprios, e é das que mais passa despercebida a quem gere através de
          plataformas que a cobram automaticamente ao hóspede.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Obrigações não fiscais que costumam falhar">
        <Passos
          passos={[
            {
              titulo: "Comunicação de hóspedes estrangeiros",
              texto: "O boletim de alojamento de cidadãos estrangeiros é obrigatório e tem prazo próprio. É independente do registo de AL e da fiscalidade.",
            },
            {
              titulo: "Livro de reclamações eletrónico",
              texto: "Obrigatório e com disponibilização visível ao hóspede. A falta é contraordenação autónoma.",
            },
            {
              titulo: "Seguro de responsabilidade civil",
              texto: "Exigido pelo regime jurídico do AL, com cobertura para danos a hóspedes e a terceiros.",
            },
            {
              titulo: "Requisitos do estabelecimento e sinalética",
              texto: "Condições de segurança, extintor, manta ignífuga, kit de primeiros socorros e a placa identificativa junto à entrada.",
            },
          ]}
        />
        <Paragrafo>
          Nenhuma destas é fiscal, e é precisamente por isso que escapam a quem organiza a atividade
          a pensar em impostos. As coimas por incumprimento são autónomas e não dependem de haver
          imposto em falta.
        </Paragrafo>
        <VaiPara href="/guias/al-vs-arrendamento">
          A comparação com o arrendamento tradicional, depois de impostos
        </VaiPara>
        <VaiPara href="/guias/seguranca-social">
          As contribuições que a categoria B traz consigo
        </VaiPara>
      </Seccao>
    </>
  );
}
