// ═══════════════════════════════════════════════════════════════════════
//  O QUE A PESSOA RESPONDEU MESMO — e o que estamos a assumir por ela
//  ---------------------------------------------------------------------
//  O defeito que este ficheiro existe para fechar é o mais caro da
//  ferramenta, e é invisível a olho nu.
//
//  Todos os campos são números com valor por omissão, e um campo vazio
//  devolve zero — que é um valor legítimo. A ferramenta não conseguia
//  distinguir «o custo é 0 porque isto é um ficheiro» de «o custo é 0
//  porque ainda não disse nada». Sem essa distinção, o único indicador de
//  confiança possível era um booleano: `tocado`.
//
//  E um booleano vira-se com uma tecla. Bastava escrever um dígito em
//  qualquer campo — o volume, por exemplo — para o cartão deixar de dizer
//  «Um exemplo, por enquanto» e passar a dizer «QUANTO DEVES COBRAR», com
//  toda a autoridade de um conselho, por cima de vinte e cinco
//  pressupostos que ninguém tinha confirmado. Era o mesmo defeito que o
//  estado `tocado` tinha vindo corrigir, só que uma tecla mais tarde.
//
//  ── A regra ────────────────────────────────────────────────────────
//  Um campo só conta como respondido quando a pessoa lhe mexeu. Daí saem
//  três estados, e não dois:
//
//    exemplo    ninguém tocou em nada         → o número é do cenário
//    estimado   falta parte do essencial      → e diz-se O QUÊ falta
//    completo   o essencial está respondido   → o número é dela
//
//  ── Porque é que isto vive na engine ───────────────────────────────
//  Porque é o mesmo `estimado`/`completo` que `simulator_complete` e
//  `escolherRota()` esperam, e porque a lista do que é essencial em cada
//  cenário já vive aqui, em `perguntas.ts`. Tê-la em duplicado no
//  componente seria garantir que as duas divergiam ao terceiro cenário
//  novo.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioInicial, ContextoPreco } from "./tipos";
import { cenarioPorChave, type CampoPergunta } from "./perguntas";

/**
 * O identificador de cada campo respondível.
 *
 * É o MESMO texto que o `id` do elemento no DOM, de propósito: o bloco
 * «estamos a assumir» leva a pessoa ao campo em falta, e um mapa de
 * tradução entre as duas listas seria uma terceira coisa para manter
 * sincronizada.
 */
export type CampoId = string;

/** Que campos é preciso responder para cada pergunta do modo rápido. */
const CAMPOS_DE: Record<CampoPergunta, CampoId[]> = {
  custo_compra: ["custo-direto", "custo-inclui-iva"],
  custo_producao: ["custo-producao"],
  materiais: ["materia-lote", "materia-unidades"],
  horas: ["horas-unidade"],
  valor_hora: ["rendimento-ano"],
  objetivo_ganho: ["ganho-mensal"],
  canal: ["canal-venda"],
  margem: ["objetivo-pct"],
  volume: ["volume"],
  iva: ["regime-iva"],
  preco_pensado: ["preco-pensado"],
};

export type EstadoPreenchimento = "exemplo" | "estimado" | "completo";

export interface Pressuposto {
  campo: CampoId;
  /** O que estamos a assumir, em linguagem de pessoa. */
  rotulo: string;
  /** O valor que está a ser usado, já formatado. */
  valor: string;
  /** Porque é que isto muda o preço. Uma frase. */
  porque: string;
}

export interface Preenchimento {
  estado: EstadoPreenchimento;
  /** Campos essenciais deste cenário que ainda ninguém respondeu. */
  faltam: CampoId[];
  /** Os mesmos, explicados e com o valor que está a ser assumido. */
  pressupostos: Pressuposto[];
  /** Quantos essenciais já foram respondidos, sobre o total. */
  respondidos: number;
  total: number;
}

/** Os campos essenciais de um cenário, por ordem de aparecimento. */
export function essenciaisDe(cenario: CenarioInicial): CampoId[] {
  return cenarioPorChave(cenario).rapido.flatMap((p) => CAMPOS_DE[p] ?? []);
}

/**
 * O estado de preenchimento de um contexto.
 *
 * `respondidos` é o conjunto de ids em que a pessoa mexeu — mantido pela
 * interface, porque é a única que sabe o que foi uma edição e o que foi
 * um valor de partida.
 */
export function avaliarPreenchimento(
  contexto: ContextoPreco,
  respondidos: ReadonlySet<CampoId>,
): Preenchimento {
  const essenciais = essenciaisDe(contexto.cenario);
  const faltam = essenciais.filter((c) => !respondidos.has(c));
  const feitos = essenciais.length - faltam.length;

  const estado: EstadoPreenchimento =
    respondidos.size === 0 ? "exemplo" : faltam.length === 0 ? "completo" : "estimado";

  return {
    estado,
    faltam,
    pressupostos: faltam.map((campo) => pressupostoDe(campo, contexto)).filter((p): p is Pressuposto => p !== null),
    respondidos: feitos,
    total: essenciais.length,
  };
}

// ─── Os pressupostos, um por campo ─────────────────────────────────────

const euros = (n: number): string => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",")} €`;
const pcto = (n: number): string => `${((Number.isFinite(n) ? n : 0) * 100).toFixed(1).replace(".", ",")}%`;

/**
 * O que estamos a assumir num campo por responder.
 *
 * Devolver `null` é uma resposta válida: há campos cujo valor de partida
 * não vale uma linha no ecrã. Um pressuposto que não muda o preço só
 * ocupa espaço na lista dos que mudam.
 */
function pressupostoDe(campo: CampoId, c: ContextoPreco): Pressuposto | null {
  const monta = (rotulo: string, valor: string, porque: string): Pressuposto => ({
    campo,
    rotulo,
    valor,
    porque,
  });

  switch (campo) {
    case "custo-direto":
      return monta(
        "Quanto te custa uma unidade",
        euros(c.custos.direto.valor),
        "É a base de tudo. Sem ela, a margem é uma percentagem de um número que não é teu.",
      );
    case "custo-inclui-iva":
      return monta(
        "Esse valor inclui IVA",
        c.custos.direto.incluiIVA ? "sim, com IVA" : "não, sem IVA",
        "Se estás isento não deduzes o IVA das compras, e o custo real muda até 23%.",
      );
    case "custo-producao":
      return monta(
        "Custo por unidade",
        euros(c.custos.direto.valor),
        "Num produto digital costuma ser quase zero — mas «quase» não é «zero».",
      );
    case "materia-lote":
      return monta(
        "Custo do material que compras",
        euros(c.producao?.materias[0]?.custoLote.valor ?? 0),
        "É o custo do lote, não o de uma unidade. A divisão é a conta seguinte.",
      );
    case "materia-unidades":
      return monta(
        "Unidades que saem desse material",
        `${c.producao?.materias[0]?.unidadesPorLote ?? 1}`,
        "Divide o custo do lote. Um erro aqui multiplica-se em cada unidade.",
      );
    case "horas-unidade":
      return monta(
        "Horas de trabalho por unidade",
        `${c.tempo?.horasPorUnidade ?? 0} h`,
        "Num serviço, o teu tempo É o custo direto. Subestimá-lo desce o preço todo.",
      );
    case "rendimento-ano":
      return monta(
        "Quanto queres ganhar por ano",
        euros(c.tempo?.rendimentoAnualPretendido ?? 0),
        "É daqui que sai o valor da tua hora, depois de tirar férias e horas não faturáveis.",
      );
    case "ganho-mensal":
      return monta(
        "Quanto queres ganhar por mês",
        euros(c.objetivo.valor ?? 0),
        "É o alvo que o preço tem de atingir ao volume que esperas.",
      );
    case "canal-venda":
      return monta(
        "Onde vais vender",
        c.canal.marketplaceId ?? "nenhum canal com comissão",
        "A comissão do canal incide sobre o total com IVA — pesa mais do que parece.",
      );
    case "objetivo-pct":
      return monta(
        c.objetivo.modo === "markup" ? "Markup pretendido" : "Margem pretendida",
        pcto(c.objetivo.percentagem ?? 0.35),
        "É o que decide o preço recomendado. Tudo o resto é o custo de lá chegar.",
      );
    case "volume":
      return monta(
        "Quantas vender por mês",
        `${c.volume.unidadesMes}`,
        "Reparte as contas fixas e dá o ponto de equilíbrio. Muda o preço mínimo.",
      );
    case "regime-iva":
      return monta(
        "O teu regime de IVA",
        ROTULO_IVA[c.vendedor.regimeIVA] ?? c.vendedor.regimeIVA,
        "Decide se acrescentas IVA ao preço e se o deduzes nas compras.",
      );
    default:
      return null;
  }
}

const ROTULO_IVA: Record<string, string> = {
  nao_sei: "não indicado",
  normal: "regime normal",
  isento_art53: "isento (Art. 53.º)",
  isento_art9: "isento (Art. 9.º)",
  margem: "regime da margem",
};
