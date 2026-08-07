// ═══════════════════════════════════════════════════════════════════════
//  OS DADOS DO ANO QUE UM GUIA PODE MESMO MOSTRAR
//  ---------------------------------------------------------------------
//  Entre o que o pacote entregou e o que aparece na página há dois filtros,
//  e nenhum deles é opcional:
//
//    1. as entradas que o próprio pacote marcou «confirmar» não se
//       publicam (regra 3 do pacote);
//    2. as divergências apuradas na verificação de 06/08/2026 aplicam-se —
//       corrigindo o valor quando há um certo, retirando-o quando não há.
//
//  Fazer isto AQUI, e não no ficheiro gerado, mantém `conteudo.ts` a ser o
//  que diz ser: o pacote, tal e qual. A diferença entre o que o pacote
//  disse e o que o site mostra fica sempre legível — em `correcoes.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { CONTEUDO_EXPANSAO, type DadoAnual } from "./conteudo";
import { correcoesDoGuia } from "./correcoes";
import { dadosAcrescentados } from "./dados-acrescentados";

export interface DadosDoGuia {
  /** Prontos para mostrar. */
  publicaveis: DadoAnual[];
  /** Quantos ficaram de fora, e porquê — para a página poder dizer que
      existem sem os mostrar, e para o verificador os contar. */
  retidos: { label: string; razao: "pacote-por-confirmar" | "verificacao-sem-confirmacao" }[];
  /** Valores que a verificação corrigiu. Já vão aplicados em `publicaveis`. */
  corrigidos: { label: string; noPacote: string; verificado: string }[];
}

export function dadosDoGuia(slug: string): DadosDoGuia {
  const conteudo = CONTEUDO_EXPANSAO[slug];
  if (!conteudo) return { publicaveis: [], retidos: [], corrigidos: [] };

  const correcoes = correcoesDoGuia(slug);
  const publicaveis: DadoAnual[] = [];
  const retidos: DadosDoGuia["retidos"] = [];
  const corrigidos: DadosDoGuia["corrigidos"] = [];

  for (const d of conteudo.dados) {
    const correcao = correcoes.find((c) => c.dado === d.label);

    if (correcao?.acao === "reter") {
      retidos.push({ label: d.label, razao: "verificacao-sem-confirmacao" });
      continue;
    }
    // A ordem importa: uma correção verificada VENCE o `porConfirmar` do
    // pacote. «Confirmar» é um pedido, e uma correção registada aqui é a
    // resposta a esse pedido — foi-se ler o artigo e ficou lá escrito o que
    // se leu. Testar `porConfirmar` primeiro deixava o valor retido para
    // sempre, e o trabalho de verificação sem efeito nenhum na página.
    if (correcao?.acao === "corrigir" && correcao.verificado) {
      corrigidos.push({ label: d.label, noPacote: d.valor, verificado: correcao.verificado });
      publicaveis.push({ ...d, valor: correcao.verificado, nota: correcao.notaVerificada ?? d.nota, porConfirmar: false });
      continue;
    }
    if (d.porConfirmar) {
      retidos.push({ label: d.label, razao: "pacote-por-confirmar" });
      continue;
    }
    publicaveis.push(d);
  }

  // Os valores levantados durante a redação entram no fim, na ordem em que
  // foram declarados. Passam pelo mesmo filtro de `porConfirmar` que os do
  // pacote — não há via rápida para publicar um número.
  for (const d of dadosAcrescentados(slug)) {
    if (d.porConfirmar) {
      retidos.push({ label: d.label, razao: "pacote-por-confirmar" });
      continue;
    }
    publicaveis.push(d);
  }

  return { publicaveis, retidos, corrigidos };
}
