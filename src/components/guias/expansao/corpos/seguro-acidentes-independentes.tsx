import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { SS_COEFICIENTE, SS_TAXA } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto ao enquadramento contributivo (via
// motor). O regime do seguro obrigatório consta da Lei n.º 98/2009 e da
// regulamentação do setor segurador; os capitais e as coberturas concretas
// não são fixados aqui — variam por apólice e por regulamentação.
export default function CorpoSeguroAcidentesIndependentes() {
  return (
    <>
      <Seccao titulo="A obrigação legal">
        <Paragrafo>
          Quem exerce atividade por conta própria é obrigado a{" "}
          <strong>transferir para uma seguradora</strong> a responsabilidade por acidentes de
          trabalho — a sua própria. Não é uma recomendação nem uma boa prática: é uma obrigação legal
          autónoma, prevista no regime de reparação de acidentes de trabalho.
        </Paragrafo>
        <Paragrafo>
          É diferente de tudo o resto que este site trata. Não é fiscal, não é contributiva, e não se
          resolve na Segurança Social nem no Portal das Finanças — resolve-se com uma seguradora.
        </Paragrafo>
        <AvisoPrazo titulo="É a obrigação mais esquecida de quem abre atividade">
          Abrir atividade nas Finanças e enquadrar-se na Segurança Social são dois passos que toda a
          gente conhece. Este é o terceiro, e a maior parte das pessoas nunca ouviu falar dele — até
          precisar.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que o seguro cobre">
        <Paragrafo>
          A reparação dos danos emergentes de <strong>acidente de trabalho</strong>: as despesas
          médicas e de reabilitação, as indemnizações por incapacidade temporária enquanto não podes
          trabalhar, as pensões por incapacidade permanente e, no limite, as prestações por morte.
        </Paragrafo>
        <Paragrafo>
          «Acidente de trabalho» tem definição própria e é mais amplo do que parece: inclui, em
          termos definidos na lei, o acidente ocorrido no trajeto de ida e volta do local de
          trabalho.
        </Paragrafo>
        <Nota titulo="A cobertura acompanha a atividade declarada">
          A apólice é feita para a atividade que declaraste à seguradora. Alargar o âmbito do que
          fazes — passar a incluir trabalho em obra, condução, deslocações frequentes — sem o
          comunicar pode deixar sem cobertura precisamente o que passou a ser o teu risco maior.
        </Nota>
      </Seccao>

      <Seccao titulo="O que a Segurança Social já cobre e o que não cobre">
        <Paragrafo>
          É a confusão que este guia existe para desfazer. A contribuição de{" "}
          <strong>{pctExato(SS_TAXA.value)}</strong> que pagas sobre a base de incidência financia a
          proteção na doença, na parentalidade, no desemprego e na velhice.
        </Paragrafo>
        <Paragrafo>
          <strong>Não financia acidentes de trabalho.</strong> É um ramo autónomo, com regime próprio
          e financiamento próprio — o seguro. Estar em dia com a Segurança Social não te dá nenhuma
          cobertura neste domínio.
        </Paragrafo>
        <AvisoPrazo titulo="E a baixa por acidente não é a baixa por doença">
          Um acidente de trabalho é reparado pela seguradora, não pelo subsídio de doença. Quem não
          tem seguro fica com as despesas médicas e a perda de rendimento inteiramente a seu cargo —
          sem subsídio, porque não é doença, e sem indemnização, porque não há apólice.
        </AvisoPrazo>
        <VaiPara href="/guias/subsidio-doenca-independentes">
          O subsídio de doença, que cobre outra coisa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Base de cálculo do prémio">
        <Paragrafo>
          O prémio calcula-se sobre a <strong>retribuição declarada à seguradora</strong> — o valor
          que declaras como o teu rendimento do trabalho — multiplicada por uma taxa que depende do
          risco da atividade.
        </Paragrafo>
        <Paragrafo>
          A referência habitual é a mesma base que serve a Segurança Social:{" "}
          {pctExato(SS_COEFICIENTE.servicos.value)} do rendimento, nas prestações de serviços. Mas
          são declarações independentes — a seguradora não vê a tua declaração trimestral.
        </Paragrafo>
        <AvisoPrazo titulo="Declarar pouco à seguradora barateia o prémio e reduz a indemnização">
          É a mesma troca do ajuste da base de incidência, noutro sítio: a indemnização por
          incapacidade é calculada sobre a retribuição declarada. Poupar no prémio é reduzir o que
          receberás no dia em que não puderes trabalhar.
        </AvisoPrazo>
        <Nota titulo="Atualiza a declaração quando o rendimento sobe">
          Uma apólice feita no primeiro ano de atividade e nunca revista cobre o rendimento que
          tinhas então. Rever a retribuição declarada é a manutenção mais barata deste seguro.
        </Nota>
      </Seccao>

      <Seccao titulo="Consequências de não ter seguro">
        <Paragrafo>
          Sem transferência da responsabilidade, a responsabilidade é <strong>tua</strong>. E os
          valores em causa num acidente grave — tratamento, reabilitação, perda de rendimento durante
          meses ou anos — não são comparáveis ao custo do prémio.
        </Paragrafo>
        <Paragrafo>
          Há ainda o lado sancionatório: o incumprimento da obrigação de seguro é contraordenação, e
          é verificável pela Autoridade para as Condições do Trabalho.
        </Paragrafo>
        <Nota titulo="Em várias atividades, é condição de acesso">
          Contratos com entidades públicas, trabalho em obra, licenciamentos setoriais e plataformas
          exigem comprovativo de seguro. Não ter apólice pode ser, antes de tudo o resto, uma barreira
          a trabalhar.
        </Nota>
      </Seccao>

      <Seccao titulo="Distinção face à responsabilidade civil profissional">
        <Paragrafo>
          São dois seguros diferentes, com finalidades opostas, e confundem-se com frequência.
        </Paragrafo>
        <Paragrafo>
          · O de <strong>acidentes de trabalho</strong> protege-te <em>a ti</em>: cobre os danos que
          tu sofres a trabalhar.
          <br />· O de <strong>responsabilidade civil profissional</strong> protege{" "}
          <em>terceiros</em>: cobre os danos que o teu trabalho causa a outros.
        </Paragrafo>
        <Paragrafo>
          Um não substitui o outro, e ter um dos dois não dispensa o outro. O de acidentes de
          trabalho é obrigatório para todos os que exercem atividade por conta própria; o de
          responsabilidade civil profissional é obrigatório apenas em profissões determinadas, nos
          termos dos regimes das respetivas ordens.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma com a tua ordem profissional, se tens uma">
          A obrigatoriedade do seguro de responsabilidade civil não é universal e não tem norma
          única: é definida profissão a profissão. É lá que se confirma — não por analogia com outras
          profissões.
        </AvisoPrazo>
        <VaiPara href="/guias/rc-profissional">
          Quem é mesmo obrigado a ter responsabilidade civil profissional
        </VaiPara>
      </Seccao>
    </>
  );
}
