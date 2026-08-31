import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, Sub, Nota, Lista, ListaCheck, Tabela } from "@/components/LegalPage";
import { DEFINICAO_DVM } from "@/lib/analytics/dvm";
import { CAMADAS_PAGINA_CITAVEL, CAMADAS_RESULTADO } from "@/lib/autoridade";
import { CRITERIOS_PRIORIZACAO } from "@/lib/clusters";
import { FRONTEIRA, NUNCA_COMUNICAR, POLITICA_AFILIADOS } from "@/lib/routing";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { EMAIL_APOIO } from "@/lib/contacto";

// ─────────────────────────────────────────────────────────────────────
//  §10.3 do relatório estratégico — programa de autoridade.
//
//  «Publicar /metodologia, /estado-dos-dados e /changelog-fiscal com
//  versões, cobertura, fontes, limitações e histórico de correções.»
//
//  A página existe por duas razões que se reforçam. A primeira é o
//  utilizador: um tema YMYL — dinheiro, imposto, consequência legal —
//  merece que quem publica diga como chegou ao número e o que não sabe. A
//  segunda é a citação: o §10 mostra que o caminho para aparecer em
//  respostas de IA não é escrever «para a IA», é ser verificável.
//
//  Nada aqui é promessa. Cada afirmação corresponde a código que existe e
//  que qualquer pessoa pode confrontar com o resultado que viu.
// ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Metodologia — como calculamos e como verificamos",
  description:
    "Como o Recibo Certo calcula: fonte de verdade fiscal, base legal por parâmetro, versões do motor, limites conhecidos, política editorial e contacto de correção. Sem promessas de resultado fiscal.",
  keywords: [
    "metodologia calculadora fiscal portugal",
    "como é calculado o IRS simulador",
    "fontes oficiais impostos portugal",
    "política editorial fiscal",
  ],
  alternates: { canonical: "/metodologia" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Metodologia — Recibo Certo",
    description:
      "Como calculamos, com que fontes, com que limites e como corrigimos. A metodologia completa do motor fiscal.",
    url: "https://www.recibocerto.pt/metodologia",
    type: "article",
  },
};

const TOC = [
  { id: "principio", label: "O princípio" },
  { id: "fonte-verdade", label: "Fonte de verdade" },
  { id: "resultado", label: "Anatomia de um resultado" },
  { id: "citavel", label: "Anatomia de uma página" },
  { id: "limites", label: "Limites conhecidos" },
  { id: "editorial", label: "Política editorial" },
  { id: "medicao", label: "O que medimos" },
  { id: "comercial", label: "Fronteira comercial" },
  { id: "correcoes", label: "Corrigir um erro" },
];

export default function MetodologiaPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Metodologia", url: "/metodologia" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <LegalPage
        title="Metodologia"
        subtitle="Como chegamos a cada número, com que fontes, com que limites — e o que fazemos quando erramos."
        lastUpdated={new Date(`${DATA_LAST_REVIEW}T00:00:00Z`).toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
        toc={TOC}
        eyebrow="Programa de autoridade"
        selo="Fontes oficiais e revisão datada"
        ctaTitulo="Encontraste um erro?"
        ctaTexto="Escreve-nos. Erros de cálculo têm prioridade sobre tudo o resto."
      >
        <Section id="principio" title="O princípio">
          <p>
            O Recibo Certo não inventa nem estima regras fiscais. Todos os parâmetros de
            cálculo — taxas, escalões, coeficientes, limites, prazos — vivem num único
            ficheiro com base legal, fonte oficial e data de verificação. Se um valor não
            tiver os três, não entra.
          </p>
          <p>
            Essa exigência não é uma intenção: é uma verificação automática que corre em
            cada compilação. Um parâmetro sem fonte registada, com data inválida, ou
            verificado depois da data de revisão global, faz a compilação falhar. O site
            não chega a ser publicado.
          </p>
          <Nota tipo="info">
            <strong>O que isto não é.</strong> Uma simulação não é uma declaração, não é
            aconselhamento fiscal individual e não é uma submissão. É um cálculo sobre as
            premissas que introduziste, feito com as regras públicas em vigor.
          </Nota>
        </Section>

        <Section id="fonte-verdade" title="A fonte de verdade fiscal">
          <p>
            Cada parâmetro guarda quatro coisas: o <strong>valor</strong>, a{" "}
            <strong>base legal</strong> (o artigo do código aplicável), a{" "}
            <strong>fonte</strong> (o endereço oficial onde a regra pode ser lida) e a{" "}
            <strong>data de verificação</strong>.
          </p>
          <Sub title="De onde vêm as regras">
            <Lista
              items={[
                "Autoridade Tributária — códigos tributários (CIRS, CIVA, CIRC), ofícios circulados e tabelas de retenção.",
                "Segurança Social — guias práticos, taxas contributivas e bases de incidência.",
                "Diário da República — diplomas e Orçamento do Estado, em versão consolidada sempre que exista.",
                "Quando uma regra não pode ser lida numa fonte oficial consolidada, não publicamos o número. Dizemos que não o temos e porquê.",
              ]}
            />
          </Sub>
          <Sub title="Como as mantemos atuais">
            <Lista
              items={[
                "Um verificador automático compara as fontes registadas e assinala alterações; corre em integração contínua, não à mão.",
                `A data de revisão global dos dados de ${FISCAL_YEAR} é ${DATA_LAST_REVIEW}. Nenhum parâmetro pode declarar verificação posterior a essa data sem que ela suba também.`,
                "O calendário legislativo é o gatilho: Orçamento do Estado, alterações a códigos e novas tabelas obrigam a rever antes de o ano mudar.",
              ]}
            />
          </Sub>
          <p>
            O estado atual de cobertura e frescura está em{" "}
            <Link href="/estado-dos-dados" className="font-semibold text-brand hover:underline">
              estado dos dados
            </Link>
            , e o histórico de correções em{" "}
            <Link href="/changelog-fiscal" className="font-semibold text-brand hover:underline">
              changelog fiscal
            </Link>
            .
          </p>
        </Section>

        <Section id="resultado" title="Anatomia de um resultado">
          <p>
            Um número sozinho não ajuda ninguém a decidir. Todos os resultados seguem a
            mesma estrutura, pela mesma ordem:
          </p>
          <Tabela
            colunas={["Camada", "O que mostra", "Porque existe"]}
            linhas={CAMADAS_RESULTADO.map((c) => [c.titulo, c.mostra, c.porque])}
          />
          <Nota>
            As chamadas para ação nunca aparecem todas com o mesmo peso. Há sempre um
            próximo passo principal, escolhido pelo teu cenário e não pelo que nos paga
            mais — ver <a href="#comercial" className="font-semibold underline">fronteira comercial</a>.
          </Nota>
        </Section>

        <Section id="citavel" title="Anatomia de uma página">
          <p>
            As páginas que explicam uma regra seguem uma estrutura própria, pensada para
            que uma afirmação possa ser extraída sem perder o contexto que a torna
            verdadeira — por uma pessoa, por um motor de busca ou por um assistente.
          </p>
          <Tabela
            colunas={["Camada", "Conteúdo", "Porque é citável"]}
            linhas={CAMADAS_PAGINA_CITAVEL.map((c) => [c.camada, c.conteudo, c.porque])}
          />
        </Section>

        <Section id="limites" title="Limites conhecidos">
          <p>
            Estes são os limites estruturais do que fazemos. Não são exceções raras: são
            a fronteira do que uma ferramenta pode responder com honestidade.
          </p>
          <Lista
            items={[
              "Uma simulação usa as premissas que introduzes. Premissas incompletas dão resultados aproximados — e nesse caso mostramos um intervalo, não um número exato.",
              "Regras com margem de interpretação, benefícios dependentes de despacho, situações mistas e casos com elementos internacionais podem exigir avaliação profissional.",
              "Não conhecemos o teu histórico fiscal, os teus e-Fatura, nem decisões anteriores da AT sobre o teu caso.",
              "Arredondamentos podem gerar diferenças de cêntimos face ao valor apurado oficialmente.",
              "Regras publicadas mas ainda sem regulamentação, ou sem versão consolidada legível, ficam por publicar — e dizemo-lo na página onde deveriam estar.",
            ]}
          />
          <Nota>
            Quando o motor reconhece que o teu caso está fora do que consegue cobrir,
            di-lo. Não estima na mesma nem sugere nenhum parceiro — a única
            recomendação nesse caso é rever as premissas ou procurar apoio oficial.
          </Nota>
        </Section>

        <Section id="editorial" title="Política editorial">
          <Sub title="Antes de publicar">
            <ListaCheck
              items={[
                "Ano e território explícitos; data de vigência e de revisão; fonte primária clicável.",
                "Cenário testado no motor; arredondamentos, intervalos e casos excluídos documentados.",
                "Autor e revisor identificados; nenhuma promessa de resultado fiscal; contacto de correção visível.",
                "Um objetivo por página, uma ação principal e divulgação de afiliação antes de qualquer ligação comercial.",
                "Conteúdo essencial renderizado no servidor — legível sem JavaScript e por leitores de ecrã.",
                "Plano de atualização com gatilho legal e responsável. Uma página sem responsável não cresce.",
              ]}
            />
          </Sub>
          <Sub title="Como decidimos o que escrever a seguir">
            <p>
              Cada pedido de conteúdo é pontuado por seis critérios. Um tema que não
              pontue em frequência, intenção e acionabilidade não entra, por mais
              procurado que seja.
            </p>
            <Tabela
              colunas={["Critério", "Pontua alto quando", "Consequência"]}
              linhas={CRITERIOS_PRIORIZACAO.map((c) => [c.pergunta, c.pontuacaoAlta, c.decisao])}
            />
          </Sub>
        </Section>

        <Section id="medicao" title="O que medimos — e o que nunca medimos">
          <p>
            Medimos utilização para perceber onde o produto falha. A métrica central
            chama-se <strong>{DEFINICAO_DVM.nome}</strong>: {DEFINICAO_DVM.frase}
          </p>
          <Sub title="O que conta">
            <Lista items={[...DEFINICAO_DVM.conta]} />
          </Sub>
          <Sub title="O que não conta">
            <Lista items={[...DEFINICAO_DVM.naoConta]} />
          </Sub>
          <Nota tipo="info">
            <strong>Nenhum dado fiscal teu entra na medição.</strong> Valores, NIF,
            documentos e texto livre estão numa lista de campos proibidos verificada
            automaticamente: um evento que os contenha é recusado, no teu dispositivo,
            antes de sair. Quando uma grandeza é mesmo necessária, viaja em intervalos
            («10k-20k»), nunca em valor exato. E nada disto acontece sem consentimento
            de estatística — sem ele, nem sequer é criado um identificador.
          </Nota>
        </Section>

        <Section id="comercial" title="Fronteira comercial">
          <p>
            O Recibo Certo tem parcerias e diz sempre quais são. O que a parceria nunca
            faz é alterar um resultado, comprar prioridade editorial ou condicionar o
            acesso ao cálculo.
          </p>
          <Tabela
            colunas={["Quem", "Faz o quê"]}
            linhas={[
              ["Recibo Certo", FRONTEIRA.reciboCerto],
              ["FIZ (parceiro de execução)", FRONTEIRA.fiz],
              ["Contabilista ou especialista", FRONTEIRA.contabilista],
            ]}
          />
          <Sub title="O que nunca dizemos">
            <Lista items={[...NUNCA_COMUNICAR]} />
          </Sub>
          <Sub title="Regras de afiliação">
            <Lista items={[...POLITICA_AFILIADOS]} />
          </Sub>
          <Nota>
            O plano Plus não é necessário para ligar à FIZ nem para continuar para um
            parceiro. Essa passagem é gratuita, e mantê-la gratuita é o que impede o
            preço de distorcer a recomendação.
          </Nota>
        </Section>

        <Section id="correcoes" title="Corrigir um erro">
          <p>
            Um erro de cálculo é o pior problema que este produto pode ter, e é tratado
            como tal: uma correção fiscal tem prioridade sobre qualquer funcionalidade,
            teste ou campanha em curso. Nunca é tratada como uma variante experimental.
          </p>
          <Lista
            items={[
              `Escreve para ${EMAIL_APOIO} com a ferramenta, as premissas e o valor que esperavas.`,
              "Confirmamos contra a fonte oficial e, quando o erro existe, corrigimos o motor e os conteúdos afetados.",
              "A correção fica registada publicamente no changelog fiscal, com a data e a razão.",
              "Se a correção alterar resultados já vistos, dizemo-lo na página e explicamos a diferença entre versões.",
            ]}
          />
        </Section>
      </LegalPage>
    </>
  );
}
