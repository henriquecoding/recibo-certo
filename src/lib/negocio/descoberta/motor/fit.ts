// ═══════════════════════════════════════════════════════════════════════
//  FIT PESSOAL — compatibilidade, e só isso
//  ---------------------------------------------------------------------
//  Sete eixos, 100 pontos, cada um com a frase que o explica. Não se soma
//  com mercado nem com confiança: é uma das dimensões do score, não o
//  score. A separação é a tese do produto e está testada.
//
//  A diferença face ao Founder Fit anterior é o que entra: capacidades
//  reais (competência × ativo) em vez de cinco chips, tempo disponível
//  contra o que o modelo exige, e a equipa que o modelo pressupõe.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import {
  horasSemanais,
  pessoasDisponiveis,
  tetoDeCapital,
  type OpportunityContext,
} from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type { ContribuicaoFit } from "./tipos";

export const PESOS_FIT = Object.freeze({
  capacidade: 30,
  ativos: 15,
  tempo: 15,
  capital: 15,
  preferencias: 10,
  geografia: 10,
  equipa: 5,
});

export function calcularFit(
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
): { total: number; detalhe: readonly ContribuicaoFit[] } {
  const detalhe: ContribuicaoFit[] = [];

  // ── Capacidade: quanto do que o trabalho pede está coberto ────────
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
          : `Tens o essencial de ${melhor.capacidade.rotulo.toLocaleLowerCase("pt-PT")}, com folga por preencher.`,
  });

  // ── Ativos ────────────────────────────────────────────────────────
  const ativos = new Set(contexto.ativos);
  const uteis = candidato.capacidades.flatMap((item) => item.capacidade.ativosUteis);
  const uteisQueTem = uteis.filter((ativo) => ativos.has(ativo));
  const emFalta = candidato.capacidades.flatMap((item) => item.ativosEmFalta);
  const parteAtivos =
    emFalta.length > 0 ? 0 : uteis.length === 0 ? 1 : 0.5 + 0.5 * (uteisQueTem.length / uteis.length);
  detalhe.push({
    eixo: "ativos",
    obtido: Math.round(PESOS_FIT.ativos * parteAtivos),
    maximo: PESOS_FIT.ativos,
    nota:
      emFalta.length > 0
        ? "Falta pelo menos um meio que este trabalho exige."
        : uteisQueTem.length > 0
          ? `O que já tens serve: ${uteisQueTem.length} ${uteisQueTem.length === 1 ? "meio aproveitado" : "meios aproveitados"}.`
          : "Não exige meios que não tenhas.",
  });

  // ── Tempo ─────────────────────────────────────────────────────────
  const horas = horasSemanais(contexto);
  const exigencia = candidato.modelo.precisaEquipa ? 30 : candidato.modelo.precisaLojaFisica ? 25 : 10;
  const parteTempo = Math.min(1, horas / exigencia);
  detalhe.push({
    eixo: "tempo",
    obtido: Math.round(PESOS_FIT.tempo * parteTempo),
    maximo: PESOS_FIT.tempo,
    nota:
      parteTempo >= 1
        ? `As ${horas} horas por semana que declaraste chegam para este modelo.`
        : `Este modelo pede perto de ${exigencia} horas por semana e declaraste ${horas}.`,
  });

  // ── Capital ───────────────────────────────────────────────────────
  const teto = tetoDeCapital(contexto);
  const minimo = candidato.modelo.capitalTipico.min;
  const maximoModelo = candidato.modelo.capitalTipico.max;
  let parteCapital = 0.5;
  let notaCapital = "Não declaraste capital, por isso este eixo não pontua a teu favor nem contra.";
  if (teto !== undefined) {
    if (teto >= maximoModelo) {
      parteCapital = 1;
      notaCapital = "O capital que declaraste cobre o topo do intervalo estimado.";
    } else if (teto >= minimo) {
      parteCapital = 0.6;
      notaCapital = "O capital que declaraste cobre o mínimo, mas não o topo do intervalo.";
    } else {
      parteCapital = 0;
      notaCapital = "O capital declarado fica abaixo do mínimo estimado para arrancar.";
    }
  }
  detalhe.push({
    eixo: "capital",
    obtido: Math.round(PESOS_FIT.capital * parteCapital),
    maximo: PESOS_FIT.capital,
    nota: notaCapital,
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
  registar(contexto.preferencias.mercado !== "indiferente", candidato.problema.mercado === contexto.preferencias.mercado);
  registar(contexto.preferencias.receita !== "indiferente", candidato.modelo.padrao === contexto.preferencias.receita);
  registar(contexto.preferencias.formato !== "hibrido", candidato.entrega === (contexto.preferencias.formato === "digital" ? "remoto" : "presencial"));
  registar(contexto.preferencias.publicosPreferidos.length > 0, candidato.problema.publicos.some((item) => contexto.preferencias.publicosPreferidos.includes(item)));
  registar(contexto.preferencias.setoresPreferidos.length > 0, contexto.preferencias.setoresPreferidos.includes(candidato.problema.setor));
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

  // ── Geografia ─────────────────────────────────────────────────────
  const nacional = candidato.problema.regioes.includes("portugal");
  const zonaFixada = contexto.localizacao.regiao !== "portugal";
  const parteGeo = nacional ? 1 : zonaFixada ? 1 : 0.5;
  detalhe.push({
    eixo: "geografia",
    obtido: Math.round(PESOS_FIT.geografia * parteGeo),
    maximo: PESOS_FIT.geografia,
    nota: nacional
      ? "O problema existe em qualquer zona do país."
      : zonaFixada
        ? `O problema é específico de ${candidato.problema.regioes.map(marketRegionLabel).join(", ")} — e é onde estás.`
        : `Depende de estar em ${candidato.problema.regioes.map(marketRegionLabel).join(" ou ")}, e ainda não fixaste zona.`,
  });

  // ── Equipa ────────────────────────────────────────────────────────
  const pessoas = pessoasDisponiveis(contexto);
  const parteEquipa = candidato.modelo.precisaEquipa ? (pessoas >= 2 ? 1 : 0.3) : pessoas >= 1 ? 1 : 0;
  detalhe.push({
    eixo: "equipa",
    obtido: Math.round(PESOS_FIT.equipa * parteEquipa),
    maximo: PESOS_FIT.equipa,
    nota: candidato.modelo.precisaEquipa
      ? pessoas >= 2
        ? "És mais do que uma pessoa, e este modelo precisa disso."
        : "Este modelo precisa de mais gente do que declaraste ter."
      : "Uma pessoa chega para arrancar isto.",
  });

  const total = detalhe.reduce((soma, item) => soma + item.obtido, 0);
  return { total, detalhe };
}
