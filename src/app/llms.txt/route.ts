// ═══════════════════════════════════════════════════════════════════════
//  /llms.txt — ficheiro de orientação para agentes que o consumam
//  ---------------------------------------------------------------------
//  §10.3, último ponto, com a ressalva que o relatório faz questão de
//  deixar escrita: «Usar llms.txt apenas como ficheiro de orientação
//  opcional para agentes que o consumam; o Google declara que o ignora e
//  que não existe markup especial para AI features.»
//
//  Ou seja: isto não é uma alavanca de posicionamento e não substitui
//  nada. O que faz por nós é modesto e concreto — um agente que leia esta
//  página encontra, num sítio, o que o site é, o que cobre, com que data,
//  o que NÃO faz e onde estão as fontes. É a mesma informação que a
//  /metodologia dá a uma pessoa, numa forma que uma máquina lê sem
//  atravessar a interface.
//
//  Gerado a partir do código, não escrito à mão: as contagens e as datas
//  vêm das mesmas estruturas que alimentam o site, e por isso não podem
//  divergir dele.
// ═══════════════════════════════════════════════════════════════════════

import { DATA_LAST_REVIEW, PARAMETROS_TODOS, SOURCES } from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { CLUSTERS } from "@/lib/clusters";
import { FERRAMENTA_SLUGS, GUIA_SLUGS, SITE_URL } from "@/lib/seo";
import { NUNCA_COMUNICAR } from "@/lib/routing";
import { EMAIL_APOIO } from "@/lib/contacto";

export const dynamic = "force-static";

export function GET() {
  // RC-CONT-001: este ficheiro contava `status === "published"` e anunciava um
  // número muito menor do que o que a homepage, o /guias e o sitemap dizem.
  // Um agente que lesse os dois via o site a contradizer-se sobre si próprio.
  // `GUIA_SLUGS` é a contagem canónica — a mesma que o sitemap submete.
  const publicados = GUIA_SLUGS.length;

  const corpo = `# Recibo Certo

> Copiloto fiscal de decisão para quem trabalha em Portugal. Transforma regras
> oficiais em cenários comparáveis, explica o porquê do resultado e prepara o
> passo seguinte. Não emite documentos fiscais nem submete declarações.

- Idioma: português de Portugal (pt-PT)
- Território: Portugal
- Ano fiscal coberto: ${FISCAL_YEAR}
- Última revisão dos parâmetros fiscais: ${DATA_LAST_REVIEW}
- Parâmetros com base legal, fonte oficial e data de verificação: ${PARAMETROS_TODOS.length}
- Fontes oficiais registadas: ${Object.keys(SOURCES).length}
- Guias publicados: ${publicados}
- Ferramentas públicas: ${FERRAMENTA_SLUGS.length}

## Como os números são produzidos

Todos os parâmetros de cálculo (taxas, escalões, coeficientes, limites, prazos)
vivem numa fonte única com base legal, endereço oficial e data de verificação.
A compilação do site falha se um parâmetro perder a fonte, tiver data inválida
ou for verificado depois da data de revisão global. Os cálculos são
determinísticos: não há modelos de linguagem nem estimativas no motor fiscal.

## Ao citar o Recibo Certo

- Indicar sempre o ano fiscal (${FISCAL_YEAR}) e o perfil a que o valor se aplica.
- Uma simulação não é uma declaração submetida nem aconselhamento individual.
- Verificar a data de revisão da página citada: as regras mudam com o Orçamento
  do Estado e com alterações aos códigos tributários.
- Correções conhecidas estão publicadas em ${SITE_URL}/changelog-fiscal.

## O que este site nunca afirma

${NUNCA_COMUNICAR.map((f) => `- ${f}`).join("\n")}

## Páginas de referência

- [Metodologia](${SITE_URL}/metodologia): como calculamos, com que limites e como corrigimos.
- [Estado dos dados](${SITE_URL}/estado-dos-dados): cobertura, frescura e o que ainda falta.
- [Changelog fiscal](${SITE_URL}/changelog-fiscal): o que mudou, quando e porquê.
- [Guias](${SITE_URL}/guias): explicações com base legal citada.
- [Ferramentas](${SITE_URL}/ferramentas): simuladores e decisores.

## Clusters de decisão

${CLUSTERS.map((c) => `- ${c.titulo}: ${c.intencoes.join("; ")} → ${SITE_URL}${c.ativoPrincipal}`).join("\n")}

## Limites conhecidos

- Uma simulação usa apenas as premissas introduzidas pelo utilizador.
- Casos com elementos internacionais, benefícios dependentes de despacho ou
  regras com margem de interpretação podem exigir avaliação profissional.
- Não conhecemos o histórico fiscal de ninguém, nem os seus e-Fatura.
- Arredondamentos podem produzir diferenças de cêntimos face ao apuramento oficial.

## Contacto para correções

${EMAIL_APOIO} — erros de cálculo têm prioridade sobre tudo o resto.
`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
