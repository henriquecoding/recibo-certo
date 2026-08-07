import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CATEGORIA_F } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

const TAXA = CATEGORIA_F.taxaHabitacao.value;
const R5 = CATEGORIA_F.reducaoDuracao.value["5a10"];

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 8.º, 41.º, 22.º, 72.º e 55.º do CIRS. A escada de reduções do art.
// 72.º está nos n.os 3, 4 e 5, em PONTOS PERCENTUAIS — o pacote trazia-a por
// confirmar e é isto que a redação em vigor diz.
export default function CorpoArrendamentoCategoriaF() {
  return (
    <>
      <Seccao titulo="Rendimento bruto e rendimento líquido">
        <Paragrafo>
          Rendimentos prediais são as rendas de prédios rústicos, urbanos e mistos{" "}
          <strong>pagas ou colocadas à disposição</strong> do titular — desde que este não opte por
          as tributar na categoria B. Conta o momento em que o dinheiro fica disponível, não o
          período a que a renda respeita.
        </Paragrafo>
        <Paragrafo>
          A lei é mais larga do que «renda de casa». São havidas como rendas, entre outras, as
          importâncias do aluguer de maquinismos e mobiliário instalados no imóvel, a diferença que
          o sublocador ganha, a cedência de uso para fins especiais como{" "}
          <strong>publicidade</strong>, a cedência de partes comuns em propriedade horizontal e as
          indemnizações que compensem perdas desta categoria.
        </Paragrafo>
        <Paragrafo>
          A taxa não incide sobre este bruto. Incide sobre o <strong>líquido</strong> — o que sobra
          depois das deduções do art. 41.º.
        </Paragrafo>
        <VaiPara href="/guias/despesas-senhorio">
          O que podes mesmo deduzir antes de chegar à taxa
        </VaiPara>
      </Seccao>

      <Seccao titulo={`A taxa autónoma de ${pctExato(TAXA)}`}>
        <Paragrafo>
          Os rendimentos prediais de <strong>arrendamento habitacional</strong> são tributados à
          taxa autónoma que está na tabela de dados aqui em baixo. Autónoma quer dizer que não se soma aos outros
          rendimentos nem sobe de escalão com eles: é uma taxa fixa sobre aquele rendimento
          líquido.
        </Paragrafo>
        <AvisoPrazo titulo={`Nem todas as rendas são ${pctExato(TAXA)}`}>
          A taxa mais baixa é a do arrendamento habitacional. Os rendimentos prediais que não caibam
          aí — arrendamento de escritório, de loja, de armazém, cedência para publicidade — ficam na
          taxa autónoma geral, três pontos acima. É a distinção que mais custa dinheiro a quem
          assume uma taxa única para tudo, e as duas estão nos dados abaixo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A escada de reduções por duração do contrato">
        <Paragrafo>
          As reduções são em <strong>pontos percentuais</strong>, não em percentagem da taxa — e
          aplicam-se a contratos de arrendamento para <strong>habitação permanente</strong>. Os três
          degraus, por duração do contrato, estão na tabela de dados aqui em baixo. Os contratos de
          direito real de habitação duradoura entram no degrau mais alto, na parte respeitante à
          prestação mensal.
        </Paragrafo>
        <Paragrafo>
          Há uma segunda escada, para quem renova. Nos contratos de cinco a dez anos, cada renovação
          de igual duração traz mais <strong>2 pontos</strong> de redução — com um teto de{" "}
          <strong>10 pontos</strong> no total das reduções por renovação.
        </Paragrafo>
        <Nota titulo="Porque é que a distinção entre pontos e percentagem importa">
          Uma redução de {pctExato(R5)} em pontos sobre {pctExato(TAXA)} dá{" "}
          {pctExato(TAXA - R5)}. Se fosse «menos {pctExato(R5)} da taxa», daria{" "}
          {pctExato(TAXA * (1 - R5))}. É a diferença entre pagar{" "}
          {((TAXA - R5) * 100).toFixed(2).replace(".", ",")} € ou{" "}
          {(TAXA * (1 - R5) * 100).toFixed(2).replace(".", ",")} € por cada 100 € de rendimento
          líquido — e a lei diz pontos percentuais.
        </Nota>
      </Seccao>

      <Seccao titulo="Englobar ou não englobar">
        <Paragrafo>
          A taxa autónoma é a regra, mas podes optar por <strong>englobar</strong>: juntar as rendas
          aos restantes rendimentos e tributar tudo pelos escalões progressivos. Compensa quando a
          tua taxa média fica abaixo da autónoma aplicável — tipicamente em rendimentos globais
          baixos.
        </Paragrafo>
        <AvisoPrazo titulo="Optar pelo englobamento é tudo ou nada">
          Quem exerce a opção fica <strong>obrigado a englobar a totalidade dos rendimentos da mesma
          categoria</strong>. Não se escolhe englobar o arrendamento que dá jeito e deixar de fora o
          que não dá.
        </AvisoPrazo>
        <VaiPara href="/guias/escaloes-irs">
          Os escalões com que a alternativa é comparada
        </VaiPara>
      </Seccao>

      <Seccao titulo="Perdas prediais e o reporte">
        <Paragrafo>
          Um ano com obras grandes pode fechar em resultado líquido negativo. Esse resultado só é
          dedutível a resultados positivos <strong>da mesma categoria</strong>, e pode ser reportado
          aos <strong>seis anos seguintes</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="O reporte caduca se o imóvel deixar de render">
          O direito ao reporte fica sem efeito quando os prédios a que os gastos dizem respeito não
          gerarem rendimentos da categoria F durante pelo menos{" "}
          <strong>36 meses, seguidos ou interpolados, nos cinco anos seguintes</strong> àquele em
          que os gastos foram incorridos. Fazer obras e deixar a casa fechada faz perder a perda.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Como se declara no Anexo F">
        <Paragrafo>
          As rendas e os gastos entram no <strong>Anexo F</strong> da declaração Modelo 3,
          discriminados por prédio — é por isso que a dedução é feita prédio a prédio e que os
          gastos têm de estar organizados dessa forma desde o início do ano.
        </Paragrafo>
        <Paragrafo>
          É também no Anexo F que se indica a duração do contrato que dá direito à redução da taxa e
          onde se exerce, ou não, a opção pelo englobamento. Um contrato de longa duração que não
          seja declarado como tal é tributado como se fosse curto.
        </Paragrafo>
        <VaiPara href="/guias/recibo-renda-modelo-44">
          O recibo que sustenta cada valor declarado
        </VaiPara>
        <VaiPara href="/guias/al-vs-arrendamento">
          Se estás a comparar com alojamento local
        </VaiPara>
      </Seccao>
    </>
  );
}
