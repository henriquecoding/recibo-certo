// ═══════════════════════════════════════════════════════════════════════
//  PERFIL PROFISSIONAL — o que se pode dizer, e o que não se pode
//  ---------------------------------------------------------------------
//  Este ficheiro não desenha nada. Responde a três perguntas que o editor
//  e o perfil público têm de responder da MESMA maneira, senão prometem
//  coisas diferentes à mesma pessoa:
//
//   1. o perfil está pronto para receber contactos? (§133)
//   2. que sinais de confiança são verdadeiros? (§139)
//   3. que ação faz sentido oferecer a quem está a ver? (§136)
//
//  A regra que atravessa tudo é a §139: só factos verificáveis. Nada de
//  «top contabilista», estrelas sem avaliações, ou anos de experiência
//  calculados a partir da data de criação da conta. Um número que a
//  própria pessoa escreveu é um compromisso, não uma medição — e é assim
//  que tem de ser rotulado.
// ═══════════════════════════════════════════════════════════════════════

import type { Contabilista, EstadoVinculo } from "./tipos";

// ─── Identidade declarada ──────────────────────────────────────────────

/** Os campos que o editor acrescenta à ficha. Todos públicos por desenho. */
export interface PerfilDeclarado {
  tituloProfissional: string | null;
  apresentacaoCurta: string | null;
  idiomas: string[];
  anosExperiencia: number | null;
  respostaMediaHoras: number | null;
  /** Facto administrativo. O próprio nunca o escreve — ver §124. */
  occVerificado: boolean;
  linkedinLigado: boolean;
}

export type FichaDePerfil = Contabilista & PerfilDeclarado;

/** O mesmo vocabulário fechado de `catalogo_idiomas`. Ver §129. */
export const IDIOMAS: readonly { codigo: string; nome: string }[] = [
  { codigo: "pt", nome: "Português" },
  { codigo: "en", nome: "Inglês" },
  { codigo: "es", nome: "Espanhol" },
  { codigo: "fr", nome: "Francês" },
  { codigo: "de", nome: "Alemão" },
  { codigo: "it", nome: "Italiano" },
  { codigo: "nl", nome: "Neerlandês" },
  { codigo: "uk", nome: "Ucraniano" },
];

const NOME_DO_IDIOMA = new Map(IDIOMAS.map((i) => [i.codigo, i.nome]));

/** «Português, Inglês». Códigos desconhecidos ficam de fora, não a cru. */
export function nomesDosIdiomas(codigos: readonly string[]): string[] {
  return codigos.map((c) => NOME_DO_IDIOMA.get(c)).filter((n): n is string => Boolean(n));
}

// ─── Completude ────────────────────────────────────────────────────────

export interface Essencial {
  id: "apresentacao" | "areas" | "contacto" | "localizacao";
  rotulo: string;
  completo: boolean;
}

/**
 * O que falta para o perfil dar contexto antes do primeiro contacto.
 *
 * A localização só é essencial para quem atende presencialmente — §133.
 * Exigi-la a quem trabalha só online seria inventar um requisito e depois
 * culpar a pessoa por não o cumprir.
 *
 * ⚠️ Isto NÃO é XP nem gamificação. A §133 é explícita: preencher campos
 * do perfil não pode dar progressão profissional, senão cria um incentivo
 * superficial e confunde-se com a Progressão/Comissão.
 */
export function essenciaisDoPerfil(f: FichaDePerfil): Essencial[] {
  const temContacto = Boolean(
    f.emailContacto?.trim() || f.telefone?.trim() || f.website?.trim()
  );
  const essenciais: Essencial[] = [
    { id: "apresentacao", rotulo: "Apresentação", completo: f.bio.trim().length > 0 },
    { id: "areas", rotulo: "Áreas de trabalho", completo: f.especialidades.length > 0 },
    { id: "contacto", rotulo: "Forma de contacto", completo: temContacto },
  ];

  if (f.modalidades.includes("presencial")) {
    essenciais.push({
      id: "localizacao",
      rotulo: "Localização",
      completo: Boolean(f.distrito || f.concelho?.trim()),
    });
  }

  return essenciais;
}

export interface Completude {
  essenciais: Essencial[];
  completos: number;
  total: number;
  pronto: boolean;
  /** O que se diz por cima da barra. Nunca «perfil inválido» — §133. */
  rotulo: string;
}

export function completudeDoPerfil(f: FichaDePerfil): Completude {
  const essenciais = essenciaisDoPerfil(f);
  const completos = essenciais.filter((e) => e.completo).length;
  const pronto = completos === essenciais.length;
  return {
    essenciais,
    completos,
    total: essenciais.length,
    pronto,
    // Um campo opcional em falta não torna um perfil inválido. Torna-o
    // menos útil a quem o lê, e é isso que a frase tem de dizer.
    rotulo: pronto ? "Perfil pronto para receber contactos" : "Falta contexto para os clientes",
  };
}

// ─── Sinais de confiança ───────────────────────────────────────────────

export interface Sinal {
  id: string;
  rotulo: string;
  /** Presente = verdadeiro. Um sinal falso não aparece esbatido: não aparece. */
  presente: boolean;
}

/**
 * Só factos. A lista da §139, e nada além dela.
 *
 * Repare-se no que NÃO está aqui: avaliações, número de clientes, «mais
 * procurado», percentagens de resposta. Nenhum desses dados existe, e
 * inventá-los é o modo mais rápido de um diretório deixar de valer nada.
 */
export function sinaisDeConfianca(f: FichaDePerfil): Sinal[] {
  return [
    {
      id: "occ",
      // O rótulo muda com o facto: informado ≠ verificado (§124).
      rotulo: f.occVerificado ? "Nº OCC verificado" : "Nº OCC informado",
      presente: Boolean(f.occ?.trim()),
    },
    { id: "linkedin", rotulo: "LinkedIn ligado", presente: f.linkedinLigado },
    { id: "areas", rotulo: "Áreas de trabalho definidas", presente: f.especialidades.length > 0 },
    {
      id: "contacto",
      rotulo: "Contacto disponível",
      presente: Boolean(f.emailContacto?.trim() || f.telefone?.trim() || f.website?.trim()),
    },
    { id: "conta", rotulo: "Conta aprovada pelo Recibo Certo", presente: f.estado === "aprovado" },
  ];
}

// ─── Checklist do editor ───────────────────────────────────────────────

export interface ItemChecklist {
  id: string;
  rotulo: string;
  feito: boolean;
}

/**
 * O que ainda dá para melhorar. Sugestões, não requisitos.
 *
 * ⚠️ Não há aqui nenhum item de «testemunhos» ou «avaliações», e é
 * deliberado. Um botão «adicionar testemunhos» ao lado do perfil implica
 * que é o próprio a escrevê-los — e um testemunho escrito pelo próprio
 * não é um sinal de confiança, é copy. Um sistema de avaliações honesto
 * precisa de: só avaliar quem teve consulta concluída, uma por consulta,
 * imutabilidade depois de publicada, moderação e direito de resposta.
 * Isso é uma frente de produto, não uma linha de checklist.
 */
export function checklistPerfil(f: FichaDePerfil): ItemChecklist[] {
  return [
    { id: "foto", rotulo: "Fotografia de perfil", feito: f.linkedinLigado },
    { id: "titulo", rotulo: "Título profissional", feito: Boolean(f.tituloProfissional?.trim()) },
    { id: "apresentacao_curta", rotulo: "Apresentação de uma linha", feito: Boolean(f.apresentacaoCurta?.trim()) },
    { id: "bio", rotulo: "Apresentação completa", feito: f.bio.trim().length > 0 },
    { id: "areas", rotulo: "Áreas de trabalho", feito: f.especialidades.length > 0 },
    { id: "idiomas", rotulo: "Idiomas de atendimento", feito: f.idiomas.length > 0 },
    { id: "contacto", rotulo: "Contactos de confiança", feito: Boolean(f.emailContacto?.trim()) },
  ];
}

// ─── Copy que não pode derrapar ────────────────────────────────────────

/**
 * O que se diz sobre o preço no perfil público.
 *
 * A §123 fecha a porta ao preço universal: o valor é acordado em função
 * do serviço. Esta função devolve sempre uma de duas frases aprovadas e
 * nunca constrói «desde X €» — que é a construção que reabre a promessa
 * pela porta das traseiras.
 */
export function copyPreco(): string {
  return "Valor acordado após análise do serviço necessário.";
}

/**
 * O que se diz sobre o tempo de resposta.
 *
 * Declarado, e dito como declarado. «Tempo médio de resposta: 24h» lê-se
 * como uma medição; «responde normalmente em 24h» lê-se como o que é.
 */
export function copyResposta(horas: number | null): string | null {
  if (!horas || horas < 1) return null;
  if (horas < 24) return `Responde normalmente em ${horas}h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "Responde normalmente em 24h" : `Responde normalmente em ${dias} dias`;
}

/**
 * O que se diz ao contabilista sobre quem vê os seus contactos.
 *
 * Tem de dizer a verdade sobre o esquema, e o esquema trata os dois
 * campos de maneira diferente: o email está no contrato público — é o
 * que aparece no diretório —, o telefone só sai por
 * `contacto_do_contabilista`, a quem tem vínculo vivo.
 */
export const COPY_CONTACTOS =
  "O email e o site aparecem no teu perfil público. O telefone só é " +
  "partilhado com clientes que já tenham acompanhamento contigo.";

// ─── A ação que faz sentido oferecer ───────────────────────────────────

export type AcaoPublica =
  | "entrar"
  | "pedir_vinculo"
  | "pedido_enviado"
  | "marcar_consulta"
  | "em_pausa"
  | "sem_vagas"
  | "terminado";

export interface Contexto {
  autenticado: boolean;
  estadoVinculo: EstadoVinculo | null;
  aceitaNovosClientes: boolean;
}

/**
 * Que CTA mostrar no perfil público (§136).
 *
 * A regra é não mostrar ações impossíveis e bloqueá-las depois num modal.
 * Se não há vagas e não há vínculo, o botão não diz «pedir acompanhamento»
 * para depois recusar — diz que não há vagas.
 */
export function acaoDoPerfilPublico(c: Contexto): AcaoPublica {
  if (c.estadoVinculo === "ativo") return "marcar_consulta";
  if (c.estadoVinculo === "pausado") return "em_pausa";
  if (c.estadoVinculo === "pendente" || c.estadoVinculo === "convidado") return "pedido_enviado";
  // Um vínculo terminado não impede um pedido novo — a pessoa pode voltar.
  if (!c.aceitaNovosClientes) return "sem_vagas";
  if (!c.autenticado) return "entrar";
  return "pedir_vinculo";
}

export const ROTULO_ACAO: Record<AcaoPublica, string> = {
  entrar: "Entrar para pedir acompanhamento",
  pedir_vinculo: "Pedir acompanhamento",
  pedido_enviado: "Pedido enviado",
  marcar_consulta: "Marcar consulta",
  em_pausa: "Acompanhamento em pausa",
  sem_vagas: "Sem vagas de momento",
  terminado: "Pedir acompanhamento",
};

/** As ações que não levam a lado nenhum — o botão fica desativado. */
export function acaoEstaDisponivel(a: AcaoPublica): boolean {
  return a !== "pedido_enviado" && a !== "em_pausa" && a !== "sem_vagas";
}
