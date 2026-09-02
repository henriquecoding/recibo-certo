// ═══════════════════════════════════════════════════════════════════════
//  O QUARTO PASSO DO ARCO — contratar
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O PASSO EXISTIA E NÃO ESTAVA NO PERCURSO                             │
//  │                                                                     │
//  │ O painel já o tinha resolvido: `lib/dashboard/navegacao.ts` declara  │
//  │ quatro etapas — descobrir o que vender, a que preço, se as contas    │
//  │ fecham, e quem entra quando já não chega uma pessoa — e diz, por     │
//  │ escrito, que enterrar a contratação em «outros simuladores» era      │
//  │ repetir à escala de um destino o erro que aquele ficheiro corrige.   │
//  │                                                                     │
//  │ A leitura pública ficou uma etapa atrás. «Depois do preço» bifurcava │
//  │ em recibos verdes e empresa e ACABAVA ali; «Depois do recibo» e      │
//  │ «Antes de decidir» também. O planeador de contratação só se          │
//  │ alcançava pelo lado patronal do foco «Salário» — atrás de um botão   │
//  │ que ninguém carrega sem já saber que ele existe — e a única menção   │
//  │ a salário nas outras leituras mandava quem tem negócio simular o     │
//  │ recibo de vencimento DELE, que é o lado errado da bifurcação.        │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── Porque é que isto é uma tabela e não copy em três páginas ─────────
//
//  Porque já houve três percursos escritos à mão e eles divergiram: um
//  dizia que salário é «um percurso paralelo», outro não o mencionava, e
//  nenhum sabia da contratação. Escrever a quarta etapa em três sítios era
//  garantir a quarta divergência.
//
//  Aqui o DESTINO é um só e a MOLDURA muda com a origem — porque a razão
//  para contratar é mesmo diferente conforme se chega do preço (o posto
//  obriga a faturar), dos recibos verdes (contratar não exige sociedade)
//  ou da empresa (a sociedade raramente se abre para ficar uma pessoa).
//
//  ── Porque NÃO nasce um sexto foco ────────────────────────────────────
//
//  Os cinco focos são um contrato: cinco perguntas, cinco verbos, cinco
//  rotas, cinco palcos, e uma matriz móvel que os mede. Contratar não é
//  uma sexta pergunta — é o outro lado da que já existe («o salário, dos
//  dois lados»). Por isso a leitura editorial deste passo é a rota do
//  foco «Salário» com o percurso patronal declarado, e não uma rota nova.
// ═══════════════════════════════════════════════════════════════════════

/**
 * De onde se chega ao passo de contratar. É sempre um passo do arco.
 *
 * `descobrir` entrou depois das outras três, e a razão de ter ficado de
 * fora é a mesma que fez o passo desaparecer da primeira vez: a leitura da
 * raiz desenha o MESMO percurso (01 descobrir → 02 preço → 03 estrutura)
 * noutro ficheiro, e quem corrige três esquece o quarto. A lista passa a
 * ser a fonte — o teste percorre-a e exige um cartão por origem, por isso
 * uma origem nova sem cartão reprova em vez de passar despercebida.
 */
export const ORIGENS_ARCO = ["descobrir", "preco", "recibos", "empresa"] as const;

export type OrigemArcoContratacao = (typeof ORIGENS_ARCO)[number];

/**
 * O destino, escrito uma vez.
 *
 * `ferramenta` é o canónico do planeador; `leitura` é o lado patronal do
 * foco «Salário», que é onde a decisão se explica antes de se calcular.
 */
export const PASSO_CONTRATACAO = Object.freeze({
  /** A posição no arco: descobrir → preço → estrutura → contratar. */
  etapa: "04",
  rotulo: "Crescer",
  ferramenta: "/ferramentas/planeador-contratacao",
  leitura: "/inicio/salario?percurso=empregador",
  guia: "/guias/contratar-primeiro-trabalhador",
  cta: "Planear uma contratação",
  ctaLeitura: "Ver o percurso de quem contrata",
});

/** O parâmetro que leva a origem até à medição, sem sair do vocabulário. */
export const PARAMETRO_ORIGEM = "de";

/** O href do planeador com a origem declarada — para atribuição, não para estado. */
export function hrefPlaneador(origem: OrigemArcoContratacao): string {
  return `${PASSO_CONTRATACAO.ferramenta}?${PARAMETRO_ORIGEM}=${origem}`;
}

export interface EntradaArcoContratacao {
  /** A sobrancelha do cartão. Diz sempre a etapa, para o arco ser legível. */
  sobrancelha: string;
  titulo: string;
  /**
   * Porque é que este passo vem a seguir A ESTE. Uma oração por ideia, sem
   * taxas nem valores: os números do posto vivem no motor patronal, com
   * proveniência, e não numa frase de percurso.
   */
  texto: string;
}

export const ENTRADA_CONTRATACAO: Readonly<
  Record<OrigemArcoContratacao, EntradaArcoContratacao>
> = Object.freeze({
  // Aqui a pessoa está no passo 01, e o cartão tem de o dizer: empurrar
  // quem ainda está a validar uma hipótese para uma contratação seria o
  // erro simétrico do que este ficheiro corrige. O que justifica a
  // presença do cartão é o horizonte — o custo do posto muda o que a
  // hipótese tem de gerar, e isso decide-se enquanto ela é hipótese.
  descobrir: {
    sobrancelha: `${PASSO_CONTRATACAO.etapa} · Ainda longe, mas é para onde isto vai`,
    titulo: "Uma hipótese que pega acaba por precisar de mais uma pessoa",
    texto:
      "Não é para agora: antes disto há o preço e a forma de operar. Fica à vista porque um posto de trabalho custa mais do que o vencimento, e saber quanto muda o que a hipótese tem de gerar para valer a pena — melhor sabê-lo enquanto ela ainda é uma hipótese.",
  },
  preco: {
    sobrancelha: `${PASSO_CONTRATACAO.etapa} · Quando deixa de caber numa pessoa`,
    titulo: "Contratar é o passo que o preço tem de aguentar",
    texto:
      "Um posto de trabalho custa mais do que o vencimento: leva a contribuição da entidade empregadora, os subsídios, a refeição e o seguro de acidentes de trabalho. Antes de fazer a proposta, vê o custo inteiro e o que ele obriga a faturar.",
  },
  recibos: {
    sobrancelha: `${PASSO_CONTRATACAO.etapa} · Quando o trabalho passa a ser de dois`,
    titulo: "Contratar não obriga a abrir sociedade",
    texto:
      "Um empresário em nome individual pode ter trabalhadores. O que muda não é a forma jurídica: é o que passa a sair da conta todos os meses, e um conjunto de obrigações — comunicação da admissão, seguro, processamento — que passam a ser tuas.",
  },
  empresa: {
    sobrancelha: `${PASSO_CONTRATACAO.etapa} · Depois de a sociedade existir`,
    titulo: "Uma sociedade raramente se abre para ficar uma pessoa",
    texto:
      "A régua diz quando compensa mudar de estrutura; não diz o que custa a primeira pessoa que entra. O custo do posto, o calendário do primeiro ano e a capacidade que ele exige são outra conta — e é melhor fazê-la antes da proposta do que depois.",
  },
});
