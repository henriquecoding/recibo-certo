// ═══════════════════════════════════════════════════════════════════════
//  A LEITURA — quem é que sequer entra na corrida
//  ---------------------------------------------------------------------
//  A fronteira é a mesma de sempre: `contabilistas_publico`, nunca a tabela.
//  E as colunas são ditas uma a uma, como em `diretorio.ts` — a view é a
//  fronteira de segurança, esta lista é a de apresentação.
//
//  ── Porque é que são DUAS consultas ──────────────────────────────────
//  A primeira pede quem declarou pelo menos uma das áreas. Bastaria, se as
//  áreas declaradas fossem toda a verdade. Não são: quem escreveu «nómadas
//  digitais» sem marcar «Clientes internacionais» tem essa área por
//  implicação — `areasEfetivas()` sabe calculá-la, mas o `overlaps` da base
//  de dados não, porque a implicação vive no nosso código e não numa coluna.
//
//  Sem a segunda consulta, o refinamento por termos próprios só funcionaria
//  para quem já estava marcado — ou seja, exatamente para quem não precisa
//  dele. As duas correm em paralelo, trazem no máximo vinte e quatro linhas,
//  e só acontecem quando a secção entra no ecrã.
//
//  ── O que NÃO se filtra na base de dados ─────────────────────────────
//  Não se exclui quem não aceita clientes na consulta principal; PREFERE-SE
//  quem aceita, e só se vai buscar os outros se a lista ficasse vazia. A
//  diferença importa: um diretório a começar tem duas ou três fichas, e um
//  filtro rígido devolvia zero cartões numa página que prometia cartões.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import { CAMPOS_DO_CARTAO, paraCartao, type CartaoDoDiretorio, type Linha } from "../diretorio";
import { lerTermos } from "../personalizacao/taxonomia";
import { lerCobertura } from "../personalizacao/cobertura";
import type { FichaParaAfinidade } from "./motor";
import { apenasCorrespondentes, ordenarPorAfinidade } from "./motor";
import type { CandidatoAfinidade, Necessidade } from "./tipos";

const VISTA_PUBLICA = "contabilistas_publico";

/**
 * O que o cartão já pedia, mais as duas colunas de que o motor precisa.
 *
 * `perfil_termos` são no máximo oito etiquetas de 48 caracteres e
 * `cobertura` é um objeto pequeno: doze fichas destas continuam a ser menos
 * bytes do que a bio de uma só.
 */
const CAMPOS_DA_AFINIDADE = `${CAMPOS_DO_CARTAO},perfil_termos,cobertura`;

/** Quantas fichas entram na corrida por cada consulta. */
const LOTE = 12;

function paraFicha(l: Linha): FichaParaAfinidade {
  return {
    cartao: paraCartao(l),
    // Os dois motores toleram lixo em vez de lançar — uma entrada
    // estragada não pode apagar a ficha inteira de quem vive dela.
    termos: lerTermos(l.perfil_termos),
    cobertura: l.cobertura ? lerCobertura(l.cobertura) : null,
  };
}

async function lote(
  aplicar: (q: ReturnType<typeof consulta>) => ReturnType<typeof consulta>,
): Promise<FichaParaAfinidade[]> {
  const { data, error } = await aplicar(consulta()).range(0, LOTE - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraFicha(l as unknown as Linha));
}

function consulta() {
  return getSupabase()
    .from(VISTA_PUBLICA)
    .select(CAMPOS_DA_AFINIDADE)
    .order("aceita_novos_clientes", { ascending: false })
    .order("nome", { ascending: true });
}

export interface ResultadoDaAfinidade {
  candidatos: CandidatoAfinidade[];
  /** Quantas fichas entraram na corrida, antes do corte. */
  avaliados: number;
  /** Quantos dos candidatos cobrem mesmo alguma das áreas pedidas. */
  correspondentes: number;
}

/**
 * Os contabilistas a mostrar no fim de um contexto.
 *
 * Devolve uma lista vazia sem lançar quando o diretório está vazio — um fim
 * de página sem cartões é um estado legítimo, e não um erro a comunicar.
 */
export async function lerCandidatos(
  necessidade: Necessidade,
  { limite = 3 }: { limite?: number } = {},
): Promise<ResultadoDaAfinidade> {
  const areas = necessidade.areas.map((a) => a.area);

  const [porArea, gerais] = await Promise.all([
    areas.length > 0
      ? lote((q) => q.overlaps("especialidades", areas)).catch(() => [])
      : Promise.resolve<FichaParaAfinidade[]>([]),
    lote((q) => q.eq("aceita_novos_clientes", true)).catch(() => []),
  ]);

  let fichas = juntarSemRepetir(porArea, gerais);

  // Só agora, e só se a lista ficaria vazia, se vai buscar quem não tem
  // vagas. Mostrar «Sem vagas» quando há alternativas seria oferecer uma
  // porta fechada; não mostrar nada quando é tudo o que existe seria pior.
  if (fichas.length === 0) {
    fichas = await lote((q) => q).catch(() => []);
  }

  // Pontua o lote inteiro antes de cortar — cortar antes seria escolher
  // pela ordem em que a base de dados devolveu as linhas.
  const ordenados = ordenarPorAfinidade(fichas, necessidade, { limite: fichas.length });

  const candidatos = apenasCorrespondentes(ordenados, limite);

  return {
    candidatos,
    avaliados: fichas.length,
    correspondentes: candidatos.filter((c) => c.correspondeAsAreas).length,
  };
}

function juntarSemRepetir(...lotes: FichaParaAfinidade[][]): FichaParaAfinidade[] {
  const vistos = new Set<string>();
  const out: FichaParaAfinidade[] = [];
  for (const l of lotes) {
    for (const f of l) {
      if (vistos.has(f.cartao.userId)) continue;
      vistos.add(f.cartao.userId);
      out.push(f);
    }
  }
  return out;
}

export type { CartaoDoDiretorio };
