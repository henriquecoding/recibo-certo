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
] as const);

export const COMPETENCIA_POR_ID = new Map(COMPETENCIAS.map((item) => [item.id, item]));
