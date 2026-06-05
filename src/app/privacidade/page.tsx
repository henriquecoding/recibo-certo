import type { Metadata } from "next";
import LegalPage, {
  Section, Sub, Nota, Lista, ListaCheck, Tabela,
} from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade — Proteção de Dados RGPD",
  description:
    "Como o ReciboCerto recolhe, trata e protege os teus dados pessoais. Conformidade com o RGPD (Regulamento Geral sobre a Proteção de Dados) — Portugal.",
  alternates: { canonical: "/privacidade" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Privacidade — ReciboCerto",
    description:
      "Proteção de dados RGPD. O ReciboCerto não vende dados, não utiliza publicidade e armazena os teus recibos localmente no teu dispositivo.",
    url: "https://recibocerto.pt/privacidade",
    type: "website",
  },
};

const TOC = [
  { id: "responsavel", label: "Responsável pelo tratamento" },
  { id: "dados-recolhidos", label: "Dados que recolhemos" },
  { id: "finalidade", label: "Finalidade e base legal" },
  { id: "armazenamento-local", label: "Armazenamento local" },
  { id: "conservacao", label: "Conservação dos dados" },
  { id: "subprocessadores", label: "Subprocessadores" },
  { id: "direitos", label: "Os teus direitos (RGPD)" },
  { id: "seguranca", label: "Segurança" },
  { id: "menores", label: "Menores de idade" },
  { id: "alteracoes", label: "Alterações a esta política" },
  { id: "contacto", label: "Contacto" },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      subtitle="O ReciboCerto foi concebido com a privacidade como princípio central. Não vendemos dados, não exibimos publicidade e os teus recibos ficam no teu dispositivo — por defeito."
      lastUpdated="Janeiro de 2026"
      toc={TOC}
    >
      {/* 1 */}
      <Section id="responsavel" title="Responsável pelo tratamento">
        <p>
          O responsável pelo tratamento dos dados pessoais recolhidos através de{" "}
          <strong className="text-stone-700 dark:text-stone-200">recibocerto.pt</strong> é a
          plataforma ReciboCerto, contactável através do endereço{" "}
          <a
            href="mailto:recibocerto.pt@gmail.com"
            className="font-medium text-brand underline-offset-2 hover:underline dark:text-brand-mint"
          >
            recibocerto.pt@gmail.com
          </a>
          .
        </p>
        <p>
          Esta política aplica-se a todos os utilizadores do site recibocerto.pt, da calculadora
          de recibos verdes, do simulador de IRS, do comparador de regimes fiscais e de todos os
          serviços associados, independentemente do dispositivo ou browser utilizado.
        </p>
      </Section>

      {/* 2 */}
      <Section id="dados-recolhidos" title="Dados que recolhemos">
        <Nota tipo="info">
          O ReciboCerto recolhe o mínimo de dados necessário para funcionar. No plano gratuito,
          nenhum dado pessoal é enviado para os nossos servidores.
        </Nota>

        <Sub title="Plano gratuito — sem conta">
          <p>
            No plano gratuito não é necessário criar conta. Todos os dados (recibos, configurações,
            preferência de tema) são armazenados exclusivamente no armazenamento local do teu browser
            (localStorage). O ReciboCerto não transmite esses dados para nenhum servidor.
          </p>
          <Lista
            items={[
              "Dados dos recibos introduzidos na calculadora (valor, cliente, atividade, etc.)",
              "Preferência de tema claro/escuro",
              "Histórico de cálculos na sessão atual",
            ]}
          />
        </Sub>

        <Sub title="Lista de espera Pro">
          <p>
            Se submeteres o teu email no formulário de lista de espera para o plano Pro, recolhemos:
          </p>
          <Lista
            items={[
              "Endereço de email (obrigatório)",
              "Origem da inscrição — página de onde submeteste o formulário (landing, preços ou dashboard)",
              "Data e hora da inscrição",
            ]}
          />
        </Sub>

        <Sub title="Conta Pro (quando disponível)">
          <p>
            Quando o plano Pro for lançado, e se criares conta, recolheremos adicionalmente:
          </p>
          <Lista
            items={[
              "Endereço de email e hash da palavra-passe (nunca a palavra-passe em claro)",
              "Dados dos recibos sincronizados na nuvem",
              "Data e hora de criação da conta",
              "Endereço IP registado no momento do registo (logs de infraestrutura)",
            ]}
          />
        </Sub>

        <Sub title="Dados técnicos automáticos">
          <p>
            Como qualquer serviço web, os servidores de infraestrutura (Vercel) registam
            automaticamente:
          </p>
          <Lista
            items={[
              "Endereço IP do pedido HTTP",
              "Browser e sistema operativo (user-agent)",
              "URL acedido e código de resposta HTTP",
              "Data e hora do pedido",
            ]}
          />
          <p className="mt-3">
            Estes logs são geridos pela Vercel Inc. com retenção máxima de 30 dias e servem
            exclusivamente para fins operacionais e de segurança.
          </p>
        </Sub>
      </Section>

      {/* 3 */}
      <Section id="finalidade" title="Finalidade e base legal">
        <p>
          Tratamos os dados pessoais apenas para as finalidades descritas abaixo e com a base
          legal correspondente ao abrigo do Regulamento (UE) 2016/679 (RGPD):
        </p>
        <Tabela
          colunas={["Finalidade", "Dados utilizados", "Base legal"]}
          linhas={[
            [
              "Prestar o serviço de cálculo",
              "Dados dos recibos (localStorage)",
              "Execução de contrato / interesse legítimo",
            ],
            [
              "Notificar o lançamento do plano Pro",
              "Email da lista de espera",
              "Consentimento (art.º 6.º n.º 1 a)",
            ],
            [
              "Autenticação e gestão de conta Pro",
              "Email, hash de palavra-passe",
              "Execução de contrato (art.º 6.º n.º 1 b)",
            ],
            [
              "Segurança e prevenção de fraude",
              "Logs de infraestrutura, IP",
              "Interesse legítimo (art.º 6.º n.º 1 f)",
            ],
            [
              "Cumprimento de obrigações legais",
              "Conforme exigido por lei",
              "Obrigação legal (art.º 6.º n.º 1 c)",
            ],
          ]}
        />
        <p className="mt-4">
          Não tratamos dados para fins de publicidade, criação de perfis comerciais ou
          partilha com terceiros para fins de marketing.
        </p>
      </Section>

      {/* 4 */}
      <Section id="armazenamento-local" title="Armazenamento local (localStorage)">
        <Nota tipo="info">
          O localStorage não é um cookie. É uma funcionalidade do browser que guarda dados
          apenas no teu dispositivo, sem nunca os enviar para servidores externos.
        </Nota>
        <p>
          O ReciboCerto utiliza o <strong className="text-stone-700 dark:text-stone-200">localStorage</strong>{" "}
          do teu browser para guardar os dados do plano gratuito. Estes dados:
        </p>
        <ListaCheck
          items={[
            "Ficam exclusivamente no teu dispositivo — nunca são transmitidos",
            "Persistem entre sessões (mesmo que feches o browser)",
            "Podem ser exportados para CSV ou PDF a qualquer momento",
            "São eliminados quando limpas os dados do site no teu browser",
            "Não são acessíveis por outros sites (isolamento de origem)",
          ]}
        />
        <p className="mt-3">
          Para gerir ou eliminar estes dados, acede às definições do teu browser em{" "}
          <em>Privacidade → Dados do site → recibocerto.pt → Limpar</em>.
        </p>
      </Section>

      {/* 5 */}
      <Section id="conservacao" title="Conservação dos dados">
        <Tabela
          colunas={["Tipo de dado", "Período de conservação", "Motivo"]}
          linhas={[
            [
              "Dados de recibos (plano gratuito)",
              "Indefinido — controlo do utilizador",
              "Armazenado localmente no teu browser",
            ],
            [
              "Email da lista de espera",
              "Até cancelamento da inscrição ou lançamento do Pro + 6 meses",
              "Consentimento — podes pedir eliminação a qualquer momento",
            ],
            [
              "Dados da conta Pro",
              "Enquanto a conta estiver ativa + 30 dias após eliminação",
              "Período de recuperação após eliminação acidental",
            ],
            [
              "Logs de infraestrutura",
              "Máximo 30 dias",
              "Segurança operacional (gerido pela Vercel)",
            ],
          ]}
        />
        <p className="mt-4">
          Para sair da lista de espera ou solicitar a eliminação de qualquer dado pessoal,
          envia um email para{" "}
          <a
            href="mailto:recibocerto.pt@gmail.com"
            className="font-medium text-brand hover:underline dark:text-brand-mint"
          >
            recibocerto.pt@gmail.com
          </a>
          .
        </p>
      </Section>

      {/* 6 */}
      <Section id="subprocessadores" title="Subprocessadores">
        <p>
          Para prestar o serviço, recorremos aos seguintes subprocessadores que tratam dados
          pessoais em nosso nome. Todos operam em conformidade com o RGPD:
        </p>
        <Tabela
          colunas={["Fornecedor", "Finalidade", "Localização", "Garantias"]}
          linhas={[
            [
              "Supabase Inc.",
              "Base de dados da conta Pro, autenticação",
              "Irlanda (UE)",
              "Cláusulas contratuais-tipo UE",
            ],
            [
              "Vercel Inc.",
              "Hospedagem do site e funções serverless",
              "UE (Frankfurt)",
              "Acordo de processamento de dados",
            ],
          ]}
        />
        <Nota tipo="aviso">
          O plano gratuito não utiliza Supabase. Os dados dos recibos ficam exclusivamente no
          teu browser e nenhum subprocessador os recebe.
        </Nota>
        <p>
          O ReciboCerto não utiliza Google Analytics, Meta Pixel, ferramentas de heatmap,
          sistemas de publicidade comportamental nem qualquer serviço de rastreamento entre sites.
        </p>
      </Section>

      {/* 7 */}
      <Section id="direitos" title="Os teus direitos (RGPD)">
        <p>
          Ao abrigo do RGPD, tens os seguintes direitos em relação aos teus dados pessoais.
          Podes exercê-los contactando-nos por email a qualquer momento:
        </p>
        <Tabela
          colunas={["Direito", "O que significa"]}
          linhas={[
            [
              "Acesso (art.º 15.º)",
              "Receber uma cópia de todos os dados pessoais que guardamos sobre ti.",
            ],
            [
              "Retificação (art.º 16.º)",
              "Corrigir dados inexatos ou incompletos.",
            ],
            [
              "Eliminação (art.º 17.º)",
              'Solicitar a eliminação dos teus dados ("direito a ser esquecido").',
            ],
            [
              "Portabilidade (art.º 20.º)",
              "Receber os teus dados em formato estruturado e legível por máquina.",
            ],
            [
              "Limitação (art.º 18.º)",
              "Restringir o tratamento dos teus dados em determinadas circunstâncias.",
            ],
            [
              "Oposição (art.º 21.º)",
              "Opor-te ao tratamento baseado em interesse legítimo.",
            ],
            [
              "Retirada do consentimento",
              "Retirar o consentimento a qualquer momento, sem prejudicar tratamentos anteriores.",
            ],
          ]}
        />
        <p className="mt-4">
          Podes também apresentar reclamação à autoridade de controlo competente: a{" "}
          <strong className="text-stone-700 dark:text-stone-200">
            Comissão Nacional de Proteção de Dados (CNPD)
          </strong>
          , Rua de São Bento, n.º 148-3.º, 1200-821 Lisboa —{" "}
          <a
            href="https://www.cnpd.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline dark:text-brand-mint"
          >
            www.cnpd.pt
          </a>
          .
        </p>
      </Section>

      {/* 8 */}
      <Section id="seguranca" title="Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais
          contra acesso não autorizado, perda acidental ou destruição:
        </p>
        <ListaCheck
          items={[
            "Comunicações encriptadas via TLS/HTTPS em todo o site",
            "Palavras-passe armazenadas com hash bcrypt — nunca em claro",
            "Acesso à base de dados restrito por políticas RLS (Row-Level Security) do Supabase",
            "Autenticação multi-fator disponível para contas Pro",
            "Auditoria de segurança automática das dependências (GitHub Actions)",
            "Princípio do mínimo privilégio em todos os acessos de infraestrutura",
          ]}
        />
        <Nota tipo="aviso">
          Nenhum sistema é 100% seguro. Em caso de incidente de segurança que afete os teus
          dados pessoais, notificaremos a CNPD no prazo de 72 horas e os utilizadores afetados
          no prazo razoável de acordo com o RGPD.
        </Nota>
      </Section>

      {/* 9 */}
      <Section id="menores" title="Menores de idade">
        <p>
          O ReciboCerto é uma ferramenta fiscal destinada a trabalhadores independentes. Não
          recolhemos intencionalmente dados pessoais de menores de 16 anos. Se tomares
          conhecimento de que um menor nos forneceu dados sem consentimento parental, contacta-nos
          para procedermos à eliminação imediata.
        </p>
      </Section>

      {/* 10 */}
      <Section id="alteracoes" title="Alterações a esta política">
        <p>
          Podemos atualizar esta política para refletir alterações ao serviço, à legislação
          aplicável ou às nossas práticas de privacidade. Quando o fizermos:
        </p>
        <Lista
          items={[
            'Atualizaremos a data "Última atualização" no topo desta página',
            "Para alterações materiais, notificaremos por email os utilizadores registados",
            "A versão mais recente estará sempre disponível em recibocerto.pt/privacidade",
          ]}
        />
        <p className="mt-3">
          Recomendamos que consultes esta página periodicamente.
        </p>
      </Section>

      {/* 11 */}
      <Section id="contacto" title="Contacto">
        <p>
          Para exerceres os teus direitos RGPD, esclarecer dúvidas ou apresentar reclamações
          relacionadas com a privacidade, contacta-nos:
        </p>
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800/50">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">ReciboCerto</p>
          <a
            href="mailto:recibocerto.pt@gmail.com"
            className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark dark:text-brand-mint"
          >
            recibocerto.pt@gmail.com
          </a>
          <p className="mt-2 text-xs text-stone-400">
            Prazo de resposta: até 30 dias úteis, conforme exigido pelo RGPD.
          </p>
        </div>
      </Section>
    </LegalPage>
  );
}
