// ═══════════════════════════════════════════════════════════════════════
//  OS CINCO FOCOS DA HOMEPAGE
//  ---------------------------------------------------------------------
//  Antes desta tabela havia DOIS eixos a ramificar a mesma página:
//  `Perfil` (localStorage, quatro valores, ramificava o Hero e a
//  calculadora) e `foco` (URL, dois valores, ramificava a página inteira).
//  Critérios diferentes, nenhum a saber do outro, e um deles invisível no
//  URL. Ter dois modelos mentais para o mesmo gesto era o defeito de que
//  todos os outros descendiam.
//
//  Fica um eixo: `foco`. E fica com a pergunta certa.
//
//  ── Porque a coluna do meio é uma PERGUNTA e não uma identidade ───────
//
//  O seletor antigo perguntava «sou trabalhador independente ou por conta
//  de outrem?». A NN/g tem cinco razões documentadas contra navegação por
//  audiência, e três batem em cheio aqui: metade do público tem salário E
//  recibos verdes e não cabe numa categoria; auto-identificar-se «cria um
//  passo adicional e tira as pessoas do modo-tarefa»; e quem escolhe um
//  lado fica sem saber o que havia do outro.
//
//  O `lib/navegacao.ts` já tinha escrito isto em comentário há muito:
//  a pergunta deixou de ser «quem és?» e passou a ser «em que ponto
//  estás?». Os pilares já eram tarefas; o seletor é que ficou para trás.
//
//  ── Porque cada foco tem um VERBO ─────────────────────────────────────
//
//  É a regra que impede a recaída. Havia UM `HeroCard` com uma coreografia
//  só, e três dos quatro cartões declaravam `modoLinhas: "deducoes"` —
//  Recibos verdes, Salário e Empresa mostravam a mesma cascata de deduções
//  com números diferentes. Uma máquina com três fatos, não três palcos.
//
//  Com cinco verbos distintos — eliminar, compor, repartir, conferir,
//  virar — nenhum palco pode voltar a ser uma cascata de deduções com
//  outros números, porque só um dos cinco tem como verbo «repartir».
// ═══════════════════════════════════════════════════════════════════════

import type { FocoHomepage } from "@/lib/foco-homepage";

/**
 * O tom do palco.
 *
 * Regra: **escuro** quando o assunto é um processo que não se vê, **claro**
 * quando é um documento que se seguraria na mão. Não é decoração — é uma
 * regra que se aplica sozinha a qualquer palco futuro.
 */
export type TomPalco = "claro" | "escuro";

export interface DefinicaoFoco {
  id: FocoHomepage;
  /** O nome na régua. Uma palavra sempre que possível. */
  label: string;
  /**
   * A pergunta que este foco responde e nenhum outro responde.
   *
   * ── As regras que estas cinco frases cumprem ────────────────────────
   *
   * As primeiras eram cinco frases escritas em cinco momentos: uma tinha
   * dez palavras e duas orações («Deste recibo, quanto é meu e quanto
   * tenho de guardar?»), outra tinha três. Lidas em coluna, como a
   * bússola as mostra, não pareciam cinco entradas do mesmo instrumento
   * — pareciam cinco textos.
   *
   *  1. **Na primeira pessoa, e como alguém as diria em voz alta.** Não
   *     «Formação de preço»; «Quanto tenho de cobrar?».
   *  2. **Uma oração só, entre três e sete palavras.** Uma pergunta que
   *     precisa de vírgula já é duas perguntas.
   *  3. **A pergunta, e não a resposta.** O que o foco RESPONDE — o
   *     valor, a data, o limiar — vive no painel, e é lá que a
   *     especificidade tem de estar.
   */
  pergunta: string;
  /** O verbo do palco. Cinco focos, cinco verbos, sem exceção. */
  verbo: "eliminar" | "compor" | "repartir" | "conferir" | "virar";
  /** O nome do palco, para a régua de atos e para os roteiros. */
  palco: string;
  tom: TomPalco;
  /** O ícone, resolvido por `iconeDe` em `ferramentas/icon-map`. */
  icone: string;
  /** A ferramenta: o destino do CTA primário do hero. */
  ferramenta: string;
  /** O rótulo do CTA primário. */
  ctaPrimario: string;
  /** Título e descrição sociais. */
  titulo: string;
  descricao: string;
}

/**
 * A ordem é o ciclo de vida, e é contrato: quem aprendeu onde está
 * «Recibos» acerta-lhe sem olhar, e trocar posições desfaz isso sem aviso.
 *
 *   que negócio abrir → quanto cobrar → quanto fica de cada recibo →
 *   quanto fica do salário → e se fosse uma empresa
 */
export const FOCOS: readonly DefinicaoFoco[] = Object.freeze([
  {
    id: "descobrir",
    label: "Descobrir",
    pergunta: "Que negócio posso testar?",
    verbo: "eliminar",
    palco: "Mesa de decisão",
    tom: "escuro",
    icone: "Lightbulb",
    ferramenta: "/ferramentas/descobrir-negocio",
    ctaPrimario: "Descobrir o que posso testar",
    titulo: "Descobrir que negócio testar em Portugal",
    descricao:
      "Cruza competências, restrições e sinais oficiais para construir uma hipótese de negócio testável — com lacunas, riscos e próximo passo visíveis.",
  },
  {
    id: "preco",
    label: "Preço",
    pergunta: "Quanto tenho de cobrar?",
    verbo: "compor",
    palco: "Formação do preço",
    tom: "claro",
    icone: "Coin",
    ferramenta: "/ferramentas/calcular-preco",
    ctaPrimario: "Calcular o meu preço",
    // Era «Formar um preço que sustenta o negócio» — uma frase sobre o
    // que a ferramenta faz, sem uma única palavra do que alguém escreve
    // para a encontrar. Os quatro outros focos já tinham a procura no
    // título; este era o que estava de fora.
    titulo: "Quanto cobrar — calcular o preço de um serviço ou produto",
    descricao:
      "Custos, tempo, comissões, IVA e margem numa só composição — e o que muda no preço consoante vendas direto, num marketplace, isento ou a recibos verdes.",
  },
  {
    id: "recibos",
    label: "Recibos verdes",
    pergunta: "Deste recibo, quanto é mesmo meu?",
    verbo: "repartir",
    palco: "A repartição",
    tom: "claro",
    icone: "Receipt",
    ferramenta: "/ferramentas/recibos-verdes",
    ctaPrimario: "Calcular o meu recibo",
    titulo: "Quanto fica de cada recibo verde",
    descricao:
      "De cada recibo, o que é teu, o que é retenção de IRS e o que tens de reservar para a Segurança Social — com a data em que sai da conta.",
  },
  {
    id: "salario",
    label: "Salário",
    pergunta: "O meu recibo de vencimento está certo?",
    verbo: "conferir",
    palco: "A conferência",
    tom: "claro",
    icone: "Briefcase",
    ferramenta: "/ferramentas/recibo-vencimento",
    ctaPrimario: "Conferir o meu recibo",
    titulo: "Conferir o recibo de vencimento, linha a linha",
    descricao:
      "Recalcula o teu líquido a partir do bruto — Segurança Social, retenção de IRS e subsídios — e põe-no ao lado do recibo que recebeste.",
  },
  {
    id: "empresa",
    label: "Empresa",
    pergunta: "Compensa-me abrir empresa?",
    verbo: "virar",
    palco: "O ponto de viragem",
    tom: "escuro",
    icone: "Building",
    ferramenta: "/ferramentas/simulador-empresa",
    ctaPrimario: "Simular a minha empresa",
    titulo: "A partir de quando compensa abrir empresa",
    descricao:
      "Recibos verdes e sociedade lado a lado, com o custo fixo de ter empresa contado e o ponto de faturação em que as duas se cruzam.",
  },
]);

export const FOCO_POR_ID = new Map(FOCOS.map((foco) => [foco.id, foco]));

/** O href da leitura editorial de um foco. */
export const hrefDoFoco = (id: FocoHomepage) => `/?foco=${id}`;

/**
 * A ferramenta de cada foco, indexada pelo id.
 *
 * Existe porque `PILARES` e esta tabela têm de concordar, e um teste
 * compara-as: **a régua leva à leitura; o hero leva à ferramenta.**
 */
export const FERRAMENTA_DO_FOCO: Record<FocoHomepage, string> = Object.freeze(
  Object.fromEntries(FOCOS.map((foco) => [foco.id, foco.ferramenta])),
) as Record<FocoHomepage, string>;

/**
 * O foco → o simulador que a homepage abre em `#calculadora`.
 *
 * ── Porque é que isto tem de existir ─────────────────────────────────
 *
 * A homepage tem, hoje, DOIS eixos — e o cabeçalho deste ficheiro diz que
 * isso era o defeito de que todos os outros descendiam. O eixo `foco` vive
 * no URL e manda no hero; o eixo `Perfil` vive em `localStorage` e manda em
 * tudo o que está por baixo (a calculadora, o «Explorar», o FAQ).
 *
 * Enquanto o hero antigo existiu, os dois encontravam-se num sítio: era ele
 * que escrevia o `Perfil`. Ao substituí-lo pela bússola, esse encontro
 * desapareceu e as duas metades da página deixaram de se falar — escolhias
 * uma pergunta em cima e a calculadora continuava no que estivesse guardado
 * de uma visita anterior.
 *
 * Isto volta a ligá-las, por DERIVAÇÃO e não à mão: é o inverso exato de
 * `FOCO_DO_PERFIL_ANTIGO`, calculado, com um teste a exigir que continue a
 * ser a inversa. Escrever as duas tabelas em separado era garantir que um
 * dia discordavam.
 *
 * É parcial de propósito: «Preço» não tem simulador na homepage, e por isso
 * não tem entrada. Inventar-lhe uma levaria a pergunta a um simulador que
 * não a responde.
 */
export const PERFIL_DO_FOCO: Partial<Record<FocoHomepage, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries({
      independente: "recibos",
      dependente: "salario",
      empresa: "empresa",
      comparar: "descobrir",
    } satisfies Record<string, FocoHomepage>).map(([perfil, foco]) => [foco, perfil]),
  ),
);

/**
 * O perfil antigo → o foco que lhe corresponde.
 *
 * Só para a migração de quem tem `perfil` guardado de visitas anteriores.
 * NUNCA para navegar automaticamente: redirecionar alguém a partir de
 * estado invisível é o defeito que esta tabela existe para corrigir, com
 * outra roupa. Serve para MARCAR a régua, e mais nada.
 */
export const FOCO_DO_PERFIL_ANTIGO: Record<string, FocoHomepage> = Object.freeze({
  independente: "recibos",
  dependente: "salario",
  empresa: "empresa",
  comparar: "descobrir",
});
