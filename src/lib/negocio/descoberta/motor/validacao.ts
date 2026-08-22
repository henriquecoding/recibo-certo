// ═══════════════════════════════════════════════════════════════════════
//  PLANO DE VALIDAÇÃO — 7, 30 e 90 dias
//  ---------------------------------------------------------------------
//  Ponto 31: uma oportunidade não pode terminar em «parece interessante».
//  O plano é derivado do problema concreto — os passos de `comoValidar`
//  do grafo — e não uma checklist genérica colada a tudo.
//
//  Cada passo tem um CRITÉRIO: o que tem de ser verdade no fim para o
//  passo contar como feito. Sem critério, um plano é uma lista de boas
//  intenções, e a pessoa fica sem saber se avançou.
//
//  A escada liga-se ao que o produto já sabe registar: entrevista,
//  orçamento aceite, pré-venda, piloto pago, venda. É o mesmo vocabulário
//  de `market/hipoteses.ts`, de propósito.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import type { CandidatoBruto } from "./gerador";
import type { PassoValidacao } from "./tipos";

export function planoDeValidacao(candidato: CandidatoBruto): readonly PassoValidacao[] {
  const zona =
    candidato.regiao === "portugal" ? "a zona onde vais testar" : marketRegionLabel(candidato.regiao);
  const cliente = candidato.problema.clientes[0]?.toLocaleLowerCase("pt-PT") ?? "clientes possíveis";
  const passos = candidato.problema.comoValidar;

  return [
    {
      horizonte: "7-dias",
      titulo: "Encontrar quem tem o problema",
      detalhe:
        passos[0] ??
        `Listar vinte ${cliente} em ${zona} e identificar como se chega a cada um sem intermediários.`,
      criterio: "Ter uma lista escrita de vinte nomes concretos, com o contacto de pelo menos dez.",
    },
    {
      horizonte: "30-dias",
      titulo: "Falar e ouvir, sem vender",
      detalhe:
        passos[1] ??
        "Falar com cinco pessoas sobre o que fazem hoje para resolver isto — quanto lhes custa e quantas vezes acontece.",
      criterio:
        "Cinco conversas registadas. Se três não descreverem o problema espontaneamente, a hipótese está errada e o plano acaba aqui.",
    },
    {
      horizonte: "30-dias",
      titulo: "Testar o preço",
      detalhe: `Apresentar ${candidato.modelo.comoSeCobra.toLocaleLowerCase("pt-PT")} a essas pessoas e registar a reação ao número, não à ideia.`,
      criterio: "Um orçamento aceite por escrito. Uma entrevista simpática não conta — e o motor não a promove.",
    },
    {
      horizonte: "90-dias",
      titulo: "Vender um piloto pago",
      detalhe:
        passos[2] ??
        "Vender uma versão pequena e paga, com âmbito e prazo escritos, antes de montar seja o que for.",
      criterio: "Dinheiro recebido, margem observada depois dos custos reais, e o cliente a querer repetir.",
    },
    {
      horizonte: "90-dias",
      titulo: "Confirmar o que pode matar isto",
      detalhe: candidato.problema.testeDeFalsificacao,
      criterio: "Uma resposta escrita: continua, redesenha, ou pára. As três são resultados válidos.",
    },
  ];
}
