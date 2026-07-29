import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DIVIDENDOS_TAXA, IAS, SS_MOE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("salario-gerente-ou-dividendos");

export default function SalarioGerenteOuDividendosPage() {
  const baseMinima = SS_MOE.baseMinimaIAS.value * IAS.value;
  const taxaTotal = SS_MOE.trabalhador.value + SS_MOE.entidade.value;

  return (
    <GuiaLayout slug="salario-gerente-ou-dividendos">
      <Seccao titulo="As duas torneiras">
        <Paragrafo>
          Há duas formas de tirar dinheiro de uma sociedade, e custam impostos diferentes por uma
          razão simples: o <strong>salário é custo da empresa</strong> e reduz o lucro tributável, e
          com ele o IRC. O <strong>dividendo sai de lucro já tributado</strong> e leva{" "}
          {pct(DIVIDENDOS_TAXA.value)} por cima.
        </Paragrafo>
        <TabelaPrazos
          colunas={["", "Salário de gerência", "Dividendos"]}
          linhas={[
            ["Na empresa", "Custo dedutível — reduz o IRC", "Sai do lucro depois do IRC"],
            [
              "Contribuições",
              `${pct(taxaTotal)} no total (${pct(SS_MOE.entidade.value)} da empresa, ${pct(SS_MOE.trabalhador.value)} tuas)`,
              "Nenhuma",
            ],
            ["No teu IRS", "Categoria A, escalões progressivos", `${pct(DIVIDENDOS_TAXA.value)} de taxa liberatória, ou englobamento`],
            ["Proteção social", "Doença, parentalidade, carreira contributiva", "Nada"],
          ]}
        />
      </Seccao>

      <Seccao titulo="A Segurança Social do gerente">
        <AvisoPrazo titulo="Há contribuições mesmo com remuneração zero">
          A base de incidência dos membros de órgãos estatutários tem por{" "}
          <strong>limite mínimo o valor do IAS</strong> — {fmt(IAS.value)} em 2026. Dizer «não me
          pago nada» não elimina a contribuição: reduz a base ao mínimo, e sobre esse mínimo há
          sempre {pct(taxaTotal)} a pagar, o que dá cerca de {fmt(baseMinima * taxaTotal)} por mês.
        </AvisoPrazo>
        <Paragrafo>
          É o custo que quase toda a gente esquece ao fazer as contas — e é ele que torna o cenário
          «zero salário, tudo em dividendos» menos vantajoso do que parece à primeira vista.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que o salário compra além de dinheiro">
        <Paragrafo>
          Descontar sobre a remuneração de gerência dá acesso a subsídio de doença, a subsídio
          parental e à formação de carreira contributiva para a reforma. O dividendo não conta para
          nada disto.
        </Paragrafo>
        <Nota titulo="Não é um detalhe">
          Quem se paga só em dividendos durante anos descobre, na primeira baixa longa ou no
          primeiro filho, que não tem direito a nada. A decisão não é só de eficiência fiscal.
        </Nota>
      </Seccao>

      <Seccao titulo="Onde está o ponto de equilíbrio">
        <Paragrafo>
          A lógica é esta: subir o salário compensa enquanto a soma da tua taxa marginal de IRS com
          as contribuições for <strong>inferior</strong> à soma do IRC com os{" "}
          {pct(DIVIDENDOS_TAXA.value)} dos dividendos. Quando passa a ser superior, o euro seguinte
          sai mais barato como dividendo.
        </Paragrafo>
        <Paragrafo>
          O ponto exato depende do lucro, do teu agregado e dos outros rendimentos — não há um número
          universal. O simulador de empresa faz a conta com os teus valores.
        </Paragrafo>
        <VaiPara href="/ferramentas/simulador-empresa">Simular a mistura com os meus números</VaiPara>
      </Seccao>

      <Seccao titulo="O que não se pode fazer">
        <TabelaPrazos
          colunas={["Erro", "Porquê"]}
          linhas={[
            ["Distribuir sem contas aprovadas", "A distribuição depende de deliberação sobre contas aprovadas."],
            ["Distribuir sem reserva legal constituída", "A reserva legal é obrigatória e não é distribuível."],
            ["Levantar dinheiro «por conta» sem formalizar", "Sem enquadramento, é adiantamento por conta de lucros ou suprimento — e tem regras próprias."],
          ]}
        />
        <Nota titulo="Aqui a resposta honesta é: fala com um contabilista">
          A mistura certa depende de números que mudam todos os anos e de uma leitura da tua
          situação pessoal. Esta página serve para saberes quais são as perguntas certas.
        </Nota>
        <VaiPara href="/guias/distribuir-lucros">Como distribuir os lucros</VaiPara>
        <VaiPara href="/guias/irc">Como funciona o IRC</VaiPara>
        <VaiPara href="/guias/contratar-primeiro-trabalhador">Contratar a primeira pessoa</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
