// ═══════════════════════════════════════════════════════════════════════
//  EXPLICAÇÃO — porque isto apareceu para TI
//  ---------------------------------------------------------------------
//  Ponto 25 do pedido. A explicação não é copy: é derivada do que o motor
//  calculou, e por isso não pode dizer o contrário do que os números
//  dizem. Cada linha «a favor» nasce de um eixo que pontuou; cada linha
//  «contra» nasce de um que não pontuou ou de uma objeção que procede.
//
//  A frase de resumo cita as respostas concretas da pessoa — o veículo, a
//  experiência, o raio — porque é isso que torna a recomendação
//  reconhecível em vez de genérica.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import { horasSemanais, type OpportunityContext } from "../contexto/tipos";
import { COMPETENCIA_POR_ID } from "../conhecimento/grafo";
import { fatorGeografico } from "./scoring";
import type { CandidatoBruto } from "./gerador";
import { ROTULO_ENTREGA } from "./gerador";
import type {
  AvaliacaoProcura,
  AvaliacaoRegulatoria,
  AvaliacaoViabilidade,
  ContribuicaoFit,
  Explicacao,
  ObjecaoStress,
  RiscoAvaliado,
} from "./tipos";

export interface EntradaExplicacao {
  candidato: CandidatoBruto;
  contexto: OpportunityContext;
  fitDetalhe: readonly ContribuicaoFit[];
  viabilidade: AvaliacaoViabilidade;
  regulacao: AvaliacaoRegulatoria;
  procura: AvaliacaoProcura;
  riscos: readonly RiscoAvaliado[];
  objecoes: readonly ObjecaoStress[];
}

export function explicar(entrada: EntradaExplicacao): Explicacao {
  const { candidato, contexto, fitDetalhe, viabilidade, regulacao, procura, riscos, objecoes } = entrada;

  // ── O resumo: as respostas concretas que puxaram isto para cima ───
  const razoes: string[] = [];
  const dominante = candidato.dominante;
  const competenciasUsadas = dominante.competenciasNecessarias
    .map((id) => COMPETENCIA_POR_ID.get(id)?.rotulo.toLocaleLowerCase("pt-PT"))
    .filter((item): item is string => item !== undefined);
  if (competenciasUsadas.length > 0) razoes.push(`declaraste ${competenciasUsadas.join(" e ")}`);

  const ativosUsados = candidato.capacidades
    .flatMap((item) => item.capacidade.ativosUteis)
    .filter((ativo) => contexto.ativos.includes(ativo));
  if (ativosUsados.length > 0) {
    const nomes: Readonly<Record<string, string>> = {
      "veiculo-ligeiro": "tens viatura",
      "veiculo-carga": "tens viatura de carga",
      "carta-conducao": "tens carta",
      computador: "tens computador de trabalho",
      ferramentas: "tens ferramentas",
      "espaco-comercial": "tens espaço",
      terreno: "tens terreno",
      "cozinha-licenciada": "tens cozinha licenciada",
      oficina: "tens oficina",
      "carteira-clientes": "tens carteira de clientes",
      "camara-video": "tens equipamento de imagem",
      armazem: "tens armazém",
      "equipamento-tecnico": "tens equipamento técnico",
      stock: "tens stock",
    };
    const primeiro = nomes[ativosUsados[0]!];
    if (primeiro) razoes.push(primeiro);
  }

  if (contexto.preferencias.mercado !== "indiferente") {
    razoes.push(`procuras ${contexto.preferencias.mercado.toUpperCase()}`);
  }
  if (contexto.localizacao.regiao !== "portugal") {
    razoes.push(`operas em ${marketRegionLabel(contexto.localizacao.regiao)}`);
  }
  if (contexto.localizacao.raioKm !== undefined) {
    razoes.push(`aceitaste um raio de ${contexto.localizacao.raioKm} km`);
  }

  const resumo =
    razoes.length > 0
      ? `Isto aparece porque ${razoes.join(", ")} — e este problema pede exatamente ${dominante.rotulo.toLocaleLowerCase("pt-PT")}, em modelo ${ROTULO_ENTREGA[candidato.entrega].toLocaleLowerCase("pt-PT")}.`
      : `Isto aparece porque o problema pede ${dominante.rotulo.toLocaleLowerCase("pt-PT")}, que é o que declaraste saber fazer.`;

  // ── A favor ───────────────────────────────────────────────────────
  const aFavor: string[] = [];
  for (const item of fitDetalhe) {
    if (item.obtido === item.maximo && item.maximo >= 10) aFavor.push(item.nota);
  }
  if (viabilidade.cabeNoCapital === true) {
    aFavor.push("O investimento estimado cabe no capital que declaraste.");
  }
  if (viabilidade.cabeNoPrazo === true) {
    aFavor.push("Chega à primeira receita dentro do prazo que aguentas.");
  }
  if (regulacao.barreira === 0) {
    aFavor.push("Não identificámos requisitos regulatórios a tratar antes de começar.");
  }
  if (candidato.modelo.padrao === "recorrente" || candidato.modelo.padrao === "contratos") {
    aFavor.push("O modelo de receita repete-se, o que dá visibilidade sobre o mês seguinte.");
  }
  if (procura.evidencias.length >= 2) {
    aFavor.push(`${procura.evidencias.length} leituras oficiais sustentam parte desta análise.`);
  }
  // A intensidade só entra «a favor» quando o número é bom E há régua
  // contra a qual o ler. Um valor solto não é um argumento.
  const posicao = procura.intensidade.posicao;
  if (posicao !== null && posicao >= 60) {
    const primeira = procura.intensidade.leituras[0];
    aFavor.push(
      primeira && procura.intensidade.base === "distribuicao-regional"
        ? `Nas séries oficiais que medem este problema, a tua zona está no percentil ${posicao} do país.`
        : `As séries oficiais que medem este problema põem a tua zona ${posicao >= 75 ? "bem " : ""}acima da referência nacional.`,
    );
  }
  const geo = fatorGeografico(candidato, contexto);
  if (geo.valor >= 0.95) aFavor.push(geo.nota);
  if (candidato.modelo.escalabilidade >= 2) {
    aFavor.push("O modelo cresce sem custo proporcional ao teu tempo.");
  }

  // ── Contra ────────────────────────────────────────────────────────
  const contra: string[] = [];
  for (const item of fitDetalhe) {
    if (item.obtido === 0 && item.maximo >= 10) contra.push(item.nota);
  }
  for (const objecao of objecoes) {
    if (objecao.procede) contra.push(objecao.resposta);
  }
  for (const risco of riscos) {
    if (!risco.dentroDaTolerancia) contra.push(risco.nota);
  }
  if (regulacao.temIncerteza) {
    contra.push("Há requisitos regulatórios que dependem do caso concreto e têm de ser confirmados antes de investir.");
  }
  if (posicao !== null && posicao <= 35) {
    contra.push(
      procura.intensidade.base === "distribuicao-regional"
        ? `Nas séries que medem este problema, a tua zona está no percentil ${posicao} — está entre as regiões onde ele é menos intenso.`
        : "As séries que medem este problema põem a tua zona abaixo da referência nacional.",
    );
  }
  if (geo.valor < 0.7) contra.push(geo.nota);
  if (horasSemanais(contexto) < 10 && candidato.modelo.padrao !== "pontual") {
    contra.push("Um modelo recorrente com poucas horas por semana enche a agenda depressa e depois não tem para onde crescer.");
  }

  // Sem repetições, e com um teto: uma lista de catorze linhas não se lê.
  const unicos = (itens: readonly string[]) => [...new Set(itens)].slice(0, 6);

  return { resumo, aFavor: unicos(aFavor), contra: unicos(contra) };
}
