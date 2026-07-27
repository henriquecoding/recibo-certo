// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE PARCEIROS — recomendações nativas contextuais
//  ---------------------------------------------------------------------
//  O catálogo vem do Supabase (`admin_partners`, gerido no admin). É a ÚNICA
//  origem: se não houver parceiros lá, não aparece cartão nenhum.
//
//  Havia aqui um "catálogo estático de fallback" com cinco parceiros
//  inventados — nomes, descrições e URLs em `parceiros.recibocerto.pt` que
//  nunca existiram — e o cartão mostrava-os com o selo "Parceiro verificado".
//  Ou seja: sempre que o Supabase não respondesse (ou não tivesse parceiros),
//  o site anunciava relações comerciais que não existem, marcadas como
//  verificadas, com links para lado nenhum.
//
//  Isso é o oposto da regra 8 do projeto ("não inventar testemunhos nem
//  métricas") e da promessa do produto. O catálogo passou a ser SEMENTE DE
//  DESENVOLVIMENTO: só é usado com NEXT_PUBLIC_PARTNERS_DEMO="true", para
//  poder desenhar e rever o componente. Em produção, sem parceiros reais,
//  não há cartão.
// ═══════════════════════════════════════════════════════════════════════

export interface Partner {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  cta: string;
  contextos: string[];
  icone: "bank" | "building" | "file-sign" | "heart" | "invoice";
}

/**
 * Semente de desenvolvimento. NÃO é um catálogo de parceiros reais e nunca
 * pode ser servido como tal — ver `catalogoDeDemonstracao()`.
 */
export const SEMENTE_DEMO: Partner[] = [
  {
    id: "conta-pj",
    nome: "Conta profissional online",
    descricao:
      "Separa as finanças pessoais das profissionais numa conta dedicada ao trabalho independente. Sem mensalidades, com IBAN português e exportação de movimentos.",
    url: "https://parceiros.recibocerto.pt/conta-pj",
    cta: "Abrir conta gratuita",
    contextos: ["dashboard", "receitas"],
    icone: "bank",
  },
  {
    id: "faturacao-eletronica",
    nome: "Faturação eletrónica AT",
    descricao:
      "Emite recibos e faturas certificados pela AT sem sair do navegador. Arquivo digital automático, exportação para contabilista disponível.",
    url: "https://parceiros.recibocerto.pt/faturacao",
    cta: "Experimentar grátis",
    contextos: ["recibos", "dashboard"],
    icone: "invoice",
  },
  {
    id: "contabilidade-online",
    nome: "Contabilidade para independentes",
    descricao:
      "Acompanhamento fiscal mensal por um contabilista certificado, especializado em recibos verdes. Prazos e obrigações tratados por quem percebe do assunto.",
    url: "https://parceiros.recibocerto.pt/contabilidade",
    cta: "Ver planos",
    contextos: ["prazos", "simulador"],
    icone: "building",
  },
  {
    id: "certificado-digital",
    nome: "Certificado digital qualificado",
    descricao:
      "Assina e submete declarações fiscais sem sair de casa. Certificado qualificado emitido em 24h, reconhecido pela AT e por todos os portais do Estado.",
    url: "https://parceiros.recibocerto.pt/certificado",
    cta: "Obter certificado",
    contextos: ["prazos"],
    icone: "file-sign",
  },
  {
    id: "seguro-saude",
    nome: "Seguro de saúde individual",
    descricao:
      "Sem empregador a pagar metade, o seguro de saúde é a tua rede de segurança. Planos para trabalhadores independentes com cobertura nacional.",
    url: "https://parceiros.recibocerto.pt/seguro",
    cta: "Simular seguro",
    contextos: ["dashboard"],
    icone: "heart",
  },
];

// ── Tracking de frequência (client-side) ────────────────────
// Idempotente por contexto — o mesmo contexto devolve sempre o mesmo parceiro
// na sessão, tornando-o seguro com o double-invoke do React StrictMode em dev.

const KEY_DISMISSED = (id: string) => `recibocerto:partner:${id}:dismissed`;
const KEY_SESSION_MAP = "recibocerto:partner:contextmap";
const SESSION_CAP = 2; // máx. contextos distintos por sessão

type ContextMap = Record<string, string>;

function getContextMap(): ContextMap {
  try {
    return JSON.parse(sessionStorage.getItem(KEY_SESSION_MAP) ?? "{}") as ContextMap;
  } catch {
    return {};
  }
}

function saveContextMap(map: ContextMap): void {
  try {
    sessionStorage.setItem(KEY_SESSION_MAP, JSON.stringify(map));
  } catch {
    /* ignora */
  }
}

function isDismissed(id: string): boolean {
  try {
    return localStorage.getItem(KEY_DISMISSED(id)) !== null;
  } catch {
    return false;
  }
}

export function dismissPartner(id: string): void {
  try {
    localStorage.setItem(KEY_DISMISSED(id), "1");
  } catch {
    /* ignora */
  }
}

/**
 * Semente de demonstração, só quando explicitamente pedida.
 *
 * Fica atrás de uma bandeira porque a alternativa — devolvê-la por omissão —
 * significa que um erro de rede transforma o site num anunciante de parceiros
 * que não existem. Preferimos não mostrar nada.
 */
export function catalogoDeDemonstracao(): Partner[] {
  return process.env.NEXT_PUBLIC_PARTNERS_DEMO === "true" ? SEMENTE_DEMO : [];
}

/**
 * Devolve o parceiro a mostrar para o `context` dado.
 *
 * `catalog` vem do Supabase. Sem catálogo não há cartão: nunca se inventa um
 * parceiro para preencher o espaço.
 */
export function getPartnerForContext(context: string, catalog?: Partner[]): Partner | null {
  if (typeof window === "undefined") return null;

  const src = catalog ?? catalogoDeDemonstracao();
  if (src.length === 0) return null;
  const map = getContextMap();

  // Já mostrado neste contexto nesta sessão → devolver o mesmo
  if (map[context]) {
    return src.find((p) => p.id === map[context]) ?? null;
  }

  // Cap de sessão (nº de contextos distintos já cobertos)
  if (Object.keys(map).length >= SESSION_CAP) return null;

  const candidates = src.filter(
    (p) => p.contextos.includes(context) && !isDismissed(p.id)
  );
  if (!candidates.length) return null;

  // Rotação diária — varia sem ser aleatória
  const day = Math.floor(Date.now() / 86_400_000);
  const partner = candidates[day % candidates.length];

  map[context] = partner.id;
  saveContextMap(map);
  return partner;
}
