// Competências atómicas. Deliberadamente poucas e distinguíveis: uma
// taxonomia com sessenta entradas parece rica e produz perfis em que
// ninguém se reconhece. Cada uma tem de significar algo diferente para o
// que o motor consegue propor a seguir.
import type { Competencia } from "../tipos";

export const COMPETENCIAS: readonly Competencia[] = Object.freeze([
  { id: "organizacao", rotulo: "Organizar e executar", familia: "operacional", descricao: "Manter processos, prazos e listas a funcionar sem alguém a lembrar." },
  { id: "logistica", rotulo: "Logística e transporte", familia: "operacional", descricao: "Rotas, cargas, entregas, recolhas e o tempo que cada uma leva a sério." },
  { id: "limpeza", rotulo: "Limpeza e manutenção de espaços", familia: "manual", descricao: "Trabalho de fundo, com método e com prazo." },
  { id: "construcao", rotulo: "Obras e acabamentos", familia: "manual", descricao: "Trabalho de construção civil, remodelação ou acabamentos." },
  { id: "tecnica-equipamento", rotulo: "Reparar e manter equipamento", familia: "tecnica", descricao: "Diagnosticar avarias e pôr máquinas a trabalhar outra vez." },
  { id: "eletrica", rotulo: "Instalações elétricas", familia: "tecnica", descricao: "Trabalho elétrico com habilitação — não é bricolage." },
  { id: "informatica", rotulo: "Informática e redes", familia: "tecnica", descricao: "Configurar sistemas, redes e equipamento para outras pessoas." },
  { id: "programacao", rotulo: "Programação", familia: "tecnica", descricao: "Escrever e manter software." },
  { id: "dados", rotulo: "Trabalhar com dados", familia: "tecnica", descricao: "Folhas de cálculo a sério, limpeza, cruzamento e migração." },
  { id: "design", rotulo: "Design e imagem", familia: "criativa", descricao: "Fotografia, vídeo, grafismo e a diferença entre bonito e vendável." },
  { id: "escrita", rotulo: "Escrever e comunicar", familia: "criativa", descricao: "Textos que uma pessoa lê até ao fim e percebe." },
  { id: "vendas", rotulo: "Vender e negociar", familia: "comercial", descricao: "Procurar clientes, apresentar preço e fechar sem baixar sempre." },
  { id: "atendimento", rotulo: "Atendimento ao público", familia: "comercial", descricao: "Estar à frente de pessoas o dia inteiro sem perder a paciência." },
  { id: "gestao", rotulo: "Gerir um negócio", familia: "gestao", descricao: "Contas, decisões, fornecedores e o que fazer quando falta dinheiro." },
  { id: "coordenacao", rotulo: "Coordenar terceiros", familia: "gestao", descricao: "Pôr fornecedores e prestadores a cumprir o mesmo calendário." },
  { id: "cuidar", rotulo: "Acompanhar pessoas", familia: "cuidado", descricao: "Paciência, confiança e presença com quem precisa de ajuda." },
  { id: "ensinar", rotulo: "Ensinar e formar", familia: "cuidado", descricao: "Explicar até a outra pessoa conseguir fazer sozinha." },
  { id: "animais", rotulo: "Lidar com animais", familia: "cuidado", descricao: "Experiência real com animais que não são os teus." },
  { id: "cozinha", rotulo: "Cozinhar e produzir alimentos", familia: "manual", descricao: "Produção com regularidade e com regras de segurança alimentar." },
  { id: "agricultura", rotulo: "Trabalho agrícola", familia: "manual", descricao: "Cultivo, criação ou gestão de terreno produtivo." },
  { id: "linguas", rotulo: "Línguas estrangeiras", familia: "comercial", descricao: "Falar com clientes que não falam português." },
  { id: "burocracia", rotulo: "Papelada e requisitos formais", familia: "operacional", descricao: "Ler regulamentos, cruzar prazos e montar dossiers completos." },

  // ── SEIS QUE FALTAVAM, E PORQUE FALTAVAM ────────────────────────────
  //  As vinte e duas primeiras cobriam bem o que o grafo sabia atacar —
  //  medido, vinte delas geram hipóteses sozinhas. O que faltava não era
  //  ligação, era COBERTURA: sete das ocupações independentes mais comuns
  //  em Portugal não tinham onde ser declaradas.
  //
  //  Duas delas estavam escondidas dentro de outras, e isso custava
  //  precisão a sério:
  //   · a jardinagem vivia dentro de «limpeza», e a própria ontologia já
  //     avisava que a divisão 81 junta limpeza de edifícios COM plantação
  //     e manutenção de jardins — separá-las é a mesma divisão da CAE
  //     lida com duas intenções diferentes;
  //   · a fotografia vivia dentro de «design», que é outra coisa: quem
  //     fotografa produto não faz necessariamente identidade visual.
  //
  //  Cada uma destas seis tem capacidade própria em `capacidades.ts` e
  //  problema que a use em `problemas.ts` — o grafo recusa-se a arrancar
  //  com uma competência que nenhuma capacidade usa, e é essa asserção
  //  que impede isto de virar uma lista de botões mortos.
  { id: "jardinagem", rotulo: "Jardins e espaços verdes", familia: "manual", descricao: "Podar, cortar, plantar e manter terreno — com a máquina certa e no tempo certo do ano." },
  { id: "estetica", rotulo: "Estética e cuidados de imagem", familia: "cuidado", descricao: "Cabelo, unhas ou estética, com prática real em pessoas que não são conhecidas." },
  { id: "treino", rotulo: "Treino e atividade física", familia: "cuidado", descricao: "Orientar exercício a outras pessoas. Em ginásio exige título profissional — ver a hipótese." },
  { id: "costura", rotulo: "Costura e arranjos de roupa", familia: "manual", descricao: "Máquina, medidas e acabamento que aguenta lavagens." },
  { id: "fotografia", rotulo: "Fotografia e vídeo", familia: "criativa", descricao: "Fotografar ou filmar para vender — produto, espaço ou pessoas, com luz tratada." },
  { id: "marketing", rotulo: "Marketing e presença digital", familia: "comercial", descricao: "Pôr um negócio a aparecer a quem procura, e medir se apareceu." },
] as const);

export const COMPETENCIA_POR_ID = new Map(COMPETENCIAS.map((item) => [item.id, item]));
