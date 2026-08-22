// ═══════════════════════════════════════════════════════════════════════
//  O QUESTIONÁRIO — simples por fora, profundo por dentro
//  ---------------------------------------------------------------------
//  Ponto 6: não transformar o configurador num formulário de setenta
//  campos, mas deixar quem quiser precisão configurar profundamente.
//
//  Três níveis, e a regra que os separa é a mesma que decide a
//  profundidade: cada nível acrescenta as respostas que MAIS mudam o
//  resultado a seguir.
//
//   · essencial     — 5 decisões. Chega para o motor correr.
//   · personalizado — mais 8. Restrições e preferências passam a eliminar.
//   · avançado      — o resto. Risco por dimensão, prazos, rendimento.
//
//  Este ficheiro é DADOS, não interface: descreve o que se pergunta e por
//  que ordem. Quem desenha os controlos é o componente — e assim as duas
//  coisas podem mudar em separado.
// ═══════════════════════════════════════════════════════════════════════

import { OPPORTUNITY_SECTORS } from "@/lib/negocio/market/opportunities";
import { COMPETENCIAS } from "../conhecimento/dados/competencias";
import { SETORES } from "../conhecimento/dados/setores";
import type {
  AtivoId,
  Dedicacao,
  FormaEquipa,
  MercadoAlvo,
  PublicoAlvo,
  RestricaoId,
} from "./tipos";

export type NivelConfiguracao = "essencial" | "personalizado" | "avancado";

export const NIVEIS: readonly { id: NivelConfiguracao; rotulo: string; nota: string }[] =
  Object.freeze([
    { id: "essencial", rotulo: "O essencial", nota: "Cinco decisões. Chega para uma primeira análise." },
    { id: "personalizado", rotulo: "Personalizar mais", nota: "Restrições e preferências passam a eliminar hipóteses." },
    { id: "avancado", rotulo: "Preferências avançadas", nota: "Risco por dimensão, prazos e rendimento pretendido." },
  ]);

// ── ATIVOS ───────────────────────────────────────────────────────────

export const ATIVOS: readonly { id: AtivoId; rotulo: string; nota: string }[] = Object.freeze([
  { id: "carta-conducao", rotulo: "Carta de condução", nota: "Abre tudo o que envolva rota ou deslocação." },
  { id: "veiculo-ligeiro", rotulo: "Viatura ligeira", nota: "Serve deslocações e recolhas pequenas." },
  { id: "veiculo-carga", rotulo: "Viatura de carga", nota: "Muda o que é possível: volume, mudanças, entregas B2B." },
  { id: "computador", rotulo: "Computador de trabalho", nota: "Condição de qualquer trabalho digital." },
  { id: "ferramentas", rotulo: "Ferramentas", nota: "Trabalho manual, instalação e reparação." },
  { id: "equipamento-tecnico", rotulo: "Equipamento técnico", nota: "Diagnóstico, medição ou bancada." },
  { id: "camara-video", rotulo: "Equipamento de imagem", nota: "Fotografia e vídeo com qualidade vendável." },
  { id: "espaco-comercial", rotulo: "Espaço comercial", nota: "Um sítio aberto ao público." },
  { id: "armazem", rotulo: "Armazém", nota: "Guardar volume entre recolha e entrega." },
  { id: "oficina", rotulo: "Oficina", nota: "Espaço próprio de trabalho técnico." },
  { id: "cozinha-licenciada", rotulo: "Cozinha licenciada", nota: "Condição de qualquer produção alimentar legal." },
  { id: "terreno", rotulo: "Terreno", nota: "Produção agrícola ou atividade ao ar livre." },
  { id: "stock", rotulo: "Stock", nota: "Produto já comprado, à espera de ser vendido." },
  { id: "carteira-clientes", rotulo: "Carteira de clientes", nota: "O ativo mais subestimado: encurta meses de aquisição." },
]);

// ── RESTRIÇÕES ───────────────────────────────────────────────────────

export const RESTRICOES: readonly { id: RestricaoId; rotulo: string; nota: string }[] = Object.freeze([
  { id: "sem-empregados", rotulo: "Não quero empregados", nota: "Elimina modelos que só funcionam com equipa." },
  { id: "sem-loja-fisica", rotulo: "Não quero loja física", nota: "Elimina o que vive de um espaço aberto ao público." },
  { id: "sem-stock", rotulo: "Não quero stock", nota: "Elimina comprar antes de vender." },
  { id: "sem-carro", rotulo: "Não tenho carro", nota: "Elimina rotas e trabalho que dependa de viatura." },
  { id: "sem-carregar-peso", rotulo: "Não posso carregar peso", nota: "Elimina trabalho com esforço físico continuado." },
  { id: "sem-trabalho-fisico", rotulo: "Não quero trabalho físico", nota: "Deixa só o que se resolve à secretária ou a falar." },
  { id: "sem-atendimento-presencial", rotulo: "Não quero atendimento presencial", nota: "Elimina as variantes presenciais." },
  { id: "sem-deslocacoes", rotulo: "Não quero deslocar-me", nota: "Elimina trabalho em casa ou instalações do cliente." },
  { id: "sem-fins-de-semana", rotulo: "Não quero fins de semana", nota: "Elimina problemas cuja procura se concentra no fim de semana." },
  { id: "sem-noites", rotulo: "Não quero trabalhar à noite", nota: "Pesa em problemas com ocorrências fora de horas." },
  { id: "sem-alimentos", rotulo: "Não quero trabalhar com alimentos", nota: "Elimina o setor alimentar por inteiro." },
  { id: "sem-atividade-regulada", rotulo: "Não quero atividade muito regulada", nota: "Elimina o que acumula licenças e habilitações." },
  { id: "sem-financiamento", rotulo: "Não quero recorrer a financiamento", nota: "Fecha o teto de capital no que tens." },
  { id: "sem-redes-sociais", rotulo: "Não quero depender de redes sociais", nota: "Pesa em modelos que vivem de tráfego." },
  { id: "sem-porta-a-porta", rotulo: "Não quero vender porta-a-porta", nota: "Pesa em aquisição direta ao consumidor." },
]);

// ── PÚBLICOS ─────────────────────────────────────────────────────────

export const PUBLICOS: readonly { id: PublicoAlvo; rotulo: string }[] = Object.freeze([
  { id: "empresas", rotulo: "Empresas" },
  { id: "familias", rotulo: "Famílias" },
  { id: "idosos", rotulo: "Pessoas idosas" },
  { id: "criancas", rotulo: "Crianças" },
  { id: "animais", rotulo: "Animais" },
  { id: "turistas", rotulo: "Turistas" },
  { id: "profissionais", rotulo: "Profissionais" },
  { id: "setor-publico", rotulo: "Setor público" },
]);

// ── OUTRAS LISTAS ────────────────────────────────────────────────────

export const DEDICACOES: readonly { id: Dedicacao; rotulo: string; horas: number }[] = Object.freeze([
  { id: "integral", rotulo: "A tempo inteiro", horas: 40 },
  { id: "part-time", rotulo: "Part-time", horas: 20 },
  { id: "fins-de-semana", rotulo: "Fins de semana", horas: 12 },
  { id: "poucas-horas", rotulo: "Poucas horas por semana", horas: 6 },
]);

export const EQUIPAS: readonly { id: FormaEquipa; rotulo: string }[] = Object.freeze([
  { id: "sozinho", rotulo: "Sozinho" },
  { id: "casal", rotulo: "Em casal" },
  { id: "familia", rotulo: "Em família" },
  { id: "socios", rotulo: "Com sócios" },
  { id: "equipa", rotulo: "Com equipa" },
]);

export const MERCADOS: readonly { id: MercadoAlvo; rotulo: string; nota: string }[] = Object.freeze([
  { id: "indiferente", rotulo: "Tanto faz", nota: "" },
  { id: "b2b", rotulo: "Empresas (B2B)", nota: "Ciclos mais longos, contratos maiores." },
  { id: "b2c", rotulo: "Consumidor (B2C)", nota: "Decisão rápida, ticket menor." },
  { id: "b2g", rotulo: "Setor público (B2G)", nota: "Procedimentos formais e prazos rígidos." },
]);

/** As faixas de capital, com o valor que representam para o motor. */
export const FAIXAS_CAPITAL: readonly { rotulo: string; valor: number | undefined }[] = Object.freeze([
  { rotulo: "Ainda não sei", valor: undefined },
  { rotulo: "Praticamente nada", valor: 200 },
  { rotulo: "Até 1 000 €", valor: 1000 },
  { rotulo: "1 000 – 5 000 €", valor: 5000 },
  { rotulo: "5 000 – 20 000 €", valor: 20000 },
  { rotulo: "Mais de 20 000 €", valor: 50000 },
]);

export const PRAZOS_RECEITA: readonly { rotulo: string; meses: number | undefined }[] = Object.freeze([
  { rotulo: "Ainda não sei", meses: undefined },
  { rotulo: "Até 1 mês", meses: 1 },
  { rotulo: "Até 3 meses", meses: 3 },
  { rotulo: "Até 6 meses", meses: 6 },
  { rotulo: "Até 1 ano", meses: 12 },
]);

/** As competências do grafo, já prontas para a interface. */
export const COMPETENCIAS_OFERECIDAS = COMPETENCIAS;

/** Os setores do grafo. Não confundir com os do catálogo curado. */
export const SETORES_OFERECIDOS = SETORES;

/** Mantido para as superfícies que ainda falam a linguagem do catálogo. */
export const SETORES_DO_CATALOGO = OPPORTUNITY_SECTORS;
