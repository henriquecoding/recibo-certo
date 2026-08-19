// ═══════════════════════════════════════════════════════════════════════
//  OS RESUMOS DAS SECÇÕES RECOLHIDAS
//  ---------------------------------------------------------------------
//  Uma revelação progressiva vale-se toda pelo gatilho. Se a linha fechada
//  disser «Tesouraria», a pessoa tem de a abrir para saber se lhe
//  interessa — e a carga cognitiva não desceu, só mudou de sítio (agora
//  são dez decisões de «abro ou não abro?» em vez de dez blocos de texto).
//
//  Se disser «guarda 47 € por mês · IVA a 20 de fevereiro», muita gente já
//  tem o que precisava e NÃO abre. É essa a diferença entre esconder e
//  resumir, e é o resumo que faz a densidade descer de verdade.
//
//  Por isso todos estes textos saem de números REAIS do resultado. Nenhum
//  é uma etiqueta genérica escrita à mão.
//
//  ⚠️ Devolver `undefined` é uma resposta legítima: quando não há nada de
//  concreto a antecipar, uma frase vaga («vê mais detalhes») é pior do que
//  nenhuma — ocupa uma linha para não dizer nada.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import type { ResultadoPreco } from "./tipos";
import type { SeccaoPreco } from "./nivel";

const DATA_CURTA = { day: "numeric", month: "short" } as const;

const dataLegivel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", DATA_CURTA);

const plural = (n: number, um: string, muitos: string): string => `${n} ${n === 1 ? um : muitos}`;

/**
 * O que se sabe de uma secção sem a abrir.
 *
 * `r` é o resultado completo do motor — a mesma fonte que a secção usa lá
 * dentro, para que o resumo nunca possa contradizer o conteúdo.
 */
export function resumoDe(seccao: SeccaoPreco, r: ResultadoPreco): string | undefined {
  switch (seccao) {
    case "caixa": {
      const fica = r.caixa.entraNaConta - r.caixa.saiDepois;
      if (r.caixa.cobradoAoCliente <= 0) return undefined;
      // A distância entre «vendi por 100 €» e «tenho 100 €» dita em uma
      // linha. É a pergunta que a secção responde, com os dois números.
      return `O cliente paga ${fmt(r.caixa.cobradoAoCliente)} · ficam ${fmt(Math.max(0, fica))} contigo`;
    }

    case "tesouraria": {
      const t = r.tesouraria;
      if (!t || t.reservaMensal <= 0) return undefined;
      // A próxima saída COM valor. Uma declaração sem quantia não é uma
      // saída de dinheiro, e anunciá-la aqui faria reservar duas vezes.
      const proxima = t.proximos.find((p) => p.valor !== null && p.valor > 0);
      const quando = proxima ? ` · ${proxima.titulo} a ${dataLegivel(proxima.data)}` : "";
      return `Guardar ${fmt(t.reservaMensal)} por mês${quando}`;
    }

    case "sociedade": {
      const s = r.sociedade;
      if (!s) return undefined;
      return "Do lucro da sociedade ao que te chega à mão";
    }

    case "desconto": {
      const d = r.desconto;
      if (!d) return undefined;
      return `Um desconto de ${pct(d.percentagem)} leva a margem de ${pct(d.margemAntes)} a ${pct(d.margemDepois)}`;
    }

    case "memoria": {
      const n = r.explicacao.length;
      if (n === 0) return undefined;
      // Dizer que TEM fonte é o que distingue esta secção de um log.
      return `${plural(n, "linha", "linhas")}, com a base legal de cada uma`;
    }

    case "notas": {
      const n = r.avisos.filter((a) => a.severidade === "info").length;
      if (n === 0) return undefined;
      return plural(n, "nota sobre este cenário", "notas sobre este cenário");
    }

    case "slider":
      if (!r.ok) return undefined;
      return `Experimenta outro preço e vê o que muda em ${fmt(r.pvp)}`;

    case "objetivo_invertido":
      if (!r.ok) return undefined;
      return "Quanto tenho de vender para ganhar o que quero?";

    case "cenarios":
      if (!r.ok) return undefined;
      return "E se o custo subisse, ou vendesses menos?";

    case "conclusao":
      if (!r.ok) return undefined;
      return "Fontes, limites e o que fazer a seguir";
  }
}
