import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("recuperar-iva-incobravel");

export default function RecuperarIvaPage() {
  return (
    <GuiaLayout slug="recuperar-iva-incobravel">
      {/* Vem primeiro: o artigo exige créditos «evidenciados como tal na
          contabilidade». Quem está no simplificado não tem contabilidade
          organizada e, na prática, não usa este regime — e o guia, categorizado
          como «Independentes», nunca o dizia. */}
      <Seccao titulo="Antes de tudo: isto aplica-se a ti?">
        <AvisoPrazo titulo="Exige contabilidade organizada">
          O regime exige créditos <strong>evidenciados como tal na contabilidade</strong>. Quem está
          no regime simplificado não tem contabilidade organizada e, na prática, não consegue usar
          esta via. A recuperação do IVA incobrável é uma ferramenta de quem tem contabilidade
          organizada — empresas e independentes acima do limite do simplificado.
        </AvisoPrazo>
        <Paragrafo>
          E se estás isento de IVA pelo Art. 53.º, não entregaste IVA nenhum: não há nada a
          recuperar. Confirmar isto primeiro poupa o tempo de perceber a regra toda para descobrir
          no fim que não se aplica.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Entregaste IVA de dinheiro que nunca entrou">
        <Paragrafo>
          No regime normal, o IVA torna-se exigível com a emissão da fatura. Se o cliente nunca
          pagou, adiantaste ao Estado imposto que não recebeste de ninguém. O Código do IVA prevê a
          devolução desse imposto — mas com condições, prazos e prova.
        </Paragrafo>
        <Paragrafo>
          A lei permite deduzir o imposto respeitante a créditos considerados{" "}
          <strong>de cobrança duvidosa</strong>, evidenciados como tal na contabilidade, bem como o
          respeitante a <strong>créditos incobráveis</strong>. São duas portas diferentes.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Cobrança duvidosa: os dois prazos de mora">
        <TabelaPrazos
          colunas={["Via", "Mora exigida", "Condições"]}
          linhas={[
            [
              "Regra geral",
              "Mais de 12 meses desde o vencimento",
              "Provas objetivas de imparidade e de terem sido efetuadas diligências para o recebimento",
            ],
            [
              "Créditos pequenos",
              "Mais de 6 meses",
              "Valor não superior a 750 € com IVA incluído e devedor particular ou sujeito passivo que só realiza operações isentas sem direito à dedução",
            ],
          ]}
        />
        <AvisoPrazo titulo="A prova não é opcional">
          Não basta que o prazo tenha passado. A lei exige provas objetivas de imparidade e de que
          foram feitas diligências de cobrança. É por isso que interpelar por escrito, e guardar
          essa correspondência, deixa de ser boa prática e passa a ser condição para recuperares o
          dinheiro.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Créditos incobráveis: outra porta">
        <Paragrafo>
          Independentemente da mora, há factos que permitem tratar o crédito como incobrável — entre
          eles situações de execução, insolvência e planos de recuperação. Quando o facto relevante
          ocorre antes de o crédito atingir os prazos de mora, é essa a via aplicável.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O procedimento não é auto-serviço">
        <Nota titulo="Autorização prévia e documentação">
          A regularização depende de documentação de suporte e, nos casos previstos na lei, de
          pedido de autorização prévia à Autoridade Tributária. O procedimento concreto varia com o
          tipo de crédito e o valor.
        </Nota>
        <Paragrafo>
          É a parte deste guia em que a resposta honesta é: fala com um contabilista certificado.
          Aqui ficas a saber que o direito existe, quais são os prazos e que prova tens de ir
          reunindo desde o primeiro dia — que é precisamente o que se perde quando ninguém avisa.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Se estás isento, não há nada a recuperar">
        <Paragrafo>
          Quem está no regime de isenção do Art. 53.º não liquida nem entrega IVA — logo, não há IVA
          para devolver. O prejuízo da fatura não paga continua a existir, mas resolve-se pela via
          da cobrança e pelo tratamento em sede de IRS.
        </Paragrafo>
        <VaiPara href="/guias/iva-recibos-verdes">
          Confirmar o meu enquadramento de IVA
        </VaiPara>
        <VaiPara href="/guias/iva-de-caixa">
          Evitar o problema à nascença com o IVA de caixa
        </VaiPara>
        <VaiPara href="/guias/cobrar-divida">
          Cobrar o capital em paralelo
        </VaiPara>
      </Seccao>
      <Seccao titulo="O direito traz duas obrigações atrás">
        <TabelaPrazos
          colunas={["Obrigação", "Porquê"]}
          linhas={[
            [
              "Comunicar a regularização ao devedor",
              "Para que ele regularize a favor do Estado o imposto que tinha deduzido. A regularização não é só entre ti e a AT.",
            ],
            [
              "Reentregar o IVA se vieres a receber",
              "Se o crédito for mais tarde recuperado, no todo ou em parte, o imposto regularizado volta a ser entregue ao Estado.",
            ],
          ]}
        />
        <Nota titulo="Aqui a resposta honesta é: fala com um contabilista">
          O procedimento concreto varia com o tipo de crédito, o valor e o devedor, e nalguns casos
          exige pedido de autorização prévia à Autoridade Tributária. É matéria de contabilista
          certificado, não de auto-serviço.
        </Nota>
      </Seccao>

    </GuiaLayout>
  );
}
