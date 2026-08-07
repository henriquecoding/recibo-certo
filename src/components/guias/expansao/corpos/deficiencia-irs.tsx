import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_DEPENDENTE, DEPENDENTES_IRS, EXCLUSAO_DEFICIENCIA_MAX, EXCLUSAO_DEFICIENCIA_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto à exclusão parcial e às deduções por
// dependente (via motor), e contra o art. 13.º, n.º 5, al. c) do CIRS
// quanto aos dependentes inaptos para o trabalho.
//
// O pacote avisa: «os montantes e o grau mínimo de incapacidade são
// atualizados — ler o CIRS e o EBF em vigor, e não replicar valores de
// artigos de imprensa». O grau mínimo NÃO é publicado aqui: consta da
// regulamentação e não foi possível confirmá-lo em fonte legível nesta
// revisão. Os valores que aparecem vêm do motor, com fonte.
export default function CorpoDeficienciaIrs() {
  return (
    <>
      <Seccao titulo="O atestado multiuso: o documento que abre tudo">
        <Paragrafo>
          Antes de qualquer benefício, há um documento — e sem ele nenhum dos outros existe. O{" "}
          <strong>atestado médico de incapacidade multiuso</strong> é o que certifica o grau de
          incapacidade, e é a chave de todo este regime.
        </Paragrafo>
        <Paragrafo>
          Obtém-se por junta médica, mediante requerimento, e demora. Não é um documento que se pede
          quando se vai entregar a declaração: é um documento que se trata com meses de
          antecedência.
        </Paragrafo>
        <AvisoPrazo titulo="Tem validade, e a validade caduca em silêncio">
          Um atestado com prazo que expira suspende os benefícios a partir daí — sem que ninguém
          avise. Verifica a data de validade do teu, hoje, e trata da renovação com antecedência.
        </AvisoPrazo>
        <Nota titulo="É «multiuso» porque serve para tudo">
          O mesmo atestado é usado no IRS, nos apoios sociais, na isenção de IUC, nos benefícios de
          acesso e na contratação. Pedir uma vez resolve várias frentes — e é a razão pela qual vale a
          pena tratar dele mesmo quando o benefício imediato parece pequeno.
        </Nota>
      </Seccao>

      <Seccao titulo="O grau de incapacidade exigido">
        <Paragrafo>
          Os benefícios fiscais dependem de um <strong>grau mínimo de incapacidade</strong>,
          certificado no atestado. Abaixo desse grau, não se aplicam — por evidente que a situação
          seja no plano humano.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica o grau mínimo</strong>. Consta da regulamentação, tem sido
          objeto de alterações, e não foi possível confirmá-lo em fonte oficial legível nesta revisão.
          Confirma-o no Portal das Finanças ou com um contabilista certificado.
        </Paragrafo>
        <AvisoPrazo titulo="Não confies em valores lidos na imprensa">
          É o aviso que o próprio levantamento que originou este guia deixa escrito, e vale a pena
          repeti-lo: o grau mínimo e os montantes são atualizados, e artigos antigos continuam a
          circular com números que já não valem.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Exclusão parcial de rendimentos">
        <Paragrafo>
          É o benefício maior, e funciona antes de tudo o resto: uma parte dos rendimentos do
          trabalho — categorias A e B — fica <strong>fora da tributação</strong>.
        </Paragrafo>
        <Paragrafo>
          A fração excluída é de{" "}
          <strong>{pctExato(EXCLUSAO_DEFICIENCIA_TAXA.value)}</strong>, com o teto de{" "}
          <strong>{fmt(EXCLUSAO_DEFICIENCIA_MAX.value)}</strong> por titular.
        </Paragrafo>
        <Nota titulo="Exclui rendimento, não reduz a taxa">
          É a mesma distinção de outros regimes de exclusão: a parte excluída não entra no englobamento
          e, por isso, nem paga imposto nem conta para determinar o escalão. O que sobra é tributado
          normalmente.
        </Nota>
        <AvisoPrazo titulo="Aplica-se por titular, não por agregado">
          Havendo dois titulares com deficiência no mesmo agregado, cada um tem a sua exclusão e o seu
          teto. É um detalhe que muda o resultado em casais.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Deduções específicas que se acumulam">
        <Paragrafo>
          Aos benefícios próprios da deficiência somam-se as deduções comuns — não as substituem.
        </Paragrafo>
        <Paragrafo>
          Um dependente com deficiência continua a dar a dedução por dependente de{" "}
          <strong>{fmt(DEDUCAO_DEPENDENTE.value)}</strong>, e as suas despesas de saúde, educação e
          gerais familiares continuam a contar — com as deduções específicas do regime da deficiência
          por cima.
        </Paragrafo>
        <Nota titulo="E não há limite de idade para dependentes inaptos">
          Os filhos maiores <strong>inaptos para o trabalho e para angariar meios de
          subsistência</strong> são dependentes sem o teto dos {DEPENDENTES_IRS.idadeMaxima.value}{" "}
          anos que se aplica aos restantes maiores. É uma alínea autónoma do art. 13.º.
        </Nota>
        <VaiPara href="/guias/dependentes-irs">
          Quem é dependente, e até quando
        </VaiPara>
      </Seccao>

      <Seccao titulo="Despesas com acompanhamento">
        <Paragrafo>
          Há despesas próprias deste regime que não existem para os restantes contribuintes:
          encargos com <strong>acompanhamento permanente</strong>, com equipamentos e com apoios
          especializados, cada um com as suas regras e os seus limites.
        </Paragrafo>
        <Paragrafo>
          Vale a pena guardar tudo com fatura e NIF, ainda que não tenhas a certeza de que conta. É a
          diferença entre poder decidir depois e não ter opção.
        </Paragrafo>
        <AvisoPrazo titulo="Muitas destas despesas não passam pelo e-Fatura">
          Serviços de apoio, equipamentos comprados no estrangeiro, prestações de cuidadores.
          Declaram-se manualmente — e o ónus da prova é de quem as declara.
        </AvisoPrazo>
        <VaiPara href="/guias/e-fatura">
          O que se declara manualmente, e como
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se declara">
        <Passos
          passos={[
            {
              titulo: "Confirmar que o atestado está válido a 31 de dezembro",
              texto: "É a data que fixa a situação pessoal e familiar relevante. Um atestado que caducou durante o ano exige verificar o efeito no ano em causa.",
            },
            {
              titulo: "Assinalar a incapacidade na declaração, por titular",
              texto: "É o que ativa a exclusão parcial e as deduções específicas. Não é automático por a AT ter o atestado noutro sistema.",
            },
            {
              titulo: "Declarar as despesas específicas nos campos próprios",
              texto: "As que não vieram pelo e-Fatura declaram-se à mão, e os documentos guardam-se.",
            },
            {
              titulo: "Verificar o efeito do limite global das deduções",
              texto: "Continua a aplicar-se. Quem já está no teto não ganha por acrescentar despesas — vale a pena confirmar antes de investir tempo a reunir documentos.",
            },
            {
              titulo: "Simular com e sem o regime",
              texto: "É a forma de ver o que cada peça vale no teu caso concreto, em vez de assumir.",
            },
            {
              titulo: "E renovar o atestado antes de expirar",
              texto: "É a manutenção que mantém tudo isto vivo, e a que mais gente esquece.",
            },
          ]}
        />
        <VaiPara href="/dashboard/simulador">
          Simular o IRS com o regime aplicado
        </VaiPara>
        <VaiPara href="/guias/deducoes-coleta">
          O limite global das deduções à coleta
        </VaiPara>
      </Seccao>
    </>
  );
}
