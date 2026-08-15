// ═══════════════════════════════════════════════════════════════════════
//  A SEMENTE — o consultório inventado que a administração abre
//  ---------------------------------------------------------------------
//  Nada disto é um cenário feliz. Um painel de demonstração onde está tudo
//  respondido, tudo confirmado e nada atrasado não serve para validar coisa
//  nenhuma: o painel real existe precisamente para mostrar o que está por
//  responder. Por isso a semente tem um pedido de vínculo à espera, uma
//  consulta por confirmar, duas partilhas por ler, uma tarefa fora do prazo
//  e um acompanhamento em pausa.
//
//  Os nomes são inventados e dizem-no: «Cliente de demonstração» não existe,
//  e nenhum destes dados sai de memória. Não há aqui nenhuma pessoa real —
//  a regra do CLAUDE.md sobre não inventar testemunhos vale para o que é
//  publicado; isto é um simulador de painel, e diz-se em todos os ecrãs.
//
//  Tudo é relativo a `agora`: a demonstração aberta em dezembro tem de ter
//  a próxima consulta amanhã, e não numa data de 2026 que já passou.
// ═══════════════════════════════════════════════════════════════════════

import type {
  Agendamento, Contabilista, Partilha, Vinculo,
} from "../tipos";
import type { Excecao, RegraDisponibilidade } from "../agenda";
import type { Tarefa } from "../trabalho";
import type {
  AnexoDaProposta, Caso, DocumentoDoCaso, MensagemDoCaso, Proposta,
} from "../casos";
import type { Mensagem, Notificacao } from "../conversa";

/** O cartão de fidelidade como a base o guarda (uma linha por cliente). */
export interface CartaoDemo {
  id: string;
  contabilistaId: string;
  clienteId: string;
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
  completo: boolean;
}

export interface CupaoDemo {
  id: string;
  codigo: string;
  contabilistaId: string;
  clienteId: string;
  percentagem: number;
  valorBaseCents: number;
  estado: "disponivel" | "usado" | "expirado";
  expiraEm: string;
  criadoEm: string;
}

/** Estado do LinkedIn, para o cartão do perfil público. */
export interface LinkedInDemo {
  ligado: boolean;
  url: string | null;
  avatarUrl: string | null;
}

export interface EstadoDemonstracao {
  ficha: Contabilista;
  vinculos: Vinculo[];
  agendamentos: Agendamento[];
  partilhas: Partilha[];
  cartoes: CartaoDemo[];
  cupoes: CupaoDemo[];
  disponibilidade: RegraDisponibilidade[];
  excecoes: Excecao[];
  tarefas: Tarefa[];
  casos: Caso[];
  mensagensDeCaso: MensagemDoCaso[];
  propostas: Proposta[];
  documentos: DocumentoDoCaso[];
  anexosDeProposta: AnexoDaProposta[];
  conversas: Mensagem[];
  notificacoes: Notificacao[];
  linkedin: LinkedInDemo;
}

// ─── Identificadores ───────────────────────────────────────────────────
//
// Com forma de UUID de propósito. `tratamentoDoCliente` corta os quatro
// primeiros caracteres do id do cliente para tratar quem não deu nome — com
// ids do género «cliente-3» esse ecrã dizia «Cliente CLIE» e escondia um
// caso que na realidade se lê «Cliente 9F4C».

const CONTABILISTA = "5a1e0000-0000-4000-8000-000000000001";

const CLIENTE = {
  ines: "3b71c204-0000-4000-8000-000000000011",
  duarte: "8e42a9f6-0000-4000-8000-000000000012",
  carolina: "c05df318-0000-4000-8000-000000000013",
  hugo: "9f4c2b18-0000-4000-8000-000000000014",
  sofia: "1d6ea570-0000-4000-8000-000000000015",
  tomas: "7ab39e42-0000-4000-8000-000000000016",
} as const;

const VINCULO = {
  ines: "aa000000-0000-4000-8000-000000000101",
  duarte: "aa000000-0000-4000-8000-000000000102",
  carolina: "aa000000-0000-4000-8000-000000000103",
  hugo: "aa000000-0000-4000-8000-000000000104",
  sofia: "aa000000-0000-4000-8000-000000000105",
  tomas: "aa000000-0000-4000-8000-000000000106",
} as const;

/** O id do contabilista simulado, para quem precisa de o comparar. */
export const ID_CONTABILISTA_DEMO = CONTABILISTA;

// ─── Tempo ─────────────────────────────────────────────────────────────

/** Um instante a `dias` de distância, à hora indicada, no fuso do browser. */
function instante(agora: Date, dias: number, hora: number, minuto = 0): string {
  const d = new Date(agora);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

/** «AAAA-MM-DD» a `dias` de distância, no calendário de quem está a ver. */
function dia(agora: Date, dias: number): string {
  const d = new Date(agora);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const numero = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${numero}`;
}

/** Um instante corrido, para quem só precisa de «há três horas». */
function horasAtras(agora: Date, horas: number): string {
  return new Date(agora.getTime() - horas * 3600_000).toISOString();
}

// ─── A semente ─────────────────────────────────────────────────────────

export function semear(agora: Date = new Date()): EstadoDemonstracao {
  const ficha: Contabilista = {
    userId: CONTABILISTA,
    slug: "contabilista-de-demonstracao",
    nome: "Marta Nogueira (demonstração)",
    occ: "00000",
    bio:
      "Trabalho sobretudo com trabalhadores independentes e micro-empresas do " +
      "Porto e de Matosinhos. Acompanho o ano todo — não só na altura do IRS — " +
      "e prefiro explicar as contas a mandar um número seco por email.",
    distrito: "Porto",
    concelho: "Matosinhos",
    especialidades: ["Recibos verdes", "IRS", "IVA", "Abertura de atividade"],
    modalidades: ["presencial", "online"],
    emailContacto: "marta@exemplo-demonstracao.pt",
    telefone: "220 000 000",
    website: "https://exemplo-demonstracao.pt",
    tituloProfissional: "Contabilista Certificada",
    apresentacaoCurta: "Acompanho freelancers e micro-empresas do Porto, o ano todo.",
    idiomas: ["pt", "en"],
    anosExperiencia: 12,
    respostaMediaHoras: 24,
    // Informado, não verificado: a demonstração tem de mostrar o estado
    // mais comum, que é o de quem escreveu o número e ainda não o viu
    // confirmado pela administração.
    occVerificado: false,
    linkedinLigado: false,
    estado: "aprovado",
    aceitaNovosClientes: true,
    precoConsultaCents: 6500,
    duracaoConsultaMin: 60,
    fidelidadeMeta: 5,
    fidelidadeDescontoPct: 15,
    fidelidadeAtiva: true,
    criadoEm: instante(agora, -420, 10),
  };

  // Seis acompanhamentos, e nenhum deles no mesmo estado por acaso: há um
  // por responder (é o número que a navegação mostra), um convite por
  // aceitar, um em pausa e um terminado — que continua a existir e deixou
  // de ter nome, como manda a migração 043.
  const vinculos: Vinculo[] = [
    {
      id: VINCULO.ines,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      estado: "ativo",
      criadoEm: instante(agora, -280, 11),
      origem: "cliente",
      nomeCliente: "Inês Barata",
      emailCliente: "ines@exemplo-demonstracao.pt",
      mensagem: null,
    },
    {
      id: VINCULO.duarte,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.duarte,
      estado: "ativo",
      criadoEm: instante(agora, -150, 9),
      origem: "cliente",
      nomeCliente: "Duarte Pinto",
      emailCliente: "duarte@exemplo-demonstracao.pt",
      mensagem: "Passei a faturar a clientes de Espanha e não sei o que muda no IVA.",
    },
    {
      id: VINCULO.carolina,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.carolina,
      estado: "ativo",
      criadoEm: instante(agora, -62, 16),
      origem: "contabilista",
      nomeCliente: "Carolina Sequeira",
      emailCliente: "carolina@exemplo-demonstracao.pt",
      mensagem: null,
    },
    {
      // Sem nome: o painel trata-o por «Cliente 9F4C», que é o que acontece
      // quando a pessoa pede vínculo sem dizer como quer ser tratada.
      id: VINCULO.hugo,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.hugo,
      estado: "pendente",
      criadoEm: horasAtras(agora, 20),
      origem: "cliente",
      nomeCliente: null,
      emailCliente: null,
      mensagem:
        "Abri atividade no mês passado e ainda não emiti nenhum recibo. " +
        "Preciso de perceber o que tenho de fazer e quando.",
    },
    {
      id: VINCULO.sofia,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.sofia,
      estado: "pausado",
      criadoEm: instante(agora, -330, 15),
      origem: "cliente",
      nomeCliente: "Sofia Mendes",
      emailCliente: "sofia@exemplo-demonstracao.pt",
      mensagem: null,
    },
    {
      // Terminado: o nome e o email foram apagados, e é assim que se vê.
      id: VINCULO.tomas,
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.tomas,
      estado: "terminado",
      criadoEm: instante(agora, -500, 12),
      origem: "cliente",
      nomeCliente: null,
      emailCliente: null,
      mensagem: null,
    },
  ];

  const agendamentos: Agendamento[] = [
    {
      id: "bb000000-0000-4000-8000-000000000201",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      inicio: instante(agora, 0, 16),
      fim: instante(agora, 0, 17),
      estado: "confirmado",
      modalidade: "online",
      assunto: "Fecho do trimestre e retenções em falta.",
      localOuLigacao: "https://meet.exemplo-demonstracao.pt/marta",
      criadoEm: instante(agora, -6, 10),
    },
    {
      id: "bb000000-0000-4000-8000-000000000202",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.duarte,
      inicio: instante(agora, 1, 10),
      fim: instante(agora, 1, 11),
      estado: "pedido",
      modalidade: "presencial",
      assunto: "Clientes em Espanha: registo no VIES e recibos sem IVA.",
      localOuLigacao: null,
      criadoEm: horasAtras(agora, 5),
    },
    {
      id: "bb000000-0000-4000-8000-000000000203",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.carolina,
      inicio: instante(agora, 4, 14, 30),
      fim: instante(agora, 4, 15, 30),
      estado: "confirmado",
      modalidade: "online",
      assunto: null,
      localOuLigacao: "https://meet.exemplo-demonstracao.pt/marta",
      criadoEm: instante(agora, -2, 9),
    },
    {
      id: "bb000000-0000-4000-8000-000000000204",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      inicio: instante(agora, 11, 11),
      fim: instante(agora, 11, 12),
      estado: "pedido",
      modalidade: "presencial",
      assunto: "Preparar a entrega do IRS.",
      localOuLigacao: null,
      criadoEm: horasAtras(agora, 30),
    },
    // O histórico. Serve as contas da ficha de cliente e o cartão.
    {
      id: "bb000000-0000-4000-8000-000000000205",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      inicio: instante(agora, -18, 15),
      fim: instante(agora, -18, 16),
      estado: "realizada",
      modalidade: "presencial",
      assunto: "Revisão das despesas do semestre.",
      localOuLigacao: "Rua de exemplo, 1 · Matosinhos",
      criadoEm: instante(agora, -25, 9),
    },
    {
      id: "bb000000-0000-4000-8000-000000000206",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      inicio: instante(agora, -47, 10),
      fim: instante(agora, -47, 11),
      estado: "realizada",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null,
      criadoEm: instante(agora, -55, 9),
    },
    {
      id: "bb000000-0000-4000-8000-000000000207",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.duarte,
      inicio: instante(agora, -31, 17),
      fim: instante(agora, -31, 18),
      estado: "realizada",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null,
      criadoEm: instante(agora, -40, 12),
    },
    {
      id: "bb000000-0000-4000-8000-000000000208",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.sofia,
      inicio: instante(agora, -9, 9, 30),
      fim: instante(agora, -9, 10, 30),
      estado: "nao_compareceu",
      modalidade: "presencial",
      assunto: null,
      localOuLigacao: null,
      criadoEm: instante(agora, -16, 11),
    },
    {
      id: "bb000000-0000-4000-8000-000000000209",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.carolina,
      inicio: instante(agora, -13, 12),
      fim: instante(agora, -13, 13),
      estado: "cancelado_cliente",
      modalidade: "online",
      assunto: null,
      localOuLigacao: null,
      criadoEm: instante(agora, -20, 10),
    },
  ];

  const partilhas: Partilha[] = [
    {
      id: "cc000000-0000-4000-8000-000000000301",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.duarte,
      tipo: "simulador_irs",
      titulo: "Simulação de IRS",
      conteudo: {
        rendimentoAnual: 38400,
        coeficiente: 0.75,
        retencaoAplicada: 11.5,
        irsEstimado: 6142.18,
        escalao: 5,
        primeiroAnoAtividade: false,
      },
      nota:
        "Marta, isto é com os recibos que já emiti até agora. Falta o de dezembro. " +
        "O que me preocupa é a retenção — acho que estou a reter a menos.",
      estado: "enviada",
      consentimentoVersao: "2026-08-1",
      criadoEm: horasAtras(agora, 9),
    },
    {
      id: "cc000000-0000-4000-8000-000000000302",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.hugo,
      tipo: "recibos_verdes",
      titulo: "Recibos verdes · previsão do ano",
      conteudo: {
        rendimentoPrevisto: 21000,
        segurancaSocial: 1890.35,
        reservaSugerida: 5120.4,
        primeiroAnoAtividade: true,
      },
      nota: null,
      estado: "enviada",
      consentimentoVersao: "2026-08-1",
      criadoEm: horasAtras(agora, 21),
    },
    {
      id: "cc000000-0000-4000-8000-000000000303",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      tipo: "comparador_regimes",
      titulo: "Comparação de regimes",
      conteudo: {
        rendimentoAnual: 52000,
        simplificadoLiquido: 36180.55,
        organizadaLiquido: 37940.12,
        diferenca: 1759.57,
        despesasDeclaradas: 9400,
      },
      nota: "Vale a pena mudar para contabilidade organizada no próximo ano?",
      estado: "vista",
      consentimentoVersao: "2026-08-1",
      criadoEm: instante(agora, -12, 18),
    },
    {
      id: "cc000000-0000-4000-8000-000000000304",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.carolina,
      tipo: "recibo_vencimento",
      titulo: "Recibo de vencimento",
      conteudo: {
        salarioBruto: 1980,
        irsRetido: 289.4,
        segurancaSocial: 217.8,
        liquido: 1472.8,
      },
      nota: null,
      estado: "vista",
      consentimentoVersao: "2026-08-1",
      criadoEm: instante(agora, -27, 14),
    },
    {
      id: "cc000000-0000-4000-8000-000000000305",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.sofia,
      tipo: "cenario_guardado",
      titulo: "Cenário guardado",
      conteudo: { rendimentoAnual: 29500, reservaMensal: 610.25 },
      nota: null,
      estado: "revogada",
      consentimentoVersao: "2026-08-1",
      criadoEm: instante(agora, -71, 10),
    },
  ];

  const cartoes: CartaoDemo[] = [
    {
      id: "dd000000-0000-4000-8000-000000000401",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      carimbos: 4,
      meta: 5,
      descontoPct: 15,
      precoBaseCents: 6500,
      completo: false,
    },
    {
      id: "dd000000-0000-4000-8000-000000000402",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.duarte,
      carimbos: 1,
      meta: 5,
      // Congelado nos 10% com que o cartão abriu, mesmo depois de a ficha
      // ter passado para 15%. É a promessa que não muda a meio.
      descontoPct: 10,
      precoBaseCents: 6000,
      completo: false,
    },
  ];

  const cupoes: CupaoDemo[] = [
    {
      id: "ee000000-0000-4000-8000-000000000501",
      codigo: "RC-D3MP-9K42",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.carolina,
      percentagem: 15,
      valorBaseCents: 6500,
      estado: "disponivel",
      expiraEm: instante(agora, 240, 23),
      criadoEm: instante(agora, -35, 17),
    },
    {
      id: "ee000000-0000-4000-8000-000000000502",
      codigo: "RC-D3MP-7XQ5",
      contabilistaId: CONTABILISTA,
      clienteId: CLIENTE.ines,
      percentagem: 10,
      valorBaseCents: 6000,
      estado: "usado",
      expiraEm: instante(agora, 90, 23),
      criadoEm: instante(agora, -190, 17),
    },
  ];

  const disponibilidade: RegraDisponibilidade[] = [
    { diaSemana: 1, inicio: "09:30", fim: "13:00", duracaoMin: 60, intervaloMin: 0 },
    { diaSemana: 1, inicio: "14:30", fim: "18:00", duracaoMin: 60, intervaloMin: 0 },
    { diaSemana: 2, inicio: "09:30", fim: "13:00", duracaoMin: 60, intervaloMin: 0 },
    { diaSemana: 3, inicio: "09:30", fim: "13:00", duracaoMin: 60, intervaloMin: 0 },
    { diaSemana: 3, inicio: "14:30", fim: "18:00", duracaoMin: 60, intervaloMin: 0 },
    { diaSemana: 4, inicio: "10:00", fim: "13:00", duracaoMin: 45, intervaloMin: 15 },
    { diaSemana: 5, inicio: "09:30", fim: "12:30", duracaoMin: 60, intervaloMin: 0 },
  ];

  const excecoes: Excecao[] = [
    { data: dia(agora, 6), motivo: "Formação da Ordem" },
  ];

  const tarefas: Tarefa[] = [
    {
      id: "ff000000-0000-4000-8000-000000000601",
      vinculoId: VINCULO.duarte,
      titulo: "Registar o Duarte no VIES",
      notas: "Só depois de ele confirmar que vai mesmo faturar para Espanha.",
      estado: "por_tratar",
      prazo: dia(agora, -2),
      etiquetas: ["IVA", "Urgente"],
      obrigacao: null,
      ordem: 1,
      passos: [
        { id: "ff000000-0000-4000-8000-000000000651", texto: "Confirmar o NIF espanhol do cliente dele", feito: true, ordem: 1 },
        { id: "ff000000-0000-4000-8000-000000000652", texto: "Submeter o pedido no Portal das Finanças", feito: false, ordem: 2 },
        { id: "ff000000-0000-4000-8000-000000000653", texto: "Avisar o Duarte de como emitir os recibos", feito: false, ordem: 3 },
      ],
    },
    {
      id: "ff000000-0000-4000-8000-000000000602",
      vinculoId: VINCULO.ines,
      titulo: "Entregar a declaração periódica de IVA",
      notas: null,
      estado: "por_tratar",
      prazo: dia(agora, 3),
      etiquetas: ["IVA"],
      obrigacao: null,
      ordem: 2,
      passos: [],
    },
    {
      id: "ff000000-0000-4000-8000-000000000603",
      vinculoId: VINCULO.carolina,
      titulo: "Faturas de janeiro da Carolina",
      notas: "Faltam três faturas de despesa. Pedido feito na conversa.",
      estado: "espera_cliente",
      prazo: dia(agora, 1),
      etiquetas: ["Documentos"],
      obrigacao: null,
      ordem: 3,
      passos: [
        { id: "ff000000-0000-4000-8000-000000000654", texto: "Pedir as faturas", feito: true, ordem: 1 },
        { id: "ff000000-0000-4000-8000-000000000655", texto: "Lançar na contabilidade", feito: false, ordem: 2 },
      ],
    },
    {
      id: "ff000000-0000-4000-8000-000000000604",
      vinculoId: null,
      titulo: "Recolher o comprovativo de morada para o processo novo",
      notas: null,
      estado: "espera_cliente",
      prazo: null,
      etiquetas: ["Documentos"],
      obrigacao: null,
      ordem: 4,
      passos: [],
    },
    {
      id: "ff000000-0000-4000-8000-000000000605",
      vinculoId: VINCULO.ines,
      titulo: "Fecho de contas do ano da Inês",
      notas: "Falta conciliar a conta bancária de dezembro.",
      estado: "em_curso",
      prazo: dia(agora, 9),
      etiquetas: ["Fecho", "IRS"],
      obrigacao: null,
      ordem: 5,
      passos: [
        { id: "ff000000-0000-4000-8000-000000000656", texto: "Conferir os recibos emitidos", feito: true, ordem: 1 },
        { id: "ff000000-0000-4000-8000-000000000657", texto: "Conciliar a conta bancária", feito: false, ordem: 2 },
        { id: "ff000000-0000-4000-8000-000000000658", texto: "Preparar o mapa de despesas", feito: false, ordem: 3 },
      ],
    },
    {
      id: "ff000000-0000-4000-8000-000000000606",
      vinculoId: VINCULO.sofia,
      titulo: "Segurança Social: pedido de isenção da Sofia",
      notas: null,
      estado: "entregue",
      prazo: dia(agora, -21),
      etiquetas: ["Segurança Social"],
      obrigacao: null,
      ordem: 6,
      passos: [
        { id: "ff000000-0000-4000-8000-000000000659", texto: "Submeter o pedido", feito: true, ordem: 1 },
        { id: "ff000000-0000-4000-8000-000000000660", texto: "Confirmar o deferimento", feito: true, ordem: 2 },
      ],
    },
  ];

  // ─── Casos encaminhados pela administração ───────────────────────────
  //
  // O contabilista vê nome e NIF, e não vê contactos — a fronteira da
  // migração 051. Na demonstração isso lê-se ao vivo: não há aqui nenhum
  // email nem telefone para mostrar, porque também não há no real.

  const casos: Caso[] = [
    {
      id: "11000000-0000-4000-8000-000000000701",
      referencia: "RC-2026-0184",
      nomeCompleto: "Cliente de demonstração · Raquel Alves",
      nif: "299000018",
      assunto: "Recebi uma liquidação adicional de IRS e não percebo o valor",
      situacao:
        "Recebi ontem uma nota de liquidação com mais 1.240 € do que aquilo que " +
        "tinha entregado. Trabalho a recibos verdes desde 2023 e declarei tudo o que " +
        "emiti. Não sei se contesto, se pago, nem quanto tempo tenho para decidir.",
      area: "irs",
      urgencia: "prazo_proximo",
      orcamentoCents: 25000,
      estado: "encaminhado",
      notaTriagem: null,
      criadoEm: horasAtras(agora, 26),
      submetidoEm: horasAtras(agora, 26),
    },
    {
      id: "11000000-0000-4000-8000-000000000702",
      referencia: "RC-2026-0177",
      nomeCompleto: "Cliente de demonstração · Nuno Faria",
      nif: "246000015",
      assunto: "Quero abrir uma unipessoal e não sei se compensa",
      situacao:
        "Faturo cerca de 70 mil euros por ano como programador independente e " +
        "toda a gente me diz para abrir empresa. Queria perceber se compensa mesmo " +
        "no meu caso e o que muda no dia a dia.",
      area: "empresa",
      urgencia: "normal",
      orcamentoCents: null,
      estado: "com_proposta",
      notaTriagem: null,
      criadoEm: instante(agora, -8, 11),
      submetidoEm: instante(agora, -8, 11),
    },
  ];

  const mensagensDeCaso: MensagemDoCaso[] = [
    {
      id: "12000000-0000-4000-8000-000000000801",
      casoId: casos[1].id,
      autorId: CONTABILISTA,
      autorPapel: "contabilista",
      corpo: "Já entregou o IRS deste ano ou ainda está a tempo de mudar alguma coisa?",
      corpoEncaminhado: "Já entregou o IRS deste ano ou ainda está a tempo de mudar alguma coisa?",
      estado: "aprovada",
      notaRevisao: null,
      criadoEm: instante(agora, -7, 9),
    },
    {
      id: "12000000-0000-4000-8000-000000000802",
      casoId: casos[1].id,
      autorId: CLIENTE.tomas,
      autorPapel: "cliente",
      corpo: "Entreguei em maio. Este ano ainda não fiz nada.",
      corpoEncaminhado: null,
      estado: "aprovada",
      notaRevisao: null,
      criadoEm: instante(agora, -7, 14),
    },
    {
      id: "12000000-0000-4000-8000-000000000803",
      casoId: casos[0].id,
      autorId: CONTABILISTA,
      autorPapel: "contabilista",
      corpo: "Consegue enviar-me a nota de liquidação? Preciso de ver a data limite que lá vem.",
      corpoEncaminhado: null,
      estado: "submetida",
      notaRevisao: null,
      criadoEm: horasAtras(agora, 4),
    },
  ];

  const propostas: Proposta[] = [
    {
      id: "13000000-0000-4000-8000-000000000901",
      casoId: casos[1].id,
      contabilistaId: CONTABILISTA,
      corpo:
        "Proponho uma análise comparativa entre continuar como trabalhador " +
        "independente e constituir uma unipessoal, com números do seu caso: " +
        "carga fiscal nos dois cenários, custo anual de contabilidade organizada, " +
        "e o que muda na Segurança Social e na retirada de lucros.\n\n" +
        "Inclui uma reunião de 60 minutos para decidir e, se avançarmos, o " +
        "acompanhamento da constituição.\n\nNão inclui as despesas de registo " +
        "nem o capital social.",
      valorCents: 34000,
      ivaIncluido: false,
      prazoExecucao: "Duas semanas",
      validadeAte: dia(agora, 12),
      estado: "lida",
      lidaAteAoFimEm: instante(agora, -5, 21),
      confirmacaoEm: null,
      decididaEm: null,
      motivo: null,
      criadoEm: instante(agora, -6, 10),
    },
  ];

  const documentos: DocumentoDoCaso[] = [
    {
      id: "14000000-0000-4000-8000-000000001001",
      caminho: "demonstracao/nota-de-liquidacao.pdf",
      nome: "nota-de-liquidacao.pdf",
      bytes: 184_320,
      tipoMime: "application/pdf",
      libertadoEm: horasAtras(agora, 12),
      criadoEm: horasAtras(agora, 25),
    },
  ];

  const anexosDeProposta: AnexoDaProposta[] = [
    {
      id: "15000000-0000-4000-8000-000000001101",
      caminho: "demonstracao/contrato-de-servicos.pdf",
      nome: "contrato-de-servicos.pdf",
      bytes: 96_540,
      tipoMime: "application/pdf",
      eContrato: true,
    },
  ];

  const conversas: Mensagem[] = [
    {
      id: "16000000-0000-4000-8000-000000001201",
      vinculoId: VINCULO.carolina,
      autorId: CONTABILISTA,
      corpo: "Carolina, faltam-me três faturas de despesa de janeiro. Consegue enviá-las até sexta?",
      lidaEm: instante(agora, -3, 12),
      criadoEm: instante(agora, -3, 11),
      anexos: [],
    },
    {
      id: "16000000-0000-4000-8000-000000001202",
      vinculoId: VINCULO.carolina,
      autorId: CLIENTE.carolina,
      corpo: "Envio hoje à noite. Duas são do combustível, a terceira é do portátil novo.",
      lidaEm: instante(agora, -3, 19),
      criadoEm: instante(agora, -3, 18),
      anexos: [],
    },
    {
      id: "16000000-0000-4000-8000-000000001203",
      vinculoId: VINCULO.carolina,
      autorId: CLIENTE.carolina,
      corpo: "Afinal só encontrei duas. A do portátil parece que ficou no email da loja.",
      lidaEm: null,
      criadoEm: horasAtras(agora, 6),
      anexos: [
        {
          id: "16000000-0000-4000-8000-000000001251",
          caminho: "demonstracao/despesas-janeiro.pdf",
          nome: "despesas-janeiro.pdf",
          bytes: 421_900,
          tipoMime: "application/pdf",
        },
      ],
    },
    {
      id: "16000000-0000-4000-8000-000000001204",
      vinculoId: VINCULO.ines,
      autorId: CLIENTE.ines,
      corpo: "Já emiti o recibo de dezembro. Está tudo no portal.",
      lidaEm: instante(agora, -11, 10),
      criadoEm: instante(agora, -11, 9),
      anexos: [],
    },
    {
      id: "16000000-0000-4000-8000-000000001205",
      vinculoId: VINCULO.ines,
      autorId: CONTABILISTA,
      corpo: "Obrigada, Inês. Vou fechar as contas do ano e digo-lhe alguma coisa até quarta.",
      lidaEm: instante(agora, -11, 15),
      criadoEm: instante(agora, -11, 12),
      anexos: [],
    },
  ];

  const notificacoes: Notificacao[] = [
    {
      id: "17000000-0000-4000-8000-000000001301",
      tipo: "vinculo_pedido",
      titulo: "Pedido de acompanhamento",
      corpo: "Alguém quer ser teu cliente.",
      url: "/contabilista/clientes",
      lidaEm: null,
      criadoEm: horasAtras(agora, 20),
    },
    {
      id: "17000000-0000-4000-8000-000000001302",
      tipo: "partilha_recebida",
      titulo: "Simulação recebida",
      corpo: "Duarte Pinto enviou-te uma simulação de IRS.",
      url: "/contabilista/partilhas",
      lidaEm: null,
      criadoEm: horasAtras(agora, 9),
    },
    {
      id: "17000000-0000-4000-8000-000000001303",
      tipo: "consulta_pedida",
      titulo: "Consulta por confirmar",
      corpo: "Duarte Pinto pediu consulta para amanhã.",
      url: "/contabilista/agenda",
      lidaEm: null,
      criadoEm: horasAtras(agora, 5),
    },
    {
      id: "17000000-0000-4000-8000-000000001304",
      tipo: "mensagem",
      titulo: "Mensagem nova",
      corpo: "Carolina Sequeira respondeu-te.",
      url: "/contabilista/clientes",
      lidaEm: instante(agora, -2, 9),
      criadoEm: horasAtras(agora, 6),
    },
  ];

  return {
    ficha,
    vinculos,
    agendamentos,
    partilhas,
    cartoes,
    cupoes,
    disponibilidade,
    excecoes,
    tarefas,
    casos,
    mensagensDeCaso,
    propostas,
    documentos,
    anexosDeProposta,
    conversas,
    notificacoes,
    linkedin: { ligado: false, url: null, avatarUrl: null },
  };
}
