// ═══════════════════════════════════════════════════════════════════════
//  O CATÁLOGO DOS DADOS — um sítio só, e é este
//  ---------------------------------------------------------------------
//  A zona de perigo apagava cinco tabelas. A base de dados tem vinte e
//  oito com dados de pessoas. Quem pedia para ser esquecido ficava com
//  quase tudo por apagar — conversas, consultas, partilhas, cartões de
//  fidelidade, notificações, candidaturas — e a resposta dizia «ok».
//
//  A causa não foi distração: a lista das tabelas estava escrita à mão
//  dentro da rota. Uma tabela nova nasce numa migração, e nada obrigava
//  ninguém a voltar aqui. Uma lista que é preciso lembrar de atualizar é
//  uma lista que fica desatualizada.
//
//  Por isso o catálogo é um só, e há um teste que compara o que aqui está
//  com as tabelas que as migrações criam. Uma tabela com dono que não
//  apareça aqui faz o teste falhar — antes de chegar a produção, e não
//  quando alguém pede para ser esquecido.
//
//  Ver `src/lib/__tests__/conta-catalogo.test.ts` e a migração 049.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Como se decide que uma linha é de alguém.
 *
 * É por TABELA e não por conjunto, e isso não é detalhe: `fidelidade_cartoes`
 * tem `cliente_id`, mas `fidelidade_carimbos` só tem `cartao_id` — pende do
 * cartão e sai com ele. Um modelo que assumisse a mesma coluna para as duas
 * escreveria um DELETE que nunca apagaria nada, em silêncio.
 */
export type Posse =
  | { por: "coluna"; coluna: string }
  /** Pende de outra tabela por chave estrangeira em cascata. */
  | { por: "pende"; de: string }
  /** Pende de um vínculo: é de ambas as partes, e sai com a relação. */
  | { por: "vinculo" }
  /** Uma coluna, e não uma tabela — limpa-se, não se apaga. */
  | { por: "campo"; coluna: string };

export interface TabelaDoConjunto {
  nome: string;
  posse: Posse;
}

export interface Conjunto {
  id: string;
  /** O nome que a pessoa lê. Nunca o nome da tabela. */
  titulo: string;
  /** O que desaparece, dito sem eufemismo e sem drama. */
  descricao: string;
  grupo: GrupoId;
  /** Por ordem de apagamento: as que pendem primeiro. */
  tabelas: TabelaDoConjunto[];
  /** Baldes e prefixos a limpar com este conjunto. */
  ficheiros?: { balde: string; prefixo: "utilizador" | "vinculo" }[];
  /**
   * Há dados que não podemos apagar a pedido, e dizê-lo é parte de ser
   * honesto. Quando isto está preenchido, o conjunto aparece na lista
   * como não-apagável, com esta razão à frente.
   */
  retido?: string;
  /** Só aparece a quem tem mesmo isto. */
  soSe?: "contabilista" | "cliente-de-contabilista";
}

export type GrupoId =
  | "fiscal" | "quiz" | "contabilista" | "profissional"
  | "avisos" | "ligacoes" | "registo";

export const GRUPOS: { id: GrupoId; titulo: string; descricao: string }[] = [
  { id: "fiscal", titulo: "O teu trabalho fiscal",
    descricao: "Recibos, cenários e as condições que guardaste." },
  { id: "quiz", titulo: "Quiz fiscal",
    descricao: "O que aprendeste, o progresso e os prémios." },
  { id: "contabilista", titulo: "O teu contabilista",
    descricao: "A relação, as conversas, as consultas e o cartão." },
  { id: "profissional", titulo: "A tua atividade como contabilista",
    descricao: "O perfil público, a agenda e a candidatura." },
  { id: "avisos", titulo: "Alertas e avisos",
    descricao: "O que a plataforma te manda." },
  { id: "ligacoes", titulo: "Ligações e subscrição",
    descricao: "Integrações com parceiros e o teu plano." },
  { id: "registo", titulo: "O que deixaste connosco",
    descricao: "Comentários e registos de faturação." },
];

export const CONJUNTOS: Conjunto[] = [
  // ── Fiscal ────────────────────────────────────────────────────────
  {
    id: "recibos", grupo: "fiscal",
    titulo: "Recibos verdes",
    descricao: "Todos os recibos verdes que registaste. Os simuladores continuam a funcionar; o que desaparece é o histórico.",
    tabelas: [{ nome: "recibos", posse: { por: "coluna", coluna: "user_id" } }],
  },
  {
    id: "vencimentos", grupo: "fiscal",
    titulo: "Recibos de vencimento",
    descricao: "Os recibos de vencimento que guardaste, incluindo os que serviram de base a auditorias.",
    tabelas: [{ nome: "recibos_vencimento", posse: { por: "coluna", coluna: "user_id" } }],
  },
  {
    id: "cenarios", grupo: "fiscal",
    titulo: "Cenários guardados",
    descricao: "Os cenários de simulação — recibos verdes, vencimento, empresa, IRS e heranças.",
    tabelas: [{ nome: "cenarios", posse: { por: "coluna", coluna: "user_id" } }],
  },
  {
    id: "perfil-fiscal", grupo: "fiscal",
    titulo: "Perfil fiscal",
    descricao: "As condições que guardaste: início de atividade, regime de IVA, agregado e deduções. O painel volta a dizer que não sabe.",
    tabelas: [{ nome: "profiles", posse: { por: "campo", coluna: "preferencias_fiscais" } }],
  },
  {
    id: "prazos", grupo: "fiscal",
    titulo: "Prazos que marcaste como cumpridos",
    descricao: "As marcas de «já entreguei». Os prazos voltam a aparecer por cumprir.",
    tabelas: [{ nome: "prazos_cumpridos", posse: { por: "coluna", coluna: "user_id" } }],
  },

  // ── Quiz ──────────────────────────────────────────────────────────
  {
    id: "quiz", grupo: "quiz",
    titulo: "Progresso do quiz",
    descricao: "As sessões, as respostas, o progresso das conquistas e os reportes de perguntas.",
    tabelas: [
      { nome: "quiz_sessions", posse: { por: "coluna", coluna: "user_id" } },
      { nome: "quiz_sessoes", posse: { por: "coluna", coluna: "user_id" } },
      { nome: "quiz_achievement_progress", posse: { por: "coluna", coluna: "user_id" } },
      { nome: "quiz_question_reports", posse: { por: "coluna", coluna: "user_id" } },
      // A chave primária É o id da pessoa.
      { nome: "quiz_profiles", posse: { por: "coluna", coluna: "id" } },
    ],
  },
  {
    id: "quiz-cupoes", grupo: "quiz",
    titulo: "Cupões ganhos no quiz",
    descricao: "Os códigos de desconto que ganhaste. Apagá-los não os devolve — se algum ainda estiver por usar, perde-se.",
    tabelas: [{ nome: "quiz_cupoes", posse: { por: "coluna", coluna: "user_id" } }],
  },

  // ── Contabilista, do lado de quem é cliente ───────────────────────
  {
    id: "partilhas", grupo: "contabilista", soSe: "cliente-de-contabilista",
    titulo: "Simulações que enviaste",
    descricao: "As cópias que enviaste ao teu contabilista. Ele deixa de as ver no instante em que saem daqui.",
    tabelas: [{ nome: "partilhas", posse: { por: "coluna", coluna: "cliente_id" } }],
  },
  {
    id: "conversas", grupo: "contabilista", soSe: "cliente-de-contabilista",
    titulo: "Conversas e anexos",
    descricao: "As mensagens trocadas e os ficheiros anexados, dos dois lados. Apaga também para o contabilista.",
    tabelas: [
      { nome: "contabilista_anexos", posse: { por: "pende", de: "contabilista_mensagens" } },
      { nome: "anexo_vagas", posse: { por: "pende", de: "contabilista_mensagens" } },
      { nome: "contabilista_mensagens", posse: { por: "vinculo" } },
    ],
    ficheiros: [{ balde: "contabilista-anexos", prefixo: "vinculo" }],
  },
  {
    id: "consultas", grupo: "contabilista", soSe: "cliente-de-contabilista",
    titulo: "Consultas marcadas",
    descricao: "O histórico de marcações, confirmações e cancelamentos.",
    tabelas: [{ nome: "agendamentos", posse: { por: "coluna", coluna: "cliente_id" } }],
  },
  {
    // Vale para os dois lados — quem marca consultas e quem as recebe —, e
    // por isso não leva `soSe`. Uma linha desta tabela É a chave de leitura
    // de uma agenda: apagá-la fecha o feed no instante em que sai daqui.
    id: "calendario", grupo: "contabilista",
    titulo: "Endereços de calendário",
    descricao: "Os endereços que criaste para o Google, o Apple ou o Outlook lerem a tua agenda. Apagá-los faz esses calendários deixarem de receber as consultas.",
    tabelas: [{ nome: "calendario_assinaturas", posse: { por: "coluna", coluna: "user_id" } }],
  },
  {
    id: "fidelidade", grupo: "contabilista", soSe: "cliente-de-contabilista",
    titulo: "Cartão de fidelidade",
    descricao: "Os carimbos e os cupões que ganhaste com este contabilista. Um cupão apagado não volta.",
    tabelas: [
      // O carimbo não sabe de quem é: pende do cartão.
      { nome: "fidelidade_carimbos", posse: { por: "pende", de: "fidelidade_cartoes" } },
      { nome: "fidelidade_cartoes", posse: { por: "coluna", coluna: "cliente_id" } },
      { nome: "fidelidade_cupoes", posse: { por: "coluna", coluna: "cliente_id" } },
    ],
  },
  {
    id: "vinculos", grupo: "contabilista", soSe: "cliente-de-contabilista",
    titulo: "A relação com o contabilista",
    descricao: "O vínculo em si. Apagá-lo leva com ele tudo o que pendia dele — conversas, anexos e consultas.",
    tabelas: [{ nome: "contabilista_vinculos", posse: { por: "coluna", coluna: "cliente_id" } }],
  },

  // ── Contabilista, do lado de quem o é ─────────────────────────────
  {
    id: "painel-vistas", grupo: "profissional", soSe: "contabilista",
    titulo: "Vistas do painel",
    descricao: "As vistas que criou e a forma como organizou os módulos em cada uma. É configuração de apresentação — não guarda dados de clientes.",
    tabelas: [
      { nome: "contabilista_dashboard_vistas", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    // ⚠️ Isto era UM conjunto com quatro tabelas e um `retido` a cobrir as
    // quatro. Só uma delas — `progressao_compras` — é um documento de
    // faturação; as outras três são o percurso da pessoa dentro da
    // plataforma, e não há lei nenhuma que obrigue a guardá-las. Retê-las
    // sob a justificação da lei era usar a lei para não apagar o que se
    // podia apagar. O que a lei protege ficou em `compras-patamar`.
    id: "progressao", grupo: "profissional", soSe: "contabilista",
    titulo: "Progressão e créditos",
    descricao: "O patamar que alcançaste, o registo do que contou para lá chegares e os créditos de fidelidade que ganhaste. A comissão volta à do patamar de entrada.",
    tabelas: [
      // Os registos primeiro, o agregado depois: é deles que o total sai.
      { nome: "progressao_eventos", posse: { por: "coluna", coluna: "contabilista_id" } },
      { nome: "creditos_fidelidade_ledger", posse: { por: "coluna", coluna: "contabilista_id" } },
      { nome: "contabilista_progressao", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    id: "compras-patamar", grupo: "profissional", soSe: "contabilista",
    titulo: "Compras de patamar",
    descricao: "Os desbloqueios de patamar que pagaste, com o valor e a data de cada um.",
    tabelas: [
      { nome: "progressao_compras", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
    // Uma compra é um registo fiscal do lado do Recibo Certo. Apagar a
    // conta não pode apagar a prova de um pagamento recebido — e dizê-lo é
    // parte de ser honesto sobre o que não se apaga a pedido.
    retido: "Ficam retidas pelo prazo legal de conservação de documentos de faturação — dez anos civis, contados do fim do ano da compra (art. 52.º do Código do IVA). Deixam de estar ligadas ao teu perfil no instante em que sais, mas o registo do pagamento não é apagável a pedido.",
  },
  {
    id: "fundador", grupo: "profissional", soSe: "contabilista",
    titulo: "Lugar de fundador",
    descricao:
      "Se és um dos primeiros dez contabilistas, o registo desse lugar. Apagá-lo liberta o lugar para outra pessoa — e a comissão volta a ser a do teu patamar.",
    tabelas: [
      { nome: "contabilista_fundadores", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    id: "propostas-desbloqueio", grupo: "profissional", soSe: "contabilista",
    titulo: "Propostas de valor que enviaste",
    descricao:
      "Os valores que propuseste para subir de patamar e as justificações que escreveste, com as decisões que receberam.",
    tabelas: [
      { nome: "desbloqueio_propostas", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    // ⚠️ Mesma correção que em `progressao`: `contabilista_stripe` é a
    // LIGAÇÃO à conta da Stripe — um identificador e um estado — e estava
    // retida sob a justificação legal que só cobre os pagamentos. O efeito
    // era não haver, em lado nenhum, forma de desligar a conta de
    // recebimentos. Agora há, e o que a lei protege ficou à parte.
    id: "stripe-ligacao", grupo: "profissional", soSe: "contabilista",
    titulo: "Ligação à conta Stripe",
    descricao:
      "A ligação entre o teu perfil e a tua conta na Stripe. Desligá-la faz-te deixar de poder receber consultas pagas pelo Recibo Certo. A conta na Stripe é tua e continua a existir — fecha-se lá, e é lá que os dados dela vivem.",
    tabelas: [
      { nome: "contabilista_stripe", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    id: "recebimentos", grupo: "profissional", soSe: "contabilista",
    titulo: "Recebimentos de consultas",
    descricao:
      "O registo das consultas que os teus clientes te pagaram pelo Recibo Certo. Os dados bancários e de identificação vivem na Stripe, não aqui — o que guardamos são valores, datas e estados.",
    tabelas: [
      { nome: "pagamentos", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
    // Um pagamento é um registo de uma transação real entre duas pessoas,
    // e a fatura é do contabilista. Apagar a conta não pode apagar a prova
    // de que o cliente pagou — nem para nós, nem para ele.
    retido:
      "Fica retido pelo prazo legal de conservação de documentos de faturação — dez anos civis, contados do fim do ano do pagamento (art. 52.º do Código do IVA). Deixa de estar ligado ao teu perfil, mas o registo de uma transação entre ti e um cliente não é apagável a pedido de um dos dois.",
  },
  {
    id: "fidelidade-regras", grupo: "profissional", soSe: "contabilista",
    titulo: "Regras de fidelidade que publicaste",
    descricao: "As versões das regras do cartão que definiste ao longo do tempo. Cada uma fica ligada aos cartões que nasceram com ela.",
    tabelas: [
      { nome: "fidelidade_regras", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    id: "perfil-contabilista", grupo: "profissional", soSe: "contabilista",
    titulo: "Perfil público e agenda",
    descricao: "O teu perfil no diretório, a semana-tipo, as exceções e os tipos de consulta. Deixas de aparecer para quem procura.",
    tabelas: [
      { nome: "contabilista_disponibilidade", posse: { por: "coluna", coluna: "contabilista_id" } },
      { nome: "contabilista_excecoes", posse: { por: "coluna", coluna: "contabilista_id" } },
      { nome: "contabilista_tipos_consulta", posse: { por: "coluna", coluna: "contabilista_id" } },
      // A ficha em si é chaveada por `user_id`, e sai por último.
      { nome: "contabilistas", posse: { por: "coluna", coluna: "user_id" } },
    ],
  },
  {
    id: "trabalho", grupo: "profissional", soSe: "contabilista",
    titulo: "Quadro de trabalho",
    descricao: "As tarefas e os passos que organizaste por cliente.",
    tabelas: [
      { nome: "contabilista_tarefa_passos", posse: { por: "pende", de: "contabilista_tarefas" } },
      { nome: "contabilista_tarefas", posse: { por: "coluna", coluna: "contabilista_id" } },
    ],
  },
  {
    id: "candidatura", grupo: "profissional", soSe: "contabilista",
    titulo: "Candidatura e documentos",
    descricao: "O pedido de acesso e os comprovativos que enviaste.",
    tabelas: [{ nome: "contabilista_pedidos", posse: { por: "coluna", coluna: "user_id" } }],
    ficheiros: [{ balde: "contabilista-documentos", prefixo: "utilizador" }],
  },

  // ── O caso, do lado de quem o submeteu ────────────────────────────
  {
    id: "casos", grupo: "contabilista",
    titulo: "Casos que descreveste",
    descricao: "Os pedidos que enviaste, com a situação que escreveste, os documentos que anexaste e as propostas que recebeste.",
    tabelas: [
      { nome: "proposta_anexos", posse: { por: "pende", de: "propostas" } },
      { nome: "propostas", posse: { por: "pende", de: "casos" } },
      { nome: "caso_mensagens", posse: { por: "pende", de: "casos" } },
      { nome: "caso_encaminhamentos", posse: { por: "pende", de: "casos" } },
      { nome: "caso_documentos", posse: { por: "pende", de: "casos" } },
      { nome: "caso_contactos", posse: { por: "pende", de: "casos" } },
      { nome: "casos", posse: { por: "coluna", coluna: "cliente_id" } },
    ],
    ficheiros: [{ balde: "contabilista-anexos", prefixo: "vinculo" }],
  },

  // ── Avisos ────────────────────────────────────────────────────────
  {
    id: "alertas", grupo: "avisos",
    titulo: "Alertas de prazos",
    descricao: "Os alertas que pediste para receber antes de cada prazo.",
    tabelas: [{ nome: "alertas_guardiao", posse: { por: "coluna", coluna: "user_id" } }],
  },
  {
    id: "notificacoes", grupo: "avisos",
    titulo: "Notificações",
    descricao: "O histórico do sino. Não afeta o que está por acontecer.",
    tabelas: [{ nome: "notificacoes", posse: { por: "coluna", coluna: "user_id" } }],
  },

  // ── Ligações ──────────────────────────────────────────────────────
  {
    id: "parcerias", grupo: "ligacoes",
    titulo: "Ligações a parceiros",
    descricao: "A ligação ao FIZ e os encaminhamentos que fizeste. Desliga a integração.",
    tabelas: [
      { nome: "partner_handoffs", posse: { por: "coluna", coluna: "user_id" } },
      { nome: "partner_connections", posse: { por: "coluna", coluna: "user_id" } },
    ],
  },
  {
    id: "subscricao", grupo: "ligacoes",
    titulo: "Subscrição",
    descricao: "O teu plano. Apagar a conta cancela a subscrição — não continuas a ser cobrado.",
    tabelas: [{ nome: "subscriptions", posse: { por: "coluna", coluna: "user_id" } }],
    // Não se apaga à parte de propósito: sem esta linha o acesso deixa de
    // ter dono e a cobrança continua na Stripe sem nada aqui a que a ligar.
    // Sai com a conta, e antes disso a subscrição é cancelada por nós.
    retido: "Não se apaga sozinha: sai com a conta, e apagar a conta cancela primeiro a subscrição para não continuares a ser cobrado. As faturas emitidas ficam na Stripe o tempo que a lei obriga — isso é faturação, e não é apagável a pedido.",
  },

  // ── Registo ───────────────────────────────────────────────────────
  {
    id: "feedback", grupo: "registo",
    titulo: "Comentários que deixaste",
    descricao: "O que escreveste nos formulários de opinião do site.",
    tabelas: [{ nome: "site_feedback", posse: { por: "coluna", coluna: "user_id" } }],
  },
];

export const conjuntoPorId = (id: string): Conjunto | undefined =>
  CONJUNTOS.find((c) => c.id === id);

/** Os que se podem mesmo apagar — os retidos ficam de fora. */
export const APAGAVEIS = CONJUNTOS.filter((c) => !c.retido).map((c) => c.id);

/**
 * Tabelas que o catálogo NÃO cobre, e por que não.
 *
 * Existe para o teste de completude poder distinguir «esquecida» de
 * «deliberadamente de fora». Escrever aqui é uma decisão; não escrever
 * nada faz o teste falhar, que é o que se quer.
 */
export const FORA_DO_CATALOGO: Record<string, string> = {
  profiles: "A linha do perfil sai com a conta, em `auth.users`.",
  admin_auditoria: "Registo de quem administrou o quê. Apagá-lo a pedido de quem foi administrado tirava-lhe o sentido.",
  admin_partners: "Configuração da plataforma, não dados de pessoas.",
  anuncios: "Configuração da plataforma.",
  site_settings: "Configuração da plataforma.",
  email_waitlist: "Chaveada por email, e apaga-se pela hiperligação do próprio email.",
  propostas_investidores: "Contactos de investidores, sem conta associada.",
  analytics_eventos: "Sem coluna de utilizador — os eventos não são ligados a ninguém.",
  partner_commissions: "Configuração comercial.",
  partner_creatives: "Configuração comercial.",
  partner_placements: "Configuração comercial.",
  partner_link_clicks: "Cliques sem identidade.",
  partner_events: "Eventos de webhook do parceiro, chaveados pela ligação, e saem com ela.",
  billing_customers: "A ligação entre a conta e o cliente na Stripe. Sai em cascata com a própria conta; apagá-la à parte deixava uma subscrição viva sem dono, e a cobrança a seguir sem a quem devolver.",
  guide_partner_routes: "Configuração de routing.",
  recibos_vencimento_legado: "Não existe; nome reservado.",
};
