// ═══════════════════════════════════════════════════════════════════════
//  A TABELA `anuncios`, LIDA PELO SITE PÚBLICO
//  ---------------------------------------------------------------------
//  A 004 criou `anuncios` com CRUD completo, ordenação, segmentação por
//  posição e pré-visualização desktop/mobile no admin. A 025 estendeu o
//  `CHECK` do tipo para aceitar `criativo_parceiro`. E, do lado público, nada
//  a lia: uma busca no repositório mostrava que os únicos ficheiros a importar
//  `anuncios` estavam sob `src/app/admin/`.
//
//  Consequência: criar um anúncio, desativá-lo, reordená-lo, ou escolher que
//  aparece só no telemóvel não tinha efeito NENHUM no site. O `AnuncioSlot`
//  — o componente cujo próprio nome é o da tabela — resolvia sempre a parceria
//  FIZ fixa em código e ignorava a configuração toda.
//
//  ── Precedência ──────────────────────────────────────────────────────
//  A mesma regra que se aplicou aos placements, pela mesma razão:
//
//   · existe linha ATIVA para esta superfície  → manda ela;
//   · existe linha INATIVA                     → não se mostra nada. É uma
//     decisão explícita de quem gere o site, e ganha ao código;
//   · não existe linha nenhuma                 → vale o piso em código, para
//     que ligar a parceria não exija abrir o admin e configurar dezasseis
//     superfícies uma a uma.
//
//  Sem o segundo caso, o interruptor «ativo» do admin era decorativo — que é
//  exatamente o defeito que isto corrige.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Só o que o slot público precisa de saber. */
export interface AnuncioPublico {
  id: string;
  tipo: string;
  ativo: boolean;
  ordem: number;
  mostrarDesktop: boolean;
  mostrarMobile: boolean;
  /** Presente quando o anúncio é um criativo de parceiro. */
  logoUrl: string | null;
  cta: string | null;
}

export type ResolucaoAnuncio =
  | { estado: "configurado"; anuncio: AnuncioPublico }
  /** Alguém desligou esta superfície no admin. Não se mostra nada. */
  | { estado: "desligado" }
  /** Nunca foi configurada — vale o piso em código. */
  | { estado: "sem_configuracao" };

const TTL_MS = 60_000;
const cache = new Map<string, { em: number; valor: ResolucaoAnuncio }>();

function servico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Esvazia o cache — usado pelo admin depois de gravar. */
export function invalidarAnuncios(): void {
  cache.clear();
}

/**
 * O anúncio configurado para uma superfície, se houver.
 *
 * Lê também as linhas INATIVAS, de propósito: é a diferença entre «desligado»
 * e «nunca configurado» que dá sentido ao interruptor do admin. Filtrar por
 * `ativo = true` na consulta apagava-a, e o piso em código ressuscitava o
 * anúncio logo a seguir a alguém o desligar.
 */
export async function anuncioDaSuperficie(superficie: string): Promise<ResolucaoAnuncio> {
  const emCache = cache.get(superficie);
  if (emCache && Date.now() - emCache.em < TTL_MS) return emCache.valor;

  const sb = servico();
  // Sem Supabase (desenvolvimento local, pré-visualização sem credenciais) o
  // piso em código é a única resposta possível — e é a certa.
  if (!sb) return { estado: "sem_configuracao" };

  const { data, error } = await sb
    .from("anuncios")
    .select("id, tipo, ativo, ordem, mostrar_desktop, mostrar_mobile, logo_url, cta")
    .contains("posicoes", [superficie])
    .order("ordem", { ascending: true });

  // Um erro de rede não pode apagar a publicidade do site: cai no piso.
  if (error) return { estado: "sem_configuracao" };

  const linhas = data ?? [];
  if (linhas.length === 0) {
    const valor: ResolucaoAnuncio = { estado: "sem_configuracao" };
    cache.set(superficie, { em: Date.now(), valor });
    return valor;
  }

  const ativa = linhas.find((l) => l.ativo === true);
  const valor: ResolucaoAnuncio = ativa
    ? {
        estado: "configurado",
        anuncio: {
          id: String(ativa.id),
          tipo: String(ativa.tipo),
          ativo: true,
          ordem: Number(ativa.ordem ?? 0),
          mostrarDesktop: ativa.mostrar_desktop !== false,
          mostrarMobile: ativa.mostrar_mobile !== false,
          logoUrl: ativa.logo_url ?? null,
          cta: ativa.cta ?? null,
        },
      }
    : // Há linhas para esta superfície e nenhuma está ativa.
      { estado: "desligado" };

  cache.set(superficie, { em: Date.now(), valor });
  return valor;
}

/**
 * Classes para respeitar `mostrar_desktop` / `mostrar_mobile`.
 *
 * A escolha é por CSS e não por user-agent: este componente é servido de forma
 * estática em várias páginas, e decidir no servidor obrigaria a desligar o
 * cache de todas elas. `sm:` é o mesmo ponto de corte que o resto do projeto.
 */
export function classesDeDispositivo(a: Pick<AnuncioPublico, "mostrarDesktop" | "mostrarMobile">): string {
  if (a.mostrarDesktop && a.mostrarMobile) return "";
  if (a.mostrarMobile) return "sm:hidden";
  if (a.mostrarDesktop) return "hidden sm:block";
  // Nem um nem outro: o admin escolheu não mostrar em lado nenhum.
  return "hidden";
}
