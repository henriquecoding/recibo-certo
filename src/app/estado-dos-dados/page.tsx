import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, Sub, Nota, Lista, Tabela } from "@/components/LegalPage";
import { DATA_LAST_REVIEW, PARAMETROS_TODOS, SOURCES } from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { HISTORICO_GUIAS } from "@/lib/guias/historico";
import { CLUSTERS, inventarioPorCluster } from "@/lib/clusters";
import { BLOCOS_PAINEL, KPIS, kpi } from "@/lib/analytics/painel";
import { MOTORES_BENCHMARK, PROMPTS_BENCHMARK } from "@/lib/autoridade";
import { revisaoDosGuias } from "@/lib/revisoes";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { jsonLd } from "@/lib/jsonld";

// ─────────────────────────────────────────────────────────────────────
//  §10.3 — «/estado-dos-dados com versões, cobertura, fontes, limitações».
//
//  Todos os números desta página são CONTADOS a partir do código, no
//  momento da compilação. Nenhum está escrito à mão, e é isso que a torna
//  útil: uma página de cobertura com números escritos à mão é uma promessa
//  que envelhece em silêncio — exatamente o problema que o §3.4 apanhou no
//  sitemap.
//
//  Inclui também o que ainda NÃO existe. A auditoria diz que a lacuna
//  número um é não haver medição, e uma página de estado que escondesse
//  isso seria a primeira coisa a contradizer.
// ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Estado dos dados — cobertura, frescura e o que falta",
  description:
    "Quantos parâmetros fiscais estão verificados, com que fontes e em que data. Cobertura dos guias, estado editorial, o que medimos e o que ainda não sabemos. Contado a partir do código.",
  keywords: [
    "cobertura dados fiscais portugal",
    "fontes oficiais verificadas IRS",
    "transparência calculadora fiscal",
  ],
  alternates: { canonical: "/estado-dos-dados" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Estado dos dados — Recibo Certo",
    description:
      "Cobertura, frescura e limitações do motor fiscal, contadas a partir do código. Incluindo o que ainda falta.",
    url: "https://www.recibocerto.pt/estado-dos-dados",
    type: "article",
  },
};

const TOC = [
  { id: "resumo", label: "Resumo" },
  { id: "parametros", label: "Parâmetros fiscais" },
  { id: "guias", label: "Guias e revisão" },
  { id: "clusters", label: "Cobertura por decisão" },
  { id: "medicao", label: "Medição" },
  { id: "ia", label: "Respostas de IA" },
  { id: "falta", label: "O que ainda falta" },
];

export default function EstadoDosDadosPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Estado dos dados", url: "/estado-dos-dados" },
  ]);

  // ── Contagens reais ────────────────────────────────────────────────
  // `PARAMETROS_TODOS` e não a lista curada: desde que o registo passou a
  // ser feito pelo próprio `sv()`, TODOS os parâmetros têm base legal, fonte
  // e data — e publicar 344 quando são 535 subestimava o que está feito.
  const nParametros = PARAMETROS_TODOS.length;
  const nFontes = Object.keys(SOURCES).length;
  const fontesUsadas = new Set(PARAMETROS_TODOS.map((p) => p.source)).size;

  const verificacoes = PARAMETROS_TODOS.map((p) => p.lastVerified).sort();
  const verificacaoMaisAntiga = verificacoes[0] ?? DATA_LAST_REVIEW;

  const vivos = GUIDE_MANIFESTS.filter((m) => m.status !== "archived");
  const publicados = vivos.filter((m) => m.status === "published");
  const emPreparacao = vivos.filter((m) => m.status !== "published");
  const comRevisorAtribuido = publicados.filter(
    (m) => !m.reviewer.toLowerCase().startsWith("por atribuir"),
  ).length;

  const inventario = inventarioPorCluster();
  const foraDeCluster = inventario.find((i) => i.cluster === "sem_cluster");
  const dentroDeCluster = vivos.length - (foraDeCluster?.guias ?? 0);

  const correcoes = HISTORICO_GUIAS.length;

  const fmtData = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }}
      />
      <LegalPage
        title="Estado dos dados"
        subtitle="O que está verificado, desde quando, com que fontes — e o que ainda não sabemos. Todos os números desta página são contados a partir do código."
        lastUpdated={fmtData(DATA_LAST_REVIEW)}
        toc={TOC}
        eyebrow="Programa de autoridade"
        selo={`${nParametros} parâmetros verificados`}
        ctaTitulo="Um valor parece-te errado?"
        ctaTexto="Diz-nos qual e com que fonte. Verificamos e corrigimos publicamente."
      >
        <Section id="resumo" title="Resumo">
          <Tabela
            colunas={["Indicador", "Valor", "Nota"]}
            linhas={[
              ["Ano fiscal coberto", String(FISCAL_YEAR), "Todas as ferramentas calculam com regras deste ano."],
              ["Parâmetros com proveniência", String(nParametros), "Cada um com base legal, fonte e data de verificação."],
              ["Fontes oficiais registadas", String(nFontes), `${fontesUsadas} estão ligadas a pelo menos um parâmetro.`],
              ["Última revisão global", fmtData(DATA_LAST_REVIEW), "Nenhum parâmetro pode ser verificado depois desta data."],
              ["Verificação mais antiga em uso", fmtData(verificacaoMaisAntiga), "O parâmetro há mais tempo sem reconfirmação."],
              ["Guias ativos", String(vivos.length), `${publicados.length} publicados, ${emPreparacao.length} em preparação.`],
              ["Correções registadas", String(correcoes), "Histórico público, sem apagar o que estava errado."],
            ]}
          />
          <Nota tipo="info">
            A compilação do site falha se qualquer parâmetro perder a fonte, tiver data
            inválida ou for verificado depois da data de revisão global. Estes números não
            podem estar desatualizados sem que o site deixe de ser publicado.
          </Nota>
        </Section>

        <Section id="parametros" title="Parâmetros fiscais">
          <p>
            Um <strong>parâmetro</strong> é um valor que o motor usa para calcular: uma
            taxa de Segurança Social, um escalão de IRS, um coeficiente do regime
            simplificado, um limite de isenção, um prazo. Cada um guarda o valor, o artigo
            do código que o fundamenta, o endereço oficial e a data em que foi conferido.
          </p>
          <Sub title="Onde estão as fontes">
            <Lista
              items={[
                "Autoridade Tributária — códigos tributários, ofícios circulados e tabelas de retenção.",
                "Segurança Social — taxas contributivas, bases de incidência e guias práticos.",
                "Diário da República — diplomas e Orçamento do Estado, em versão consolidada quando existe.",
              ]}
            />
          </Sub>
          <Sub title="Limitação assumida">
            <p>
              Existem regras publicadas cujo valor não conseguimos ler numa fonte oficial
              consolidada — prestações que vivem em portarias dispersas, montantes fixados
              por despacho. Nesses casos não publicamos o número: dizemos, na página onde
              ele deveria estar, que não o temos e porquê. Preferimos uma lacuna assumida a
              um número plausível.
            </p>
          </Sub>
        </Section>

        <Section id="guias" title="Guias e estado de revisão">
          <Tabela
            colunas={["Estado", "Guias", "O que significa"]}
            linhas={[
              [
                "Publicado",
                String(publicados.length),
                "Corpo redigido, fontes verificadas, entra no sitemap e na navegação.",
              ],
              [
                "Em preparação",
                String(emPreparacao.length),
                "Base legal e fontes registadas, corpo por escrever. A página responde, mas não se anuncia aos motores de busca.",
              ],
              [
                "Com revisor fiscal atribuído",
                `${comRevisorAtribuido} de ${publicados.length}`,
                "Onde o revisor está por atribuir, a página di-lo em vez de o esconder.",
              ],
            ]}
          />
          <p>
            A revisão editorial mais recente entre todos os guias ativos é de{" "}
            <strong>{fmtData(revisaoDosGuias())}</strong>. É essa data — e não a data do
            último deploy — que o sitemap comunica aos motores de busca, guia a guia.
          </p>
          <Nota>
            <strong>Um guia em preparação não é um guia publicado.</strong> Continua
            acessível a quem tenha a ligação, mostra as fontes que já estão verificadas e
            declara o estado. O que não faz é apresentar-se como resposta acabada.
          </Nota>
        </Section>

        <Section id="clusters" title="Cobertura por decisão">
          <p>
            O conteúdo é organizado por <strong>clusters de decisão</strong>: uma pergunta
            real, a ferramenta que a calcula e o passo seguinte. Um guia dentro de um
            cluster tem destino; um guia fora dele responde a alguma coisa, mas não leva a
            lado nenhum — e isso é dívida editorial, não volume conquistado.
          </p>
          <Tabela
            colunas={["Cluster", "Ferramenta principal", "Guias"]}
            linhas={CLUSTERS.map((c) => {
              const i = inventario.find((x) => x.cluster === c.id);
              return [c.titulo, c.ativoPrincipal, String(i?.guias ?? 0)];
            })}
          />
          <p>
            <strong>{dentroDeCluster}</strong> guias estão dentro de um dos oito clusters
            e <strong>{foraDeCluster?.guias ?? 0}</strong> estão fora. Os que estão fora não
            desaparecem nem são escondidos: ficam a aguardar consolidação, procura
            demonstrada ou um responsável de atualização — e, até lá, nenhum tema novo
            fora dos clusters é aberto.
          </p>
        </Section>

        <Section id="medicao" title="Medição">
          <p>
            Medimos utilização para saber onde o produto falha. A definição completa do que
            conta e do que não conta está na{" "}
            <Link href="/metodologia#medicao" className="font-semibold text-brand hover:underline">
              metodologia
            </Link>
            . O painel interno tem seis blocos, e cada bloco existe para responder a uma
            pergunta de decisão — um bloco sem pergunta não entra.
          </p>
          <Tabela
            colunas={["Bloco", "Pergunta de decisão", "Indicadores"]}
            linhas={BLOCOS_PAINEL.map((b) => [
              b.titulo,
              b.pergunta,
              b.kpis.map((id) => kpi(id)?.nome ?? id).join(", "),
            ])}
          />
          <p>
            São {KPIS.length} indicadores, cada um com fórmula escrita, frequência,
            responsável e limite. A fórmula viaja com o indicador de propósito: um número
            sem definição muda de significado sempre que muda de mãos.
          </p>
          <Nota tipo="info">
            <strong>Nada disto recolhe dados fiscais.</strong> Valores, NIF, documentos e
            texto livre estão numa lista de campos proibidos verificada automaticamente,
            no teu dispositivo, antes de qualquer envio. E só existe medição com
            consentimento de estatística — sem ele, nem um identificador é criado.
          </Nota>
        </Section>

        <Section id="ia" title="Respostas de IA">
          <p>
            Permitimos que os motores de pesquisa e os assistentes rastreiem o site, e
            avaliamos mensalmente se o que dizem sobre estes temas está correto. O conjunto
            de avaliação tem {PROMPTS_BENCHMARK.length} perguntas reais, distribuídas pelos
            perfis que servimos, testadas em {MOTORES_BENCHMARK.join(", ")}.
          </p>
          <Lista
            items={[
              "Não escrevemos conteúdo «para a IA». Escrevemos conteúdo verificável, que é o que qualquer sistema de resposta acaba por preferir.",
              "Nenhum teste tenta manipular um motor. Medimos, não otimizamos contra o avaliador.",
              "Uma citação errada é tratada como erro nosso: corrigimos a fonte, o resumo ou o conteúdo.",
            ]}
          />
        </Section>

        <Section id="falta" title="O que ainda falta">
          <p>
            Esta secção existe porque uma página de estado que só mostrasse o que já está
            feito seria publicidade. O que falta, hoje:
          </p>
          <Lista
            items={[
              "Dados de utilização reais. A camada de medição existe e está ligada, mas os números só passam a significar alguma coisa depois de um período de referência — e até lá não há aqui percentagens de ativação nem de retenção para mostrar.",
              "Revisor fiscal identificado em todos os guias publicados. Onde está por atribuir, a página di-lo.",
              "Reconciliação de desfechos comerciais com o parceiro de execução, com janela e evento remunerado definidos por contrato.",
              "Consolidação dos guias que estão fora dos clusters de decisão: manter, juntar ou retirar, com base em procura demonstrada.",
              "Alertas configuráveis e reserva fiscal recorrente — o que transforma uma visita numa relação.",
            ]}
          />
          <Nota>
            Se alguma destas lacunas te afeta diretamente, diz-nos. A ordem por que são
            fechadas depende de quem as sente.
          </Nota>
        </Section>
      </LegalPage>
    </>
  );
}
