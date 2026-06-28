import type { Metadata } from "next";
import LegalPage, {
  Section, Sub, Nota, Lista, ListaCheck, Tabela,
} from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade — Proteção de Dados RGPD",
  description:
    "Como o ReciboCerto recolhe, trata e protege os teus dados pessoais. Conformidade com o RGPD (Regulamento (UE) 2016/679) e a Lei n.º 58/2019 — Portugal. Inclui o tratamento de dados do plano Pro guardados na nuvem.",
  alternates: { canonical: "/privacidade" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Privacidade — ReciboCerto",
    description:
      "Proteção de dados RGPD. No plano gratuito os dados ficam no teu dispositivo; no plano Pro são guardados de forma segura na nuvem (UE), nunca vendidos nem usados para publicidade.",
    url: "https://www.recibocerto.pt/privacidade",
    type: "website",
  },
};

const TOC = [
  { id: "resumo", label: "Resumo em 30 segundos" },
  { id: "responsavel", label: "Responsável pelo tratamento" },
  { id: "dados-recolhidos", label: "Dados que recolhemos" },
  { id: "finalidade", label: "Finalidades e base legal" },
  { id: "armazenamento-local", label: "Plano gratuito: dados locais" },
  { id: "nuvem-pro", label: "Plano Pro: dados na nuvem" },
  { id: "pagamentos", label: "Pagamentos (Stripe)" },
  { id: "comunicacoes", label: "Comunicações por email" },
  { id: "cookies", label: "Cookies e tecnologias" },
  { id: "subprocessadores", label: "Subprocessadores" },
  { id: "transferencias", label: "Transferências internacionais" },
  { id: "conservacao", label: "Conservação dos dados" },
  { id: "decisoes-automatizadas", label: "Decisões automatizadas" },
  { id: "direitos", label: "Os teus direitos (RGPD)" },
  { id: "seguranca", label: "Segurança" },
  { id: "violacoes", label: "Violações de dados" },
  { id: "menores", label: "Menores de idade" },
  { id: "alteracoes", label: "Alterações a esta política" },
  { id: "contacto", label: "Contacto e reclamações" },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      subtitle="O ReciboCerto trata a privacidade como princípio central. No plano gratuito, os teus dados ficam no teu dispositivo. No plano Pro, são guardados de forma segura na nuvem (servidores na União Europeia) para sincronização entre dispositivos. Em nenhum caso vendemos dados ou exibimos publicidade."
      lastUpdated="Junho de 2026"
      toc={TOC}
    >
      {/* 0 — Resumo */}
      <Section id="resumo" title="Resumo em 30 segundos">
        <ListaCheck
          items={[
            "Plano gratuito: não precisas de conta e os dados ficam só no teu browser (localStorage).",
            "Plano Pro: crias conta e os teus dados (recibos, simulações, preferências) são guardados na nuvem, em servidores na UE, para sincronizar entre dispositivos.",
            "Nunca vendemos os teus dados nem usamos publicidade comportamental ou rastreamento entre sites.",
            "Os pagamentos são processados pela Stripe — nunca vemos nem guardamos o número do teu cartão.",
            "Podes exportar ou eliminar os teus dados a qualquer momento, e exercer todos os direitos do RGPD.",
          ]}
        />
        <Nota tipo="info">
          Este resumo não substitui a política completa abaixo. Em caso de dúvida, prevalece o texto integral.
        </Nota>
      </Section>

      {/* 1 — Responsável */}
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
          Esta política aplica-se a todos os utilizadores do site e dos serviços ReciboCerto —
          calculadora de recibos verdes, simulador de IRS, simulador de recibo de vencimento,
          simulador de empresa, comparador de regimes, guias fiscais e área de cliente (Dashboard) —
          independentemente do dispositivo ou browser utilizado, e tanto no plano gratuito como no
          plano Pro.
        </p>
        <p>
          O tratamento rege-se pelo Regulamento (UE) 2016/679 (RGPD) e pela Lei n.º 58/2019, de 8 de
          agosto, que assegura a execução do RGPD na ordem jurídica portuguesa.
        </p>
      </Section>

      {/* 2 — Dados recolhidos */}
      <Section id="dados-recolhidos" title="Dados que recolhemos">
        <Nota tipo="info">
          Recolhemos o mínimo de dados necessário para o serviço funcionar. Aquilo que recolhemos
          depende de usares o plano gratuito (sem conta) ou o plano Pro (com conta).
        </Nota>

        <Sub title="Plano gratuito — sem conta">
          <p>
            No plano gratuito não é necessário criar conta. Os dados ficam exclusivamente no
            armazenamento local do teu browser (localStorage) e não são transmitidos para os nossos
            servidores:
          </p>
          <Lista
            items={[
              "Dados que introduzes nas calculadoras e simuladores (valores, atividade, cliente, agregado familiar, deduções, etc.)",
              "Preferência de tema (claro/escuro) e outras preferências de interface",
              "Marcadores de guias e progresso de funcionalidades guardado localmente",
            ]}
          />
        </Sub>

        <Sub title="Conta e plano Pro">
          <p>
            Para usar o plano Pro crias uma conta. Recolhemos e tratamos, conforme aplicável:
          </p>
          <Lista
            items={[
              "Endereço de email e dados de autenticação (a palavra-passe é gerida de forma segura pelo nosso fornecedor de autenticação; nunca a guardamos em texto simples)",
              "Recibos e cálculos sincronizados na nuvem (valores, datas, atividade, retenções)",
              "Cenários de recibo de vencimento e preferências fiscais (regime, agregado, deduções)",
              "Estado da subscrição (plano, início/fim, identificador de cliente de pagamento)",
              "Alertas e lembretes que configuras (ex.: prazos de Segurança Social)",
              "Data e hora de criação da conta e de última atividade relevante",
            ]}
          />
        </Sub>

        <Sub title="Dados que NÃO recolhemos">
          <ListaCheck
            items={[
              "Não guardamos números de cartão de crédito/débito (são tratados pela Stripe).",
              "Não recolhemos dados de geolocalização precisa.",
              "Não criamos perfis publicitários nem partilhamos dados com redes de anúncios.",
            ]}
          />
        </Sub>

        <Sub title="Dados técnicos automáticos">
          <p>
            Como qualquer serviço web, os servidores de infraestrutura registam automaticamente, por
            motivos operacionais e de segurança:
          </p>
          <Lista
            items={[
              "Endereço IP do pedido HTTP",
              "Browser e sistema operativo (user-agent)",
              "URL acedido, referência e código de resposta HTTP",
              "Data e hora do pedido",
            ]}
          />
        </Sub>
      </Section>

      {/* 3 — Finalidade e base legal */}
      <Section id="finalidade" title="Finalidades e base legal">
        <p>
          Tratamos dados pessoais apenas para as finalidades abaixo, cada uma com a respetiva base
          legal nos termos do artigo 6.º do RGPD:
        </p>
        <Tabela
          colunas={["Finalidade", "Dados utilizados", "Base legal"]}
          linhas={[
            ["Prestar as calculadoras e simuladores", "Dados introduzidos (locais)", "Execução de contrato / interesse legítimo (art.º 6.º/1 b) e f)"],
            ["Criar e gerir a conta Pro", "Email, autenticação", "Execução de contrato (art.º 6.º/1 b)"],
            ["Guardar e sincronizar os teus dados na nuvem (Pro)", "Recibos, simulações, preferências", "Execução de contrato (art.º 6.º/1 b)"],
            ["Processar pagamentos da subscrição", "Email, estado da subscrição", "Execução de contrato (art.º 6.º/1 b)"],
            ["Enviar alertas e emails essenciais do serviço", "Email, preferências de alerta", "Execução de contrato / consentimento (art.º 6.º/1 b) e a)"],
            ["Segurança e prevenção de fraude", "Logs de infraestrutura, IP", "Interesse legítimo (art.º 6.º/1 f)"],
            ["Cumprir obrigações legais e fiscais", "Conforme exigido por lei", "Obrigação legal (art.º 6.º/1 c)"],
          ]}
        />
        <p className="mt-4">
          Não tratamos dados para publicidade, criação de perfis comerciais ou partilha com terceiros
          para fins de marketing. Quando a base legal é o consentimento, podes retirá-lo a qualquer
          momento, sem afetar a licitude do tratamento anterior.
        </p>
      </Section>

      {/* 4 — Local */}
      <Section id="armazenamento-local" title="Plano gratuito: dados no teu dispositivo">
        <Nota tipo="info">
          O localStorage não é um cookie. É uma funcionalidade do browser que guarda dados apenas no
          teu dispositivo, sem nunca os enviar para servidores externos.
        </Nota>
        <p>
          No plano gratuito, o ReciboCerto utiliza o{" "}
          <strong className="text-stone-700 dark:text-stone-200">localStorage</strong> do teu browser.
          Estes dados:
        </p>
        <ListaCheck
          items={[
            "Ficam exclusivamente no teu dispositivo — nunca são transmitidos aos nossos servidores",
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

      {/* 5 — Nuvem Pro */}
      <Section id="nuvem-pro" title="Plano Pro: dados guardados na nuvem">
        <p>
          No plano Pro, para permitir o acesso a partir de vários dispositivos e a salvaguarda dos
          teus dados, guardamos as tuas informações numa base de dados gerida pela{" "}
          <strong className="text-stone-700 dark:text-stone-200">Supabase</strong>, alojada em
          servidores na União Europeia. Concretamente, podem ser guardados:
        </p>
        <Lista
          items={[
            "Perfil e preferências fiscais (regime, agregado, deduções habituais)",
            "Recibos verdes e respetivos cálculos",
            "Cenários de recibo de vencimento",
            "Estado da subscrição (plano e validade)",
            "Alertas configurados (ex.: prazos de Segurança Social)",
          ]}
        />
        <ListaCheck
          items={[
            "O acesso é restrito à tua conta através de políticas de segurança ao nível da linha (Row-Level Security): só tu acedes aos teus dados.",
            "Os dados são transmitidos sempre por ligação encriptada (TLS) e guardados de forma encriptada em repouso.",
            "Podes exportar todos os teus dados ou eliminar a conta a qualquer momento — a eliminação remove os dados associados (sujeita a períodos legais de conservação, quando aplicável).",
          ]}
        />
        <Nota tipo="info">
          Mesmo no plano Pro, continuas a poder usar e exportar os dados localmente. A sincronização
          na nuvem existe para tua conveniência e segurança, não para exploração comercial dos dados.
        </Nota>
      </Section>

      {/* 6 — Pagamentos */}
      <Section id="pagamentos" title="Pagamentos (Stripe)">
        <p>
          Os pagamentos da subscrição Pro são processados pela{" "}
          <strong className="text-stone-700 dark:text-stone-200">Stripe</strong>, um processador de
          pagamentos certificado PCI-DSS de nível 1. Ao subscreveres:
        </p>
        <ListaCheck
          items={[
            "Os dados do cartão são introduzidos e tratados diretamente pela Stripe — o ReciboCerto nunca tem acesso ao número completo do cartão.",
            "Guardamos apenas o necessário para gerir a tua subscrição: identificador de cliente Stripe, estado e datas da subscrição.",
            "A faturação e os recibos de pagamento são geridos através da Stripe.",
          ]}
        />
        <p className="mt-3">
          O tratamento de dados pela Stripe rege-se pela respetiva política de privacidade. A base
          legal é a execução do contrato de subscrição (art.º 6.º/1 b) do RGPD).
        </p>
      </Section>

      {/* 7 — Comunicações */}
      <Section id="comunicacoes" title="Comunicações por email">
        <p>
          Utilizamos a <strong className="text-stone-700 dark:text-stone-200">Resend</strong> para
          enviar emails relacionados com o serviço. Distinguimos:
        </p>
        <Lista
          items={[
            "Emails essenciais (transacionais): confirmação de conta, recuperação de palavra-passe, recibos de pagamento e alertas que configuraste (ex.: prazos). Baseiam-se na execução do contrato.",
            "Emails opcionais (novidades/marketing): só os enviamos com o teu consentimento e podes cancelar a subscrição a qualquer momento, através da ligação no rodapé do email.",
          ]}
        />
        <p className="mt-3">
          Não cedemos o teu email a terceiros para fins de marketing.
        </p>
      </Section>

      {/* 8 — Cookies */}
      <Section id="cookies" title="Cookies e tecnologias semelhantes">
        <p>
          Usamos um número mínimo de cookies e de tecnologias de armazenamento. Não usamos cookies de
          publicidade nem de rastreamento entre sites. Em síntese:
        </p>
        <Lista
          items={[
            "Cookies estritamente necessários: sessão e autenticação (plano Pro), preferências essenciais e segurança. Não exigem consentimento.",
            "localStorage: preferências e dados do plano gratuito guardados no teu dispositivo.",
            "Não utilizamos Google Analytics, Meta Pixel, heatmaps nem publicidade comportamental.",
          ]}
        />
        <p className="mt-3">
          Para mais detalhes, consulta a nossa{" "}
          <a href="/cookies" className="font-medium text-brand hover:underline dark:text-brand-mint">
            Política de Cookies
          </a>
          , onde podes também gerir as tuas preferências.
        </p>
      </Section>

      {/* 9 — Subprocessadores */}
      <Section id="subprocessadores" title="Subprocessadores">
        <p>
          Para prestar o serviço recorremos aos subprocessadores abaixo, que tratam dados pessoais em
          nosso nome ao abrigo de acordos de tratamento de dados conformes com o RGPD:
        </p>
        <Tabela
          colunas={["Fornecedor", "Finalidade", "Localização", "Garantias"]}
          linhas={[
            ["Supabase", "Base de dados e autenticação do plano Pro", "União Europeia", "Acordo de tratamento + cláusulas contratuais-tipo"],
            ["Vercel Inc.", "Alojamento do site e funções serverless", "União Europeia (Frankfurt)", "Acordo de tratamento de dados"],
            ["Stripe", "Processamento de pagamentos da subscrição", "UE / EUA", "PCI-DSS nível 1 + cláusulas contratuais-tipo"],
            ["Resend", "Envio de emails transacionais e alertas", "EUA", "Acordo de tratamento + cláusulas contratuais-tipo"],
          ]}
        />
        <Nota tipo="aviso">
          O plano gratuito não envia dados para a Supabase: os teus dados ficam exclusivamente no teu
          browser. Os subprocessadores de pagamento e email só tratam dados quando crias conta,
          subscreves ou ativas alertas/emails.
        </Nota>
      </Section>

      {/* 10 — Transferências internacionais */}
      <Section id="transferencias" title="Transferências internacionais de dados">
        <p>
          Sempre que possível, os dados são tratados e armazenados dentro do Espaço Económico Europeu.
          A base de dados do plano Pro (Supabase) e o alojamento (Vercel) estão na União Europeia.
        </p>
        <p>
          Alguns subprocessadores (como a Stripe e a Resend) podem tratar dados fora do EEE,
          nomeadamente nos Estados Unidos. Nesses casos, as transferências são protegidas por
          mecanismos reconhecidos pelo RGPD — em particular as{" "}
          <strong className="text-stone-700 dark:text-stone-200">Cláusulas Contratuais-Tipo</strong>{" "}
          da Comissão Europeia e, quando aplicável, o EU-US Data Privacy Framework — garantindo um
          nível de proteção adequado.
        </p>
      </Section>

      {/* 11 — Conservação */}
      <Section id="conservacao" title="Conservação dos dados">
        <Tabela
          colunas={["Tipo de dado", "Período de conservação", "Motivo"]}
          linhas={[
            ["Dados do plano gratuito (localStorage)", "Indefinido — sob o teu controlo", "Armazenados localmente no teu browser"],
            ["Dados da conta e da nuvem (Pro)", "Enquanto a conta estiver ativa", "Prestação do serviço"],
            ["Após eliminação da conta", "Até 30 dias", "Período de recuperação contra eliminação acidental"],
            ["Dados de faturação/subscrição", "Até 10 anos", "Obrigações legais e fiscais (faturação)"],
            ["Email de comunicações opcionais", "Até cancelares a subscrição", "Consentimento"],
            ["Logs de infraestrutura", "Máximo 30 dias", "Segurança operacional"],
          ]}
        />
        <p className="mt-4">
          Para exportar ou eliminar os teus dados, usa as opções na tua conta ou envia um email para{" "}
          <a href="mailto:recibocerto.pt@gmail.com" className="font-medium text-brand hover:underline dark:text-brand-mint">
            recibocerto.pt@gmail.com
          </a>
          .
        </p>
      </Section>

      {/* 12 — Decisões automatizadas */}
      <Section id="decisoes-automatizadas" title="Decisões automatizadas e definição de perfis">
        <p>
          As calculadoras e simuladores produzem estimativas a partir dos valores que introduzes e da
          legislação fiscal em vigor. Trata-se de ferramentas de apoio: não tomamos decisões
          automatizadas com efeitos jurídicos sobre ti nem fazemos definição de perfis (profiling) na
          aceção do artigo 22.º do RGPD. As estimativas não substituem o aconselhamento de um
          contabilista certificado nem o apuramento oficial da Autoridade Tributária.
        </p>
      </Section>

      {/* 13 — Direitos */}
      <Section id="direitos" title="Os teus direitos (RGPD)">
        <p>
          Ao abrigo do RGPD, tens os seguintes direitos sobre os teus dados pessoais. Podes exercê-los
          contactando-nos por email; respondemos no prazo máximo de um mês:
        </p>
        <Tabela
          colunas={["Direito", "O que significa"]}
          linhas={[
            ["Acesso (art.º 15.º)", "Receber uma cópia dos dados pessoais que guardamos sobre ti."],
            ["Retificação (art.º 16.º)", "Corrigir dados inexatos ou incompletos."],
            ["Eliminação (art.º 17.º)", 'Solicitar a eliminação dos teus dados ("direito a ser esquecido").'],
            ["Portabilidade (art.º 20.º)", "Receber os teus dados em formato estruturado e legível por máquina (ex.: CSV)."],
            ["Limitação (art.º 18.º)", "Restringir o tratamento em determinadas circunstâncias."],
            ["Oposição (art.º 21.º)", "Opor-te ao tratamento baseado em interesse legítimo."],
            ["Retirada do consentimento", "Retirar o consentimento a qualquer momento, sem afetar tratamentos anteriores."],
          ]}
        />
        <p className="mt-4">
          Podes também apresentar reclamação à autoridade de controlo competente: a{" "}
          <strong className="text-stone-700 dark:text-stone-200">Comissão Nacional de Proteção de Dados (CNPD)</strong>,
          Av. D. Carlos I, 134-1.º, 1200-651 Lisboa —{" "}
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline dark:text-brand-mint">
            www.cnpd.pt
          </a>
          .
        </p>
      </Section>

      {/* 14 — Segurança */}
      <Section id="seguranca" title="Segurança">
        <p>
          Adotamos medidas técnicas e organizativas adequadas ao risco para proteger os dados pessoais
          contra acesso não autorizado, perda acidental ou destruição:
        </p>
        <ListaCheck
          items={[
            "Comunicações encriptadas via TLS/HTTPS em todo o site",
            "Dados da nuvem encriptados em repouso e isolados por conta com Row-Level Security",
            "Palavras-passe geridas com algoritmos de hash seguros — nunca guardadas em texto simples",
            "Autenticação multifator disponível para contas",
            "Princípio do mínimo privilégio nos acessos de infraestrutura",
            "Auditoria de segurança automática das dependências (CI/GitHub Actions)",
          ]}
        />
      </Section>

      {/* 15 — Violações */}
      <Section id="violacoes" title="Violações de dados">
        <p>
          Nenhum sistema é 100% seguro. Em caso de violação de dados pessoais que seja suscetível de
          resultar num risco para os teus direitos e liberdades, notificaremos a CNPD no prazo de{" "}
          <strong className="text-stone-700 dark:text-stone-200">72 horas</strong> após termos
          conhecimento (art.º 33.º do RGPD) e, quando o risco for elevado, comunicar-te-emos a
          violação sem demora injustificada (art.º 34.º do RGPD).
        </p>
      </Section>

      {/* 16 — Menores */}
      <Section id="menores" title="Menores de idade">
        <p>
          O ReciboCerto é uma ferramenta fiscal destinada a adultos. Não recolhemos intencionalmente
          dados de menores de 16 anos. Se tomares conhecimento de que um menor nos forneceu dados sem
          consentimento dos titulares das responsabilidades parentais, contacta-nos para procedermos à
          eliminação imediata.
        </p>
      </Section>

      {/* 17 — Alterações */}
      <Section id="alteracoes" title="Alterações a esta política">
        <p>
          Podemos atualizar esta política para refletir alterações ao serviço, à legislação aplicável
          ou às nossas práticas. Quando o fizermos:
        </p>
        <Lista
          items={[
            'Atualizaremos a data "Última atualização" no topo desta página',
            "Para alterações materiais, notificaremos por email os utilizadores com conta",
            "A versão mais recente estará sempre disponível em recibocerto.pt/privacidade",
          ]}
        />
      </Section>

      {/* 18 — Contacto */}
      <Section id="contacto" title="Contacto e reclamações">
        <p>
          Para exerceres os teus direitos, esclareceres dúvidas ou apresentares reclamações
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
            Prazo de resposta: até um mês, conforme o artigo 12.º do RGPD (prorrogável por dois meses
            em casos complexos, com aviso prévio).
          </p>
        </div>
      </Section>
    </LegalPage>
  );
}
