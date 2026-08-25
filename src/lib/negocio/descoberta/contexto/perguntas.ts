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
import type { FamiliaCompetencia } from "../conhecimento/tipos";
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
    { id: "essencial", rotulo: "Essencial", nota: "Cinco decisões. Chega para uma primeira análise." },
    { id: "personalizado", rotulo: "Personalizar", nota: "Restrições e preferências passam a eliminar hipóteses." },
    { id: "avancado", rotulo: "Avançado", nota: "Risco por dimensão, prazos e rendimento pretendido." },
  ]);

// ── COMO A INTERFACE ARRUMA ISTO ─────────────────────────────────────
//  ┌──────────────────────────────────────────────────────────────────┐
//  │ O AGRUPAMENTO É DADO, NÃO DESENHO                                 │
//  │                                                                  │
//  │ Vinte e duas competências, catorze meios e quinze recusas numa   │
//  │ grelha plana são cinquenta e um cartões seguidos: a página fica  │
//  │ verdadeira e ilegível ao mesmo tempo. Agrupar resolve — e o       │
//  │ agrupamento vive aqui, com o resto do questionário, para o        │
//  │ componente não passar a ter uma segunda taxonomia sua que        │
//  │ diverge desta em silêncio na primeira entrada nova.               │
//  │                                                                  │
//  │ `negocio-descoberta-perguntas.test.ts` recusa uma entrada sem     │
//  │ grupo e um grupo sem entradas: a suite parte antes de a interface │
//  │ deixar cair uma opção que ninguém volta a ver.                    │
//  └──────────────────────────────────────────────────────────────────┘

/** As famílias do grafo, com o nome que a interface lhes dá. */
export const FAMILIAS_COMPETENCIA: readonly { id: FamiliaCompetencia; rotulo: string }[] =
  Object.freeze([
    { id: "operacional", rotulo: "Organizar e operar" },
    { id: "manual", rotulo: "Trabalho manual" },
    { id: "tecnica", rotulo: "Técnica e digital" },
    { id: "comercial", rotulo: "Comercial e atendimento" },
    { id: "gestao", rotulo: "Gestão" },
    { id: "criativa", rotulo: "Criativa" },
    { id: "cuidado", rotulo: "Cuidar e ensinar" },
  ]);

// ── ATIVOS ───────────────────────────────────────────────────────────

export type GrupoAtivo = "mobilidade" | "equipamento" | "espaco" | "negocio";

export const GRUPOS_ATIVOS: readonly { id: GrupoAtivo; rotulo: string }[] = Object.freeze([
  { id: "mobilidade", rotulo: "Mobilidade" },
  { id: "equipamento", rotulo: "Equipamento" },
  { id: "espaco", rotulo: "Espaço" },
  { id: "negocio", rotulo: "Já do negócio" },
]);

/**
 * Não ter um meio nem sempre quer dizer a mesma coisa.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ O DEFEITO QUE ISTO CORRIGE                                            │
 * │                                                                      │
 * │ `ativosNecessarios` era uma porta dura para TODOS os meios, e oito    │
 * │ capacidades — organizar processos, tratar dados, escrever para       │
 * │ vender, construir software, produzir conteúdo, montar ferramentas    │
 * │ digitais, tratar requisitos formais, atrair clientes — exigiam       │
 * │ «computador». Quem chega a esta ferramenta pela web tem computador.  │
 * │ O que faltava era a CAIXA ASSINALADA, não o computador.              │
 * │                                                                      │
 * │ Medido a 25/08/2026: de 225 perfis sintéticos sem qualquer           │
 * │ resultado, 184 morriam em «meios em falta» e 195 nem sequer          │
 * │ alcançavam uma capacidade. Não era o grafo ser pequeno — era a porta │
 * │ estar fechada à chave por um portátil.                               │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * A distinção é uma pergunta só: **não ter isto impede, ou custa?**
 *
 *  · `estrutural` — impede. Uma cozinha licenciada, um armazém, uma carta
 *    de condução ou uma carteira de clientes não se compram na semana em
 *    que se decide abrir. A ausência ELIMINA, e continua a eliminar.
 *  · `aquisivel` — custa. Um computador, um jogo de ferramentas, uma
 *    bancada ou uma câmara são despesa de arranque como outra qualquer.
 *    A ausência não elimina: fica NOMEADA como coisa a adquirir antes de
 *    começar, pesa no encaixe, e nunca é apresentada como já resolvida.
 *
 * O que este ficheiro NÃO faz é dizer quanto custa adquirir. Não há fonte
 * nossa para o preço de «um computador de trabalho», e inventá-lo seria a
 * exceção que enfraquece a regra inteira — a mesma razão pela qual a renda
 * não é estimada em `viabilidade.ts`. Nomeia-se, não se orça.
 */
export type BarreiraAtivo = "estrutural" | "aquisivel";

export const ATIVOS: readonly {
  id: AtivoId;
  grupo: GrupoAtivo;
  rotulo: string;
  nota: string;
  barreira: BarreiraAtivo;
}[] = Object.freeze([
    { id: "carta-conducao", grupo: "mobilidade", rotulo: "Carta de condução", nota: "Abre tudo o que envolva rota ou deslocação.", barreira: "estrutural" },
    { id: "veiculo-ligeiro", grupo: "mobilidade", rotulo: "Viatura ligeira", nota: "Serve deslocações e recolhas pequenas.", barreira: "estrutural" },
    { id: "veiculo-carga", grupo: "mobilidade", rotulo: "Viatura de carga", nota: "Muda o que é possível: volume, mudanças, entregas B2B.", barreira: "estrutural" },
    { id: "computador", grupo: "equipamento", rotulo: "Computador de trabalho", nota: "Condição de qualquer trabalho digital.", barreira: "aquisivel" },
    { id: "ferramentas", grupo: "equipamento", rotulo: "Ferramentas", nota: "Trabalho manual, instalação e reparação.", barreira: "aquisivel" },
    { id: "equipamento-tecnico", grupo: "equipamento", rotulo: "Equipamento técnico", nota: "Diagnóstico, medição ou bancada.", barreira: "aquisivel" },
    { id: "camara-video", grupo: "equipamento", rotulo: "Equipamento de imagem", nota: "Fotografia e vídeo com qualidade vendável.", barreira: "aquisivel" },
    { id: "espaco-comercial", grupo: "espaco", rotulo: "Espaço comercial", nota: "Um sítio aberto ao público.", barreira: "estrutural" },
    { id: "armazem", grupo: "espaco", rotulo: "Armazém", nota: "Guardar volume entre recolha e entrega.", barreira: "estrutural" },
    { id: "oficina", grupo: "espaco", rotulo: "Oficina", nota: "Espaço próprio de trabalho técnico.", barreira: "estrutural" },
    { id: "cozinha-licenciada", grupo: "espaco", rotulo: "Cozinha licenciada", nota: "Condição de qualquer produção alimentar legal.", barreira: "estrutural" },
    { id: "terreno", grupo: "espaco", rotulo: "Terreno", nota: "Produção agrícola ou atividade ao ar livre.", barreira: "estrutural" },
    { id: "stock", grupo: "negocio", rotulo: "Stock", nota: "Produto já comprado, à espera de ser vendido.", barreira: "estrutural" },
    { id: "carteira-clientes", grupo: "negocio", rotulo: "Carteira de clientes", nota: "O ativo mais subestimado: encurta meses de aquisição.", barreira: "estrutural" },
  ]);

const BARREIRA_POR_ATIVO: ReadonlyMap<AtivoId, BarreiraAtivo> = new Map(
  ATIVOS.map((item) => [item.id, item.barreira]),
);

/** Meio desconhecido conta como estrutural: errar por excesso de cuidado. */
export function barreiraDoAtivo(id: AtivoId): BarreiraAtivo {
  return BARREIRA_POR_ATIVO.get(id) ?? "estrutural";
}

// ── RESTRIÇÕES ───────────────────────────────────────────────────────

export type GrupoRestricao = "estrutura" | "esforco" | "contacto" | "horario" | "setor";

export const GRUPOS_RESTRICOES: readonly { id: GrupoRestricao; rotulo: string }[] = Object.freeze([
  { id: "estrutura", rotulo: "Estrutura do negócio" },
  { id: "esforco", rotulo: "Esforço e mobilidade" },
  { id: "contacto", rotulo: "Contacto com clientes" },
  { id: "horario", rotulo: "Horários" },
  { id: "setor", rotulo: "Setores e dependências" },
]);

export const RESTRICOES: readonly {
  id: RestricaoId;
  grupo: GrupoRestricao;
  rotulo: string;
  nota: string;
}[] = Object.freeze([
  { id: "sem-empregados", grupo: "estrutura", rotulo: "Não quero empregados", nota: "Elimina modelos que só funcionam com equipa." },
  { id: "sem-loja-fisica", grupo: "estrutura", rotulo: "Não quero loja física", nota: "Elimina o que vive de um espaço aberto ao público." },
  { id: "sem-stock", grupo: "estrutura", rotulo: "Não quero stock", nota: "Elimina comprar antes de vender." },
  { id: "sem-financiamento", grupo: "estrutura", rotulo: "Não quero recorrer a financiamento", nota: "Fecha o teto de capital no que tens." },
  { id: "sem-carro", grupo: "esforco", rotulo: "Não tenho carro", nota: "Elimina rotas e trabalho que dependa de viatura." },
  { id: "sem-carregar-peso", grupo: "esforco", rotulo: "Não posso carregar peso", nota: "Elimina trabalho com esforço físico continuado." },
  { id: "sem-trabalho-fisico", grupo: "esforco", rotulo: "Não quero trabalho físico", nota: "Deixa só o que se resolve à secretária ou a falar." },
  { id: "sem-atendimento-presencial", grupo: "contacto", rotulo: "Não quero atendimento presencial", nota: "Elimina as variantes presenciais." },
  { id: "sem-deslocacoes", grupo: "contacto", rotulo: "Não quero deslocar-me", nota: "Elimina trabalho em casa ou instalações do cliente." },
  { id: "sem-porta-a-porta", grupo: "contacto", rotulo: "Não quero vender porta-a-porta", nota: "Desce o encaixe de modelos cujos primeiros clientes vêm de abordagem direta." },
  { id: "sem-fins-de-semana", grupo: "horario", rotulo: "Não quero fins de semana", nota: "Elimina problemas cuja procura se concentra no fim de semana." },
  { id: "sem-noites", grupo: "horario", rotulo: "Não quero trabalhar à noite", nota: "Desce o encaixe de problemas que geram ocorrências fora de horas." },
  { id: "sem-alimentos", grupo: "setor", rotulo: "Não quero trabalhar com alimentos", nota: "Elimina o setor alimentar por inteiro." },
  { id: "sem-atividade-regulada", grupo: "setor", rotulo: "Não quero atividade muito regulada", nota: "Elimina o que acumula licenças e habilitações." },
  { id: "sem-redes-sociais", grupo: "setor", rotulo: "Não quero depender de redes sociais", nota: "Desce o encaixe de modelos que vivem de trazer tráfego." },
]);

// ── ONDE SE RESPONDE CADA COISA ──────────────────────────────────────
//  O painel lateral transformou «o que mais mudaria o resultado» de aviso
//  em atalho: cada linha leva à secção certa e abre o nível onde a
//  pergunta vive. Sem o nível, carregar em «Tolerância ao risco» levava a
//  uma secção que ainda nem existia no ecrã.
//
//  Vive aqui, com o resto do questionário, para o mapa e os campos de
//  profundidade poderem ser confrontados por um teste — um campo sem
//  destino é um botão que não faz nada, e ninguém repara num botão inerte.

export type SeccaoConfigurador =
  | "competencias"
  | "local"
  | "recursos"
  | "tempo"
  | "preferencias"
  | "limites"
  | "risco";

export const ONDE_SE_RESPONDE: Readonly<
  Record<string, { seccao: SeccaoConfigurador; nivel: NivelConfiguracao }>
> = Object.freeze({
  competencias: { seccao: "competencias", nivel: "essencial" },
  regiao: { seccao: "local", nivel: "essencial" },
  concelho: { seccao: "local", nivel: "essencial" },
  territorio: { seccao: "local", nivel: "personalizado" },
  capital: { seccao: "recursos", nivel: "essencial" },
  ativos: { seccao: "recursos", nivel: "essencial" },
  tempo: { seccao: "tempo", nivel: "essencial" },
  prazo: { seccao: "tempo", nivel: "personalizado" },
  restricoes: { seccao: "limites", nivel: "personalizado" },
  preferencias: { seccao: "preferencias", nivel: "personalizado" },
  risco: { seccao: "risco", nivel: "avancado" },
  rendimento: { seccao: "risco", nivel: "avancado" },
});

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
