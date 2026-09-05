// ═══════════════════════════════════════════════════════════════════════
//  A PERGUNTA QUE VEM ANTES DO SIMULADOR
//  ---------------------------------------------------------------------
//  Os dois simuladores guiados — recibos verdes e empresa — começam por
//  pedir um número: quanto vais faturar. Esse número pressupõe uma decisão
//  que muita gente ainda não tomou: o que é que vai vender.
//
//  Quem não a tomou não fica sem resposta — inventa o número. E sai da
//  ferramenta com IRS, Segurança Social ou IRC calculados sobre um
//  palpite, com o ar de autoridade de uma simulação e com a data de
//  revisão fiscal por baixo. É o pior desfecho possível: não é um erro
//  visível, é um erro credível.
//
//  ── O QUE ESTE MÓDULO É ────────────────────────────────────────────
//  O contrato da terceira porta, num sítio só. Estava escrito à mão
//  dentro do simulador de empresa e não existia de todo no de recibos
//  verdes — duas superfícies para a mesma decisão é uma para divergir.
//
//  Aqui vive: quem pode sair, para onde, com que palavras, que número é
//  que o simulador ia pedir a seguir (é essa a razão de sair), e o que se
//  diz a quem volta. A UI é `components/simulador/PortaDescoberta.tsx`; o
//  bilhete de regresso é `store/regresso-descoberta.ts`.
//
//  ── O QUE ESTE MÓDULO NÃO FAZ ──────────────────────────────────────
//  Não importa o catálogo de ferramentas. As rotas estão escritas, e é o
//  teste `simuladores-porta-descoberta.test.ts` que as confronta com
//  `CATALOGO_FERRAMENTAS` — o catálogo é grande e não tem de viajar no
//  bundle de um cartão com três linhas de texto.
//
//  Não decide nada sobre fiscalidade, não guarda nada e não mede nada.
// ═══════════════════════════════════════════════════════════════════════

/** Onde vive o motor de descoberta. Confirmado contra o catálogo em teste. */
export const ROTA_DESCOBERTA = "/ferramentas/descobrir-negocio";

/**
 * Os simuladores que têm esta porta.
 *
 * São os dois que pedem faturação à entrada. Um comparador de regimes ou
 * uma calculadora de preço não pertencem aqui: a pergunta anterior deles
 * é outra, e uma porta que aparece em todo o lado deixa de significar
 * seja o que for.
 *
 * Os ids são os do catálogo de ferramentas — e são também o `tool_id` da
 * medição, para o painel não ter de traduzir nada.
 */
export type SimuladorDeOrigem = "recibos-verdes" | "simulador-empresa";

export interface PortaDescobertaDef {
  /** O id no catálogo de ferramentas — e o `tool_id` da medição. */
  readonly id: SimuladorDeOrigem;
  /** A rota da ferramenta de origem, para o caminho de volta. */
  readonly rota: string;
  /**
   * Como se chama. É o `title` do catálogo, palavra por palavra — quem
   * volta tem de reconhecer o sítio de onde saiu, e um nome de conveniência
   * escrito aqui deixava de acompanhar o dia em que a ferramenta mudasse
   * de nome. Verificado em teste contra `CATALOGO_FERRAMENTAS`.
   */
  readonly nome: string;
  /** O título da porta: a situação de quem a deve usar. */
  readonly titulo: string;
  /** Porque é que sair daqui é melhor do que continuar a preencher. */
  readonly descricao: string;
  /**
   * O que este simulador pede a seguir e que ainda não existe.
   *
   * Não é decoração: é a justificação da porta, e é o que a nota de
   * segunda oportunidade diz por palavras.
   */
  readonly numeroQuePede: string;
  /** O que se diz a quem chega ao motor de descoberta vindo daqui. */
  readonly convite: string;
}

export const PORTAS_DESCOBERTA: Readonly<Record<SimuladorDeOrigem, PortaDescobertaDef>> = {
  "recibos-verdes": {
    id: "recibos-verdes",
    rota: "/ferramentas/recibos-verdes",
    nome: "Simulador de recibos verdes",
    titulo: "Ainda não sei o que vou vender",
    descricao:
      "Descobre o que podes fazer a partir do que já sabes, com sinais oficiais de mercado — e volta aqui para ver quanto disso fica mesmo para ti.",
    numeroQuePede: "o valor que vais faturar",
    convite:
      "Vieste do Simulador de recibos verdes. Escolhe uma hipótese e volta lá para ver o que sobra depois de IRS e Segurança Social.",
  },
  "simulador-empresa": {
    id: "simulador-empresa",
    rota: "/ferramentas/simulador-empresa",
    nome: "Simulador de empresa (Lda)",
    titulo: "Ainda não sei que negócio vou ter",
    descricao:
      "Descobre o que podes vender a partir do que sabes fazer, com sinais oficiais de mercado — e volta aqui com números que não são um palpite.",
    numeroQuePede: "a faturação prevista e os custos fixos",
    convite:
      "Vieste do Simulador de empresa (Lda). Escolhe uma hipótese e volta lá para ver o IRC, os dividendos e os custos de a ter em sociedade.",
  },
} as const;

/** A lista, para quem itera. A ordem não tem significado. */
export const SIMULADORES_COM_PORTA = Object.keys(PORTAS_DESCOBERTA) as readonly SimuladorDeOrigem[];

/** `true` só para um id que este contrato conhece. */
export function ehSimuladorDeOrigem(valor: unknown): valor is SimuladorDeOrigem {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(PORTAS_DESCOBERTA, valor);
}

/**
 * Os `step_id` da medição, escritos uma vez.
 *
 * §8.2 — nenhum deles transporta valor nenhum: dizem que alguém saiu pela
 * porta e que alguém voltou por ela, e mais nada. É o que responde a «esta
 * porta serve para alguma coisa?» sem saber o que a pessoa faz.
 */
export const PASSO_SAIDA = "sem_negocio_para_descoberta";
export const PASSO_REGRESSO_OFERECIDO = "regresso_ao_simulador_oferecido";
export const PASSO_REGRESSO_ACEITE = "regresso_ao_simulador_aceite";
