// ═══════════════════════════════════════════════════════════════════════
//  MODELOS DE RECEITA — como o dinheiro entra, e o que isso custa
//  ---------------------------------------------------------------------
//  O mesmo problema atacado como avença ou como projeto é um negócio
//  diferente: muda o capital, o tempo até à primeira receita, a
//  volatilidade e quem consegue fazê-lo. É por isso que o modelo é um eixo
//  de geração e não um campo do dossier.
//
//  ── SOBRE OS INTERVALOS ────────────────────────────────────────────
//  São ESTIMATIVAS e estão marcadas como tal. Não vêm de nenhuma
//  observação portuguesa — vêm da estrutura do próprio modelo: uma avença
//  de serviço sem stock nem loja não precisa de capital porque não há nada
//  para comprar; uma operação com equipa precisa de tesouraria para pagar
//  salários antes de receber.
//
//  A `limitacao` de cada uma diz isso à cara. Nenhuma se disfarça de dado
//  de mercado, e o `cenarioPreco` leva a decisão para o motor canónico de
//  preço, que é a única porta de preço do produto.
// ═══════════════════════════════════════════════════════════════════════
import { intervalo } from "../../proveniencia";
import type { Proveniencia } from "../../proveniencia";
import type { ModeloReceita } from "../tipos";

/** A proveniência partilhada por todos os intervalos deste ficheiro. */
const estrutural = (limitacao: string): Proveniencia => ({
  origem: "estimativa",
  fonte: "Estrutura do modelo de receita (ReciboCerto)",
  limitacao,
});

const CAPITAL = (min: number, max: number, limitacao: string) =>
  intervalo(min, max, "€", estrutural(limitacao));

const MESES = (min: number, max: number, limitacao: string) =>
  intervalo(min, max, "meses", estrutural(limitacao));

export const MODELOS_RECEITA: readonly ModeloReceita[] = Object.freeze([
  {
    id: "avenca",
    rotulo: "Avença mensal",
    comoSeCobra: "Valor fixo por mês, com âmbito e teto escritos.",
    cenarioPreco: "servico",
    padrao: "recorrente",
    naturezas: ["servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(0, 1500, "Sem stock nem espaço: o que custa é o tempo até ao primeiro contrato, não equipamento."),
    tempoAteReceitaMeses: MESES(1, 4, "Depende do ciclo de decisão do cliente, mais longo em B2B do que em consumidor final."),
    escalabilidade: 1,
    riscosProprios: ["dependencia-clientes"],
  },
  {
    id: "projeto",
    rotulo: "Projeto com preço fechado",
    comoSeCobra: "Preço fechado por trabalho, com âmbito definido antes de começar.",
    cenarioPreco: "projeto",
    padrao: "pontual",
    naturezas: ["servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(0, 2500, "Ferramentas e software próprios; o cliente costuma pagar parte à cabeça."),
    tempoAteReceitaMeses: MESES(1, 3, "Um projeto fecha mais depressa do que uma avença, e acaba mais depressa também."),
    escalabilidade: 1,
    riscosProprios: ["volatilidade", "procura"],
  },
  {
    id: "hora",
    rotulo: "Sessão ou hora",
    comoSeCobra: "Preço por sessão ou por hora, normalmente em packs com validade.",
    cenarioPreco: "servico_hora",
    padrao: "recorrente",
    naturezas: ["servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(0, 800, "O material é pouco; o limite é a agenda, não o dinheiro."),
    tempoAteReceitaMeses: MESES(0, 2, "É o modelo que arranca mais depressa — e o que menos escala."),
    escalabilidade: 0,
    riscosProprios: ["volatilidade"],
  },
  {
    id: "contrato-anual",
    rotulo: "Contrato anual com visitas programadas",
    comoSeCobra: "Contrato de doze meses com calendário de intervenções e resposta a urgências.",
    cenarioPreco: "servico",
    padrao: "contratos",
    naturezas: ["servico"],
    precisaStock: true,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(2000, 12000, "Exige stock de peças críticas e equipamento próprio para garantir prazo de resposta."),
    tempoAteReceitaMeses: MESES(3, 9, "Um contrato anual não se vende à primeira reunião."),
    escalabilidade: 2,
    riscosProprios: ["dependencia-clientes", "operacional"],
  },
  {
    id: "producao-propria",
    rotulo: "Produto próprio vendido a revendedores",
    comoSeCobra: "Preço por unidade a quem revende, com escalões por quantidade.",
    cenarioPreco: "produto_proprio",
    padrao: "recorrente",
    naturezas: ["producao"],
    precisaStock: true,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(3000, 25000, "Espaço conforme, equipamento e a primeira produção antes de existir a primeira venda."),
    tempoAteReceitaMeses: MESES(3, 12, "Licenciamento e escoamento acordado demoram mais do que produzir."),
    escalabilidade: 2,
    riscosProprios: ["financeiro", "operacional", "sazonalidade"],
  },
  {
    id: "venda-direta",
    rotulo: "Venda direta ao consumidor",
    comoSeCobra: "Preço ao público, em mercado, feira ou loja online própria.",
    cenarioPreco: "produto_proprio",
    padrao: "pontual",
    naturezas: ["comercio", "producao"],
    precisaStock: true,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: true,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(1000, 8000, "Stock inicial, meios de pagamento e o que for preciso para transportar e expor."),
    tempoAteReceitaMeses: MESES(1, 4, "A venda direta arranca depressa; o volume é que demora."),
    escalabilidade: 1,
    riscosProprios: ["volatilidade", "sazonalidade"],
  },
  {
    id: "loja-online",
    rotulo: "Loja online operada",
    comoSeCobra: "Montagem por projeto e depois avença de operação semanal.",
    cenarioPreco: "loja_online",
    padrao: "recorrente",
    naturezas: ["comercio", "servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: true,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(500, 4000, "Plataforma, fotografia e meios de pagamento; o stock é do cliente, não teu."),
    tempoAteReceitaMeses: MESES(1, 4, "A montagem paga-se cedo; a avença só depois de a loja provar que vende."),
    escalabilidade: 2,
    riscosProprios: ["procura"],
  },
  {
    id: "intermediacao",
    rotulo: "Intermediação com fee declarado",
    comoSeCobra: "Fee sobre o valor intermediado, declarado ao cliente. Nunca comissão escondida.",
    cenarioPreco: "projeto",
    padrao: "pontual",
    naturezas: ["intermediacao"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(500, 5000, "O ativo é a rede de fornecedores, e essa constrói-se com tempo, não com dinheiro."),
    tempoAteReceitaMeses: MESES(2, 8, "Sem rede de fornecedores montada não há o que intermediar."),
    escalabilidade: 2,
    riscosProprios: ["dependencia-clientes", "regulatorio"],
  },
  {
    id: "produto-digital",
    rotulo: "Produto digital ou formação",
    comoSeCobra: "Preço por acesso, com atualização incluída durante um período.",
    cenarioPreco: "produto_digital",
    padrao: "recorrente",
    naturezas: ["produto", "servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: true,
    dependeAquisicaoDireta: false,
    capitalTipico: CAPITAL(300, 5000, "Produção e plataforma; o custo real é o tempo antes de existir a primeira venda."),
    tempoAteReceitaMeses: MESES(3, 12, "É o modelo com maior distância entre começar e receber."),
    escalabilidade: 3,
    riscosProprios: ["procura", "concorrencia"],
  },
  {
    id: "equipa-operacional",
    rotulo: "Operação com equipa",
    comoSeCobra: "Preço por hora ou por turno de reforço, com mínimo contratado.",
    cenarioPreco: "servico_hora",
    padrao: "contratos",
    naturezas: ["servico"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: true,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(5000, 30000, "Tesouraria para pagar trabalho antes de receber, formação e seguros. É o modelo mais caro de arrancar."),
    tempoAteReceitaMeses: MESES(2, 6, "Precisa de clientes âncora ANTES de recrutar, o que atrasa o arranque."),
    escalabilidade: 2,
    riscosProprios: ["financeiro", "operacional", "dependencia-clientes"],
  },
  {
    id: "espaco-proprio",
    rotulo: "Serviço em espaço próprio",
    comoSeCobra: "Mensalidade ou preço por utilização, num espaço que é teu ou arrendado.",
    cenarioPreco: "servico",
    padrao: "recorrente",
    naturezas: ["servico"],
    precisaStock: false,
    precisaLojaFisica: true,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: false,
    capitalTipico: CAPITAL(5000, 40000, "Renda, obras, licenciamento e os meses em que o espaço custa antes de encher."),
    tempoAteReceitaMeses: MESES(3, 12, "Licenciar e encher um espaço não acontece no mesmo trimestre."),
    escalabilidade: 1,
    riscosProprios: ["financeiro", "operacional"],
  },
  {
    id: "lote-recorrente",
    rotulo: "Lote ou pacote recorrente",
    comoSeCobra: "Entrega periódica de um volume acordado, faturado por lote.",
    cenarioPreco: "encomenda",
    padrao: "recorrente",
    naturezas: ["servico", "producao"],
    precisaStock: false,
    precisaLojaFisica: false,
    precisaEquipa: false,
    dependeTrafegoPago: false,
    dependeAquisicaoDireta: true,
    capitalTipico: CAPITAL(200, 3000, "Ferramentas de trabalho e o primeiro lote antes de ser pago."),
    tempoAteReceitaMeses: MESES(1, 4, "Um lote pequeno pago é a maneira mais rápida de provar o modelo."),
    escalabilidade: 1,
    riscosProprios: ["dependencia-clientes"],
  },
] as const);

export const MODELO_POR_ID = new Map(MODELOS_RECEITA.map((item) => [item.id, item]));
