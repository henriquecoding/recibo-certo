import type { Metadata } from "next";
import LegalPage, {
  Section, Sub, Nota, Lista, ListaCheck, Tabela,
} from "@/components/LegalPage";
import { precoPlusFormatado, precoVitalicioFormatado } from "@/lib/entitlements";
import { EMAIL_APOIO, mailtoApoio } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Termos de Utilização",
  description:
    "Termos e condições de utilização da plataforma Recibo Certo. Calculadora de recibos verdes gratuita para trabalhadores independentes em Portugal.",
  alternates: { canonical: "/termos" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Termos de Utilização — Recibo Certo",
    description:
      "Condições de utilização da calculadora de recibos verdes Recibo Certo. Serviço gratuito, sem publicidade, dados no teu dispositivo.",
    url: "https://www.recibocerto.pt/termos",
    type: "website",
  },
};

const TOC = [
  { id: "servico", label: "O serviço" },
  { id: "acesso", label: "Acesso e conta" },
  { id: "planos", label: "Planos e pagamentos" },
  { id: "utilizacao-aceite", label: "Utilização aceitável" },
  { id: "propriedade-intelectual", label: "Propriedade intelectual" },
  { id: "responsabilidade", label: "Limitação de responsabilidade" },
  { id: "dados-fiscais", label: "Dados fiscais — aviso" },
  { id: "disponibilidade", label: "Disponibilidade do serviço" },
  { id: "alteracoes-servico", label: "Alterações ao serviço" },
  { id: "rescisao", label: "Rescisão" },
  { id: "legislacao", label: "Legislação aplicável" },
  { id: "contacto", label: "Contacto" },
];

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Utilização"
      subtitle="Ao utilizar o Recibo Certo, aceitas estas condições. Lê-as com atenção — são escritas em linguagem clara, sem jargão jurídico desnecessário."
      lastUpdated="13 de agosto de 2026"
      toc={TOC}
    >
      {/* 1 */}
      <Section id="servico" title="O serviço">
        <p>
          O <strong className="text-stone-700 dark:text-stone-200">Recibo Certo</strong> é uma
          calculadora informativa para trabalhadores independentes em Portugal (emissores de recibos
          verdes). O serviço permite calcular estimativas de IRS, Segurança Social e IVA com base
          nos parâmetros fiscais do ano em curso.
        </p>
        <p>
          O Recibo Certo é disponibilizado por{" "}
          <strong className="text-stone-700 dark:text-stone-200">recibocerto.pt</strong>, contactável
          em{" "}
          <a
            href={mailtoApoio()}
            className="font-medium text-brand underline-offset-2 hover:underline dark:text-brand-mint"
          >
            {EMAIL_APOIO}
          </a>
          .
        </p>
        <Lista
          items={[
            "Calculadora de recibos verdes — estimativa de tesouraria e deduções",
            "Simulador de IRS anual — projeção de liquidação",
            "Comparador de regimes — recibos verdes vs. empresa (IRC)",
            "Calendário de prazos fiscais — datas de entrega",
            "Arquivo de recibos — histórico local no teu dispositivo",
          ]}
        />
        <Nota tipo="info">
          Ao acederes a recibocerto.pt e utilizares qualquer funcionalidade da plataforma,
          aceitas estes Termos de Utilização na sua versão mais recente.
        </Nota>
      </Section>

      {/* 2 */}
      <Section id="acesso" title="Acesso e conta">
        <Sub title="Plano gratuito">
          <p>
            O plano gratuito não exige conta para calcular, simular ou ler os guias. O histórico
            e uma amostra de cenário ficam no armazenamento local (localStorage) do teu browser;
            criar uma conta gratuita não ativa sincronização de dados fiscais na nuvem.
          </p>
        </Sub>

        <Sub title="Conta Plus">
          <p>
            Para usar o Plus, crias ou utilizas uma conta com endereço de email e palavra-passe.
            Ao criares conta, comprometeste a:
          </p>
          <Lista
            items={[
              "Fornecer informações verdadeiras e atualizadas",
              "Manter a confidencialidade das tuas credenciais",
              "Notificar-nos imediatamente em caso de acesso não autorizado",
              "Não partilhar o acesso à tua conta com terceiros",
            ]}
          />
          <p className="mt-3">
            Cada conta é pessoal e intransmissível. Reservamo-nos o direito de suspender contas
            que apresentem sinais de uso indevido ou partilha.
          </p>
        </Sub>

        <Sub title="Idade mínima">
          <p>
            Para criar uma conta, tens de ter pelo menos 16 anos de idade (ou a idade mínima
            exigida pela legislação do teu país de residência para consentir com o tratamento
            de dados pessoais).
          </p>
        </Sub>
      </Section>

      {/* 3 */}
      <Section id="planos" title="Planos e pagamentos">
        <Tabela
          colunas={["Plano", "Preço", "Funcionalidades principais"]}
          linhas={[
            [
              "Gratuito",
              "0 € / sempre",
              "Calculadoras, simuladores, guias, prazos, histórico local e 1 amostra de cenário",
            ],
            [
              "Plus mensal",
              `${precoPlusFormatado()}/mês`,
              "Nuvem, cenários ilimitados, CSV/PDF, auditoria, mealheiro e Quiz avançado",
            ],
            [
              "Plus vitalício",
              `${precoVitalicioFormatado()}, uma vez`,
              "Mesmo Plus, sem renovação; campanha fundadora limitada aos 1000 lugares anunciados",
            ],
          ]}
        />
        <Sub title="14 dias para pedir reembolso — não é um trial">
          <p>
            O pagamento é cobrado quando concluis o Checkout e o Plus fica disponível de imediato.
            Não existe um período experimental com cobrança posterior. Ainda assim, na primeira
            compra do Plus mensal ou vitalício, podes pedir o reembolso integral nos 14 dias
            seguintes, sem necessidade de justificação. Esta garantia comercial não limita os
            direitos de livre resolução que sejam aplicáveis. Para pedir o reembolso, envia um
            email a{" "}
            <a
              href={mailtoApoio()}
              className="font-medium text-brand hover:underline dark:text-brand-mint"
            >
              {EMAIL_APOIO}
            </a>{" "}
            com o assunto "Reembolso" e o email da conta. Quando o reembolso for confirmado, o
            acesso Plus é revogado e os dados sujeitos à política de retenção abaixo.
          </p>
        </Sub>
        <Sub title="Renovação e cancelamento">
          <p>
            O Plus mensal renova-se automaticamente todos os meses. Podes cancelá-lo a qualquer
            momento no portal de faturação; o acesso mantém-se até ao fim do período já pago. O
            Plus vitalício é um pagamento único e não se renova.
          </p>
          <p className="mt-3">
            Neste contexto, “vitalício” significa acesso durante a vida operacional do serviço
            Recibo Certo e enquanto a conta respeitar estes Termos; não constitui uma garantia de
            funcionamento perpétuo. A limitação a 1000 lugares inclui compras e concessões
            fundadoras já atribuídas, e não será aumentada silenciosamente enquanto esta oferta
            for anunciada como limitada.
          </p>
          <p className="mt-3">
            Depois de perderes o acesso Plus, os dados fiscais guardados na nuvem ficam disponíveis
            durante 30 dias e são depois eliminados dos nossos servidores. O que estiver guardado
            apenas no teu dispositivo permanece contigo.
          </p>
        </Sub>
      </Section>

      {/* 4 */}
      <Section id="utilizacao-aceite" title="Utilização aceitável">
        <p>
          Podes utilizar o Recibo Certo para fins pessoais, profissionais e informativos
          relacionados com a tua atividade como trabalhador independente. É expressamente
          proibido:
        </p>
        <Lista
          items={[
            "Utilizar a plataforma para fins ilegais ou contrários à ordem pública",
            "Tentar aceder a áreas restritas ou sistemas não autorizados",
            "Realizar engenharia reversa, descompilar ou extrair o código-fonte",
            "Usar scripts automáticos, robots, crawlers ou técnicas de scraping sem autorização escrita",
            "Contornar limites técnicos, desafios anti-bot, controlos de acesso ou instruções machine-readable",
            "Recolher conteúdo para treino, fine-tuning, avaliação, grounding, RAG, embeddings ou bases de dados de sistemas de inteligência artificial",
            "Reproduzir, distribuir ou vender o serviço ou qualquer parte dele",
            "Publicar ou transmitir conteúdo malicioso, difamatório ou ilegal",
            "Utilizar a plataforma para substituir o aconselhamento de um contabilista certificado (TOC/ROC) em decisões de elevado impacto",
          ]}
        />
        <Nota tipo="aviso">
          O uso indevido pode resultar na suspensão imediata do acesso, sem direito a reembolso
          pelo período não utilizado.
        </Nota>
      </Section>

      {/* 5 */}
      <Section id="propriedade-intelectual" title="Propriedade intelectual">
        <p>
          Salvo indicação expressa em contrário, o software, arquitetura, motores de cálculo,
          seleção e organização das bases de dados, banco de perguntas, explicações, textos,
          design, identidade visual, marca, logótipo, ícones e demais materiais originais do
          Recibo Certo são propriedade exclusiva do respetivo titular ou dos seus licenciadores.
          Todos os direitos não concedidos expressamente ficam reservados.
        </p>

        <Sub title="Licença limitada de utilização">
          <p>
            O acesso ao site concede apenas uma autorização pessoal, limitada, revogável,
            não exclusiva e intransmissível para interagir com a interface normal e obter
            cálculos para uso próprio. O acesso público ao resultado de uma página ou de uma
            API não concede licença sobre o código, a compilação, o método, o conteúdo ou a marca.
          </p>
          <ListaCheck
            items={[
              "Utilizar a interface para cálculos pessoais e profissionais próprios",
              "Exportar os dados que o próprio utilizador introduziu",
              "Partilhar uma ligação para uma página pública do Recibo Certo",
              "Citar uma estimativa pontual, em extensão razoável, identificando claramente a fonte",
            ]}
          />
        </Sub>

        <Sub title="Reserva expressa para inteligência artificial e prospeção de dados">
          <p>
            Para efeitos do artigo 4.º, n.º 3, da Diretiva (UE) 2019/790 e da legislação
            aplicável que a transpõe, o titular reserva expressamente os direitos de reprodução
            e extração para prospeção de textos e dados. Esta reserva é igualmente declarada
            através do ficheiro <code>/.well-known/tdmrep.json</code>, do cabeçalho HTTP
            <code> tdm-reservation: 1</code>, de metadados HTML e do ficheiro robots.txt.
          </p>
          <Lista
            items={[
              "Não é autorizado usar conteúdo ou saídas para treino, fine-tuning, distilação, avaliação ou melhoria de modelos de IA",
              "Não é autorizado criar embeddings, índices vetoriais, conjuntos de dados, sistemas RAG ou cópias pesquisáveis do conteúdo",
              "Não é autorizado extrair em massa perguntas, respostas, explicações, guias, interfaces, resultados ou lógica dos motores",
              "Não é autorizado fornecer o conteúdo a terceiros para qualquer uma destas finalidades",
              "Qualquer licença para prospeção de dados ou IA exige autorização prévia, específica e escrita",
            ]}
          />
          <Nota tipo="aviso">
            Instruções técnicas não transformam conteúdo público em segredo e podem ser
            desrespeitadas por agentes maliciosos. Servem para tornar a reserva inequívoca,
            apoiar bloqueios técnicos e preservar prova; não constituem uma garantia absoluta
            contra cópia.
          </Nota>
        </Sub>

        <Sub title="Código, banco de dados e obras derivadas">
          <Lista
            items={[
              "É proibido copiar, adaptar, traduzir, descompilar, reconstruir ou criar obras derivadas do código, design ou conteúdo",
              "É proibido replicar a seleção, estrutura ou investimento substancial do banco de perguntas e das bases compiladas",
              "É proibido disponibilizar um serviço concorrente que reproduza elementos protegidos do Recibo Certo",
              "É proibido remover avisos de autoria, marcas, identificadores de proveniência ou medidas de proteção",
              "É proibido usar a marca Recibo Certo ou elementos confundíveis sem autorização",
            ]}
          />
        </Sub>

        <p className="mt-3">
          A legislação, os atos oficiais e os factos fiscais subjacentes não são apropriados
          pelo Recibo Certo. Componentes de terceiros mantêm as respetivas licenças. A proteção
          incide sobre as criações originais e, quando aplicável, sobre a seleção, organização,
          validação, explicação e investimento na compilação e manutenção dos dados.
        </p>
      </Section>

      {/* 6 */}
      <Section id="responsabilidade" title="Limitação de responsabilidade">
        <Nota tipo="aviso">
          O Recibo Certo é uma ferramenta informativa. Os resultados são estimativas e não
          constituem declarações fiscais oficiais nem aconselhamento jurídico ou contabilístico.
        </Nota>
        <p>
          Na máxima extensão permitida pela lei aplicável, o Recibo Certo não se responsabiliza por:
        </p>
        <Lista
          items={[
            "Erros ou omissões nos cálculos resultantes de dados introduzidos incorretamente pelo utilizador",
            "Decisões financeiras tomadas com base exclusiva nos resultados da plataforma",
            "Diferenças entre os valores calculados e os valores liquidados pela AT",
            "Alterações legislativas supervenientes não refletidas na plataforma",
            "Perdas de dados armazenados localmente por limpeza do browser ou falha de hardware",
            "Interrupções temporárias do serviço por manutenção ou causas de força maior",
          ]}
        />
        <Sub title="Responsabilidade máxima">
          <p>
            Em caso de responsabilidade contratual demonstrável (plano Plus), a nossa
            responsabilidade máxima limita-se ao valor pago nos 12 meses anteriores ao
            facto gerador da responsabilidade.
          </p>
        </Sub>
        <p className="mt-3">
          Nada nesta cláusula exclui ou limita a responsabilidade por danos causados com dolo
          ou culpa grave, nem a responsabilidade que não possa ser excluída ao abrigo da
          legislação de proteção do consumidor.
        </p>
      </Section>

      {/* 7 */}
      <Section id="dados-fiscais" title="Dados fiscais — aviso importante">
        <p>
          Os parâmetros fiscais utilizados pelo Recibo Certo (taxas de retenção na fonte,
          contribuições para a Segurança Social, limiares de IVA, escalões de IRS) são
          verificados anualmente com base no Orçamento do Estado e na legislação publicada
          em Diário da República.
        </p>
        <ListaCheck
          items={[
            "Cada parâmetro fiscal inclui fonte legal e data de verificação",
            "Os dados são monitorizados automaticamente para detetar alterações",
            "A versão atual aplica-se ao ano fiscal indicado na plataforma",
          ]}
        />
        <Nota tipo="aviso">
          Os cálculos são estimativas. A liquidação final do IRS depende da totalidade dos
          rendimentos, deduções específicas, benefícios fiscais e outros fatores individuais
          que apenas o teu contabilista ou a declaração oficial de IRS podem apurar com exatidão.
          Verifica sempre com a AT (Portal das Finanças) ou com um Técnico Oficial de Contas
          (TOC) antes de tomar decisões financeiras relevantes.
        </Nota>
      </Section>

      {/* 8 */}
      <Section id="disponibilidade" title="Disponibilidade do serviço">
        <p>
          O Recibo Certo é disponibilizado numa base de "tal como está" (<em>as-is</em>) e
          "conforme disponível" (<em>as-available</em>). Não garantimos disponibilidade
          ininterrupta, embora nos esforcemos por manter um nível de serviço elevado.
        </p>
        <Lista
          items={[
            "Manutenção programada: anunciada com pelo menos 24 horas de antecedência (plano Plus)",
            "Manutenção de emergência: pode ocorrer sem aviso prévio para resolver problemas críticos",
            "Dados locais (plano gratuito): acessíveis mesmo sem ligação à internet (após carregamento inicial)",
          ]}
        />
        <p className="mt-3">
          Não garantimos a disponibilidade de funcionalidades específicas em versões futuras
          do serviço.
        </p>
      </Section>

      {/* 9 */}
      <Section id="alteracoes-servico" title="Alterações ao serviço e aos termos">
        <Sub title="Alterações ao serviço">
          <p>
            Podemos adicionar, modificar ou remover funcionalidades a qualquer momento.
            Para alterações significativas que afetem negativamente utilizadores Plus,
            daremos aviso prévio de 30 dias.
          </p>
        </Sub>
        <Sub title="Alterações a estes termos">
          <p>
            Podemos atualizar estes Termos de Utilização. Quando o fizermos:
          </p>
          <Lista
            items={[
              "Atualizaremos a data \"Última atualização\" no topo desta página",
              "Notificaremos utilizadores Plus por email com 15 dias de antecedência para alterações materiais",
              "A utilização continuada do serviço após a data de entrada em vigor constitui aceitação dos novos termos",
            ]}
          />
        </Sub>
      </Section>

      {/* 10 */}
      <Section id="rescisao" title="Rescisão">
        <Sub title="Rescisão pelo utilizador">
          <p>
            Podes deixar de utilizar o Recibo Certo a qualquer momento. Para contas Plus, podes
            cancelar a subscrição e solicitar a eliminação da conta enviando um email para{" "}
            <a
              href={mailtoApoio()}
              className="font-medium text-brand hover:underline dark:text-brand-mint"
            >
              {EMAIL_APOIO}
            </a>
            .
          </p>
        </Sub>
        <Sub title="Rescisão por nós">
          <p>
            Podemos suspender ou encerrar o teu acesso se:
          </p>
          <Lista
            items={[
              "Violares estes Termos de Utilização de forma grave ou reiterada",
              "Utilizares a plataforma para atividades ilegais",
              "O serviço for encerrado (com aviso prévio de 90 dias para utilizadores Plus)",
            ]}
          />
        </Sub>
        <p className="mt-3">
          Em caso de encerramento do serviço Plus, daremos o aviso acima, permitiremos a exportação
          dos dados e reembolsaremos aos subscritores mensais o valor proporcional do período pago
          não utilizado, sem prejuízo dos restantes direitos obrigatórios aplicáveis.
        </p>
      </Section>

      {/* 11 */}
      <Section id="legislacao" title="Legislação aplicável e resolução de litígios">
        <p>
          Estes Termos de Utilização são regidos pela legislação portuguesa. Para qualquer
          litígio decorrente da utilização do Recibo Certo, é competente o tribunal da comarca
          de Lisboa, sem prejuízo de foro imperativo do consumidor.
        </p>
        <Sub title="Resolução alternativa de litígios">
          <p>
            Para litígios de consumo, tens o direito de recorrer a entidades de resolução
            alternativa de litígios (RAL). Em Portugal, podes contactar o{" "}
            <strong className="text-stone-700 dark:text-stone-200">
              Centro de Arbitragem de Conflitos de Consumo de Lisboa (CACCL)
            </strong>{" "}
            ou consultar a{" "}
            <a
              href="https://consumer-redress.ec.europa.eu/dispute-resolution-bodies"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline dark:text-brand-mint"
            >
              lista europeia de entidades de resolução de litígios
            </a>
            .
          </p>
        </Sub>
        <Nota tipo="info">
          Como consumidor com residência na União Europeia, beneficias da proteção das
          leis de defesa do consumidor do teu país de residência, independentemente
          do foro aqui previsto.
        </Nota>
      </Section>

      {/* 12 */}
      <Section id="contacto" title="Contacto">
        <p>
          Para questões sobre estes termos, dúvidas de serviço ou reclamações, contacta-nos:
        </p>
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Recibo Certo</p>
          <a
            href={mailtoApoio()}
            className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark dark:text-brand-mint"
          >
            {EMAIL_APOIO}
          </a>
          <p className="mt-2 text-xs text-stone-400">
            Prazo de resposta: até 10 dias úteis para questões gerais, até 30 dias para pedidos RGPD.
          </p>
        </div>
      </Section>
    </LegalPage>
  );
}
