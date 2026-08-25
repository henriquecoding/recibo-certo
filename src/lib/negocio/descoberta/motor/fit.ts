// ═══════════════════════════════════════════════════════════════════════
//  FIT PESSOAL — «consegues fazer isto?», e MAIS NADA
//  ---------------------------------------------------------------------
//  ┌────────────────────────────────────────────────────────────────────┐
//  │ A MATRIZ DE SOBREPOSIÇÃO, ESCRITA UMA VEZ                           │
//  │                                                                    │
//  │ O fit valia 26 pontos do score e continha, dentro de si, capital   │
//  │ (15/100), tempo (15), ativos (15), geografia (10) e equipa (5). O  │
//  │ score voltava a pontuar as MESMAS variáveis em `economia` (14),    │
//  │ `exequibilidade` (10) e `geografia` (6). O capital entrava três    │
//  │ vezes: no fit, na economia e — pela via de `capitalTipico.min` —   │
//  │ no risco financeiro.                                               │
//  │                                                                    │
//  │     Peso declarado à compatibilidade pessoal ........  26 %        │
//  │     Peso efetivo, contando a dupla contagem .........  ~50 %       │
//  │                                                                    │
//  │ A regra que resolve isto cabe em duas linhas, e é esta:            │
//  │                                                                    │
//  │     o FIT responde «consegues fazer isto?»                         │
//  │     a ECONOMIA responde «cabe no que tens?»                        │
//  │     a EXEQUIBILIDADE responde «tens como executar?»                │
//  │     a GEOGRAFIA responde «o problema é aqui?»                      │
//  │                                                                    │
//  │ A mesma resposta não pode alimentar duas. Por isso capital, tempo, │
//  │ equipa e geografia SAÍRAM deste ficheiro — cada um foi para a      │
//  │ dimensão cuja pergunta responde. O que fica é o que só aqui cabe:  │
//  │ o que a pessoa sabe, o que a pessoa tem, o que a pessoa já viveu,  │
//  │ e o que a pessoa quer.                                             │
//  └────────────────────────────────────────────────────────────────────┘
//
//  ── E O QUE ENTROU ─────────────────────────────────────────────────
//  Três campos que o configurador recolhia e que nenhuma linha do motor
//  lia: o NÍVEL da competência (que era testado como booleano), o TIPO DE
//  EXPERIÊNCIA (seis valores, incluindo «tenho contactos») e os ANOS. Com
//  eles, dez anos de canalização deixam de valer o mesmo que ter mexido
//  uma vez num sifão.
// ═══════════════════════════════════════════════════════════════════════

import { ESCALABILIDADE_PRETENDIDA, experienciaForca, temRestricao, type OpportunityContext } from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type { ContribuicaoFit } from "./tipos";
import { avaliarRequisitoAtivo } from "../conhecimento/adequacao-ativos";

/**
 * Os pesos, e a razão de cada um. Somam 100.
 *
 * Nenhum destes eixos aparece noutra dimensão do score. Um teste obriga
 * a que continue assim — a dupla contagem é invisível a olho nu e volta
 * sempre que alguém acrescenta «só mais um eixo».
 */
export const PESOS_FIT = Object.freeze({
  /** O que a pessoa sabe fazer, ponderado pelo nível declarado. */
  capacidade: 35,
  /** Os meios que a execução exige e que já existem. */
  ativos: 20,
  /** Já fez isto, geriu isto, ou tem a quem vender isto. */
  experiencia: 15,
  /** Coincide com o tipo de negócio que a pessoa pediu. */
  preferencias: 15,
  /** O modelo dá o que a pessoa quer que ele dê? */
  ambicao: 8,
  /** Respeita os limites brandos — os que pesam em vez de eliminarem. */
  limites: 7,
});

export function calcularFit(
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
): { total: number; detalhe: readonly ContribuicaoFit[] } {
  const detalhe: ContribuicaoFit[] = [];

  // ── Capacidade: quanto do que o trabalho pede está coberto ────────
  //  A cobertura já vem ponderada pelo nível (ver `grafo.ts`): quem
  //  declara «básico» conta 0,6 do que conta quem declara «avançado».
  const melhor = candidato.capacidades[0]!;
  const cobertura = melhor.cobertura;
  detalhe.push({
    eixo: "capacidade",
    obtido: Math.round(PESOS_FIT.capacidade * cobertura),
    maximo: PESOS_FIT.capacidade,
    nota:
      cobertura >= 0.95
        ? `Dominas o que isto pede: ${melhor.capacidade.rotulo.toLocaleLowerCase("pt-PT")}.`
        : melhor.competenciasEmFalta.length > 0
          ? `Tens parte do que isto pede — falta ${melhor.competenciasEmFalta.length === 1 ? "uma competência" : `${melhor.competenciasEmFalta.length} competências`} que o trabalho usa.`
          : `Tens ${melhor.capacidade.rotulo.toLocaleLowerCase("pt-PT")}, no nível que declaraste — subir o nível sobe este eixo.`,
  });

  // ── Ativos ────────────────────────────────────────────────────────
  const requisitos = candidato.capacidades.flatMap((item) => item.avaliacoesAtivos);
  const uteis = [...new Set(candidato.capacidades.flatMap((item) => item.capacidade.ativosUteis))];
  const avaliacoesUteis = uteis.map((ativo) =>
    avaliarRequisitoAtivo(contexto, {
      qualquerUmDe: [ativo],
      finalidade: "Meio útil para executar com mais folga",
    }),
  );
  const parteObrigatoria =
    requisitos.length === 0 ? 1 : requisitos.reduce((total, item) => total + item.forca, 0) / requisitos.length;
  const parteUtil =
    avaliacoesUteis.length === 0
      ? 1
      : avaliacoesUteis.reduce((total, item) => total + item.forca, 0) / avaliacoesUteis.length;
  const parteAtivos = requisitos.length > 0 ? 0.8 * parteObrigatoria + 0.2 * parteUtil : 0.5 + 0.5 * parteUtil;
  const emFalta = requisitos.filter((item) => item.estado === "em-falta" || item.estado === "inadequado");
  const porAdquirir = requisitos.filter((item) => item.estado === "por-adquirir");
  const porConfirmar = requisitos.filter((item) => item.estado === "por-confirmar");
  const limitados = [...requisitos, ...avaliacoesUteis].filter((item) => item.estado === "limitado");
  const uteisQueTem = avaliacoesUteis.filter((item) => item.forca > 0);
  detalhe.push({
    eixo: "ativos",
    obtido: Math.round(PESOS_FIT.ativos * parteAtivos),
    maximo: PESOS_FIT.ativos,
    nota:
      emFalta.length > 0
        ? "Falta, ou não é adequado, pelo menos um meio que este trabalho exige."
        : porAdquirir.length > 0
          ? `${porAdquirir.length === 1 ? "Há equipamento" : `Há ${porAdquirir.length} equipamentos`} que este trabalho pede e que ainda não declaraste ter. Não impede — compra-se — mas conta no arranque.`
          : porConfirmar.length > 0
            ? `${porConfirmar.length === 1 ? "Há um meio" : `Há ${porConfirmar.length} meios`} por confirmar antes de tratar esta hipótese como executável.`
            : limitados.length > 0
              ? "Os meios existem, mas as limitações declaradas reduzem a capacidade real de execução."
              : uteisQueTem.length > 0
                ? `O que já tens serve: ${uteisQueTem.length} ${uteisQueTem.length === 1 ? "meio aproveitado" : "meios aproveitados"}.`
                : "Não exige meios que não tenhas.",
  });

  // ── Experiência ───────────────────────────────────────────────────
  //  Três campos recolhidos e nunca lidos. «Tenho contactos» vale o
  //  dobro de «tenho interesse» porque vender o primeiro serviço a
  //  desconhecidos é a parte que mata mais negócios do que a execução.
  const forcas = melhor.capacidade.competenciasNecessarias
    .map((id) => experienciaForca(contexto, id))
    .filter((valor): valor is number => valor !== null);
  const parteExperiencia = forcas.length === 0 ? 0.35 : Math.max(...forcas);
  const declaradas = contexto.competencias.filter((item) =>
    melhor.capacidade.competenciasNecessarias.includes(item.id),
  );
  const comContactos = declaradas.some((item) => item.experiencia === "tenho-contactos");
  const anosMax = Math.max(0, ...declaradas.map((item) => item.anos ?? 0));
  detalhe.push({
    eixo: "experiencia",
    obtido: Math.round(PESOS_FIT.experiencia * parteExperiencia),
    maximo: PESOS_FIT.experiencia,
    nota: comContactos
      ? "Declaraste ter contactos nesta área — é o que mais encurta o caminho até ao primeiro cliente."
      : anosMax >= 3
        ? `${anosMax} anos declarados nesta área contam a teu favor.`
        : forcas.length === 0
          ? "Não declaraste que relação tens com esta área, por isso o eixo fica a meio."
          : "Sabes fazer, mas ainda não declaraste experiência de trabalho ou de gestão nesta área.",
  });

  // ── Preferências ──────────────────────────────────────────────────
  //  As incompatíveis já foram eliminadas pelas restrições. Aqui só se
  //  premeia o que a pessoa pediu explicitamente e coincide.
  let acertos = 0;
  let possiveis = 0;
  const registar = (declarou: boolean, acertou: boolean) => {
    if (!declarou) return;
    possiveis += 1;
    if (acertou) acertos += 1;
  };
  registar(
    contexto.preferencias.mercado !== "indiferente",
    candidato.problema.mercado === contexto.preferencias.mercado,
  );
  registar(contexto.preferencias.receita !== "indiferente", candidato.modelo.padrao === contexto.preferencias.receita);
  registar(
    contexto.preferencias.formato !== "hibrido",
    candidato.entrega === (contexto.preferencias.formato === "digital" ? "remoto" : "presencial"),
  );
  registar(
    contexto.preferencias.publicosPreferidos.length > 0,
    candidato.problema.publicos.some((item) => contexto.preferencias.publicosPreferidos.includes(item)),
  );
  registar(
    contexto.preferencias.setoresPreferidos.length > 0,
    contexto.preferencias.setoresPreferidos.includes(candidato.problema.setor),
  );
  const parteprefs = possiveis === 0 ? 0.6 : acertos / possiveis;
  detalhe.push({
    eixo: "preferencias",
    obtido: Math.round(PESOS_FIT.preferencias * parteprefs),
    maximo: PESOS_FIT.preferencias,
    nota:
      possiveis === 0
        ? "Não declaraste preferências fortes, por isso este eixo fica neutro."
        : `Coincide com ${acertos} de ${possiveis} ${possiveis === 1 ? "preferência declarada" : "preferências declaradas"}.`,
  });

  // ── Ambição contra escalabilidade ─────────────────────────────────
  //  Não estima receita — o motor recusa fazê-lo. Afirma uma coisa
  //  estrutural e verificável: um modelo que troca horas por dinheiro
  //  não escala, e propô-lo a quem pediu «escalar» é propor o contrário.
  const pretendida = ESCALABILIDADE_PRETENDIDA[contexto.rendimento.ambicao];
  const oferecida = candidato.modelo.escalabilidade;
  const falta = Math.max(0, pretendida - oferecida);
  const parteAmbicao = Math.max(0, 1 - falta / 3);
  detalhe.push({
    eixo: "ambicao",
    obtido: Math.round(PESOS_FIT.ambicao * parteAmbicao),
    maximo: PESOS_FIT.ambicao,
    nota:
      falta === 0
        ? `${candidato.modelo.rotulo} comporta o que declaraste querer deste negócio.`
        : `Declaraste querer ${contexto.rendimento.ambicao === "escalar" ? "escalar" : contexto.rendimento.ambicao === "crescer" ? "crescer" : "substituir o salário"}, e este modelo cresce sobretudo com mais horas tuas.`,
  });

  // ── Limites brandos ───────────────────────────────────────────────
  //  Três restrições que a interface anunciava com «Pesa em…» e que o
  //  motor não implementava. Pesam aqui, e não eliminam — é o que a copy
  //  sempre prometeu, e a terceira via (descrever um efeito inexistente)
  //  é a única inaceitável neste produto.
  const conflitos: string[] = [];
  if (temRestricao(contexto, "sem-porta-a-porta") && candidato.modelo.dependeAquisicaoDireta) {
    conflitos.push("os primeiros clientes vêm de abordagem direta");
  }
  if (temRestricao(contexto, "sem-noites") && candidato.problema.ocorrenciasForaDeHoras) {
    conflitos.push("o problema gera ocorrências fora de horas");
  }
  if (temRestricao(contexto, "sem-redes-sociais") && candidato.modelo.dependeTrafegoPago) {
    conflitos.push("o modelo vive de trazer tráfego");
  }
  const declarouLimites = ["sem-porta-a-porta", "sem-noites", "sem-redes-sociais"].some((id) =>
    temRestricao(contexto, id as never),
  );
  const parteLimites = conflitos.length === 0 ? 1 : Math.max(0, 1 - conflitos.length * 0.4);
  detalhe.push({
    eixo: "limites",
    obtido: Math.round(PESOS_FIT.limites * parteLimites),
    maximo: PESOS_FIT.limites,
    nota:
      conflitos.length > 0
        ? `Choca com o que pediste: ${conflitos.join("; ")}.`
        : declarouLimites
          ? "Não colide com nenhum dos limites que declaraste."
          : "Não declaraste limites que pesem sobre este modelo.",
  });

  const total = detalhe.reduce((soma, item) => soma + item.obtido, 0);
  return { total, detalhe };
}
