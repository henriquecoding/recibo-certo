import type { Metadata } from "next";
import LegalPage, {
  Section, Sub, Nota, Lista, ListaCheck, Tabela,
} from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Cookies — ReciboCerto",
  description:
    "Como o ReciboCerto utiliza cookies e armazenamento local. Plataforma sem tracking, sem publicidade comportamental, dados fiscais apenas no teu dispositivo.",
  alternates: { canonical: "/cookies" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Cookies — ReciboCerto",
    description:
      "ReciboCerto não usa cookies de tracking. Apenas armazenamento local (localStorage) no teu dispositivo para guardar os teus dados fiscais.",
    url: "https://recibocerto.pt/cookies",
    type: "website",
  },
};

const TOC = [
  { id: "o-que-sao", label: "O que são cookies" },
  { id: "como-usamos", label: "Como usamos cookies" },
  { id: "localstorage", label: "localStorage — armazenamento local" },
  { id: "cookies-terceiros", label: "Cookies de terceiros" },
  { id: "cookies-essenciais", label: "Cookies essenciais" },
  { id: "gerir-cookies", label: "Gerir e eliminar cookies" },
  { id: "alteracoes", label: "Alterações a esta política" },
  { id: "contacto", label: "Contacto" },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      subtitle="O ReciboCerto foi desenhado para respeitar a tua privacidade. Não usamos cookies de tracking, não exibimos publicidade e os teus dados fiscais ficam no teu dispositivo."
      lastUpdated="Janeiro de 2026"
      toc={TOC}
    >
      {/* 1 */}
      <Section id="o-que-sao" title="O que são cookies">
        <p>
          Cookies são pequenos ficheiros de texto que um website armazena no teu browser.
          São amplamente utilizados para fazer os websites funcionar, melhorar a experiência
          do utilizador e fornecer informações aos operadores do site.
        </p>
        <p>
          Existem vários tipos de cookies, classificados por origem e duração:
        </p>
        <Tabela
          colunas={["Tipo", "Origem", "Duração", "Finalidade típica"]}
          linhas={[
            [
              "Cookies de sessão",
              "Próprios",
              "Eliminados ao fechar o browser",
              "Manter sessão autenticada",
            ],
            [
              "Cookies persistentes",
              "Próprios",
              "Data de expiração definida",
              "Preferências do utilizador",
            ],
            [
              "Cookies de terceiros",
              "Domínios externos",
              "Variável",
              "Analytics, publicidade, redes sociais",
            ],
          ]}
        />
        <Nota tipo="info">
          O ReciboCerto não utiliza cookies de terceiros para tracking, analytics comportamentais
          nem publicidade. A nossa abordagem é radicalmente minimalista.
        </Nota>
      </Section>

      {/* 2 */}
      <Section id="como-usamos" title="Como o ReciboCerto usa cookies">
        <p>
          O ReciboCerto adota uma abordagem de privacidade em primeiro lugar (
          <em>privacy-first</em>). Ao contrário da maioria dos websites, a nossa plataforma
          foi concebida para funcionar <strong className="text-stone-700 dark:text-stone-200">
          sem cookies de tracking ou analytics</strong>.
        </p>

        <Sub title="Resumo da nossa política de cookies">
          <Tabela
            colunas={["Categoria", "Utilizamos?", "Detalhes"]}
            linhas={[
              [
                "Cookies de autenticação",
                "Sim (apenas Pro)",
                "Cookie de sessão seguro para manter login — eliminado ao sair",
              ],
              [
                "Preferências de tema",
                "Não (localStorage)",
                "Guardado em localStorage, não num cookie",
              ],
              [
                "Google Analytics",
                "Não",
                "Não utilizamos qualquer serviço de analytics",
              ],
              [
                "Meta / Facebook Pixel",
                "Não",
                "Não integramos ferramentas da Meta",
              ],
              [
                "Cookies de publicidade",
                "Não",
                "Sem publicidade comportamental de qualquer tipo",
              ],
              [
                "Cookies de terceiros",
                "Não",
                "Nenhum domínio externo instala cookies via ReciboCerto",
              ],
            ]}
          />
        </Sub>
      </Section>

      {/* 3 */}
      <Section id="localstorage" title="localStorage — armazenamento local">
        <Nota tipo="info">
          O localStorage não é tecnicamente um cookie. É uma API do browser que permite
          armazenar dados diretamente no teu dispositivo, sem os enviar a servidores externos.
          É mais privado do que cookies — só o próprio site pode ler os seus dados.
        </Nota>
        <p>
          O ReciboCerto utiliza o <strong className="text-stone-700 dark:text-stone-200">
          localStorage</strong> do teu browser como mecanismo principal de persistência no
          plano gratuito. Isto significa que os teus dados fiscais ficam exclusivamente no
          teu dispositivo.
        </p>

        <Sub title="O que guardamos em localStorage">
          <Tabela
            colunas={["Chave", "Conteúdo", "Finalidade"]}
            linhas={[
              [
                "recibocerto_recibos",
                "Array JSON com os teus recibos calculados",
                "Histórico de recibos entre sessões",
              ],
              [
                "recibocerto_theme",
                "\"light\" ou \"dark\"",
                "Preferência de tema visual",
              ],
              [
                "recibocerto_config",
                "Configurações da calculadora (atividade, regime, região)",
                "Não repetir configuração em cada visita",
              ],
            ]}
          />
        </Sub>

        <Sub title="Características do localStorage no ReciboCerto">
          <ListaCheck
            items={[
              "Dados armazenados apenas no teu dispositivo — nunca transmitidos para servidores",
              "Isolados por origem — nenhum outro website pode ler os teus dados recibocerto.pt",
              "Persistem entre sessões (mesmo fechando e reabrindo o browser)",
              "Controlados por ti — eliminados quando limpas os dados do site no browser",
              "Não têm data de expiração automática — ficam até os eliminares tu",
            ]}
          />
        </Sub>

        <p className="mt-3">
          Para eliminares os dados do localStorage do ReciboCerto, acede às definições
          do teu browser em <em>Privacidade → Dados do site → recibocerto.pt → Limpar</em>.
        </p>
      </Section>

      {/* 4 */}
      <Section id="cookies-terceiros" title="Cookies de terceiros">
        <p>
          O ReciboCerto não integra serviços de terceiros que instalem cookies no teu browser.
          Especificamente, <strong className="text-stone-700 dark:text-stone-200">não utilizamos</strong>:
        </p>
        <Lista
          items={[
            "Google Analytics, Google Tag Manager ou qualquer produto de analytics da Google",
            "Meta Pixel, SDK do Facebook ou qualquer ferramenta de rastreamento da Meta",
            "Hotjar, Microsoft Clarity, FullStory ou ferramentas de gravação de sessões",
            "Plataformas de publicidade comportamental (DSP, SSP, ad exchanges)",
            "Botões de partilha em redes sociais com tracking embutido",
            "Serviços de comentários externos (Disqus, etc.)",
            "CDNs que instalem cookies (usamos apenas a CDN integrada da Vercel)",
          ]}
        />
        <Nota tipo="info">
          A infraestrutura de hospedagem (Vercel) pode registar tecnicamente um cookie de
          sessão para balanceamento de carga (<code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-700">
          __vercel_live_feedback</code> em previews). Este cookie não contém dados pessoais
          e não é usado para tracking.
        </Nota>
      </Section>

      {/* 5 */}
      <Section id="cookies-essenciais" title="Cookies essenciais (plano Pro)">
        <p>
          Quando o plano Pro for lançado, utilizaremos um número mínimo de cookies
          estritamente necessários para a autenticação:
        </p>
        <Tabela
          colunas={["Cookie", "Duração", "Finalidade"]}
          linhas={[
            [
              "sb-auth-token",
              "Sessão (eliminado ao sair)",
              "Token de autenticação Supabase — necessário para manter sessão Pro",
            ],
            [
              "sb-refresh-token",
              "30 dias (renovável)",
              "Token de renovação de sessão — permite \"lembrar-me\"",
            ],
          ]}
        />
        <p className="mt-3">
          Estes cookies são considerados <strong className="text-stone-700 dark:text-stone-200">
          estritamente necessários</strong> ao funcionamento do serviço autenticado e, por isso,
          não requerem consentimento separado ao abrigo da Diretiva ePrivacy 2002/58/CE.
          Não contêm informações pessoais identificáveis além do identificador de sessão.
        </p>
        <Nota tipo="info">
          No plano gratuito, sem conta, não são instalados quaisquer cookies de autenticação.
        </Nota>
      </Section>

      {/* 6 */}
      <Section id="gerir-cookies" title="Gerir e eliminar cookies">
        <p>
          Tens controlo total sobre os cookies e dados armazenados pelo ReciboCerto no teu
          browser. Podes gerir estas preferências de duas formas:
        </p>

        <Sub title="Nas definições do teu browser">
          <p>
            Todos os browsers modernos permitem ver, gerir e eliminar cookies e dados de sites.
            Consulta as instruções para o teu browser:
          </p>
          <Lista
            items={[
              "Chrome: Definições → Privacidade e segurança → Cookies e outros dados do site",
              "Firefox: Preferências → Privacidade e segurança → Cookies e dados do site",
              "Safari: Preferências → Privacidade → Gerir dados do website",
              "Edge: Definições → Privacidade, pesquisa e serviços → Cookies e dados do site",
            ]}
          />
        </Sub>

        <Sub title="Bloquear todos os cookies">
          <p>
            Podes configurar o teu browser para bloquear todos os cookies. Nota que, no caso
            do ReciboCerto:
          </p>
          <Lista
            items={[
              "Plano gratuito: funciona completamente sem cookies (usamos localStorage, não cookies)",
              "Plano Pro: o login ficará indisponível sem cookies de autenticação",
            ]}
          />
        </Sub>

        <Sub title="Ferramentas de opt-out de terceiros">
          <p>
            Embora o ReciboCerto não use cookies de terceiros, podes instalar extensões
            de bloqueio de tracking como uBlock Origin ou Privacy Badger para uma proteção
            adicional durante a navegação geral na web.
          </p>
        </Sub>

        <Nota tipo="aviso">
          Limpar os dados do site no browser irá eliminar também os dados dos teus recibos
          guardados em localStorage. Exporta os dados em CSV ou PDF antes de o fazeres.
        </Nota>
      </Section>

      {/* 7 */}
      <Section id="alteracoes" title="Alterações a esta política">
        <p>
          Podemos atualizar esta política para refletir alterações ao serviço ou à legislação
          aplicável (Diretiva ePrivacy, RGPD). Quando o fizermos:
        </p>
        <Lista
          items={[
            "Atualizaremos a data \"Última atualização\" no topo desta página",
            "Para alterações materiais, notificaremos por email os utilizadores registados",
            "A versão mais recente estará sempre disponível em recibocerto.pt/cookies",
          ]}
        />
      </Section>

      {/* 8 */}
      <Section id="contacto" title="Contacto">
        <p>
          Para questões sobre cookies, armazenamento local ou sobre como tratamos os teus
          dados, contacta-nos:
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
