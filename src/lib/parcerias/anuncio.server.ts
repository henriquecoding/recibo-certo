// ═══════════════════════════════════════════════════════════════════════
//  RESOLVER UM ANÚNCIO DE PARCEIRO — as cinco guardas, num sítio só
//  ---------------------------------------------------------------------
//  Estas guardas viviam dentro de `FizFaixaDemo`. Enquanto houve uma
//  superfície na homepage, ter lá o código era indistinguível de ter aqui.
//  Com duas superfícies a mostrarem o mesmo cartaz — a faixa do simulador de
//  IRS e o bloco «O passo seguinte» da homepage — a duplicação passa a ter um
//  modo de falha próprio: alguém aperta a guarda num sítio, esquece o outro, e
//  o segundo continua a mostrar publicidade de uma parceria que já foi
//  desligada. É o erro exatamente ao contrário do que interessa (mostrar de
//  mais, não de menos), e é silencioso.
//
//  Por isso a decisão «este cartaz pode aparecer?» é UMA função, e as
//  superfícies só decidem como o desenham.
//
//  ⚠️ Isto é a decisão de MOSTRAR, não a de RECOMENDAR. Uma recomendação
//  depois de um resultado passa por `escolherRota()` (`src/lib/routing.ts`),
//  que põe o contabilista à frente da FIZ e fecha a rota comercial quando a
//  confiança não chega. Um cartaz rotulado como publicidade não é isso, e não
//  pode ganhar o vocabulário disso.
// ═══════════════════════════════════════════════════════════════════════

import "server-only";
import { copyDaSuperficie, DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import type { Superficie } from "@/content/parcerias-destinos";
import {
  parceriaAtiva,
  parceriaUtilizavel,
  parceriasAtivas,
  placementDaSuperficie,
} from "./catalogo.server";

/** O que uma superfície precisa de saber para desenhar o cartaz — e nada mais. */
export interface AnuncioParceiro {
  /** A NOSSA linha, não a do parceiro: nomeia a fronteira antes do cartaz. */
  titulo: string;
  sub: string;
  /** A divulgação da cl. 11.2, já resolvida (placement › parceria › piso). */
  divulgacao: string;
  /** Sempre uma rota nossa (`/ir/fiz?…`), nunca o link do parceiro. */
  href: string;
}

/**
 * Devolve o cartaz desta superfície, ou `null` — e diz sempre porquê.
 *
 * ── Porque é que isto avisa ─────────────────────────────────────────────
 *  As cinco condições abaixo devolvem todas `null`, e `null` desenha
 *  exatamente o mesmo que uma parceria que nunca existiu: nada. Quando o
 *  cartaz desaparece de produção, o HTML não distingue «interruptor de
 *  emergência ligado» de «link em falta na base de dados» — e sem essa
 *  distinção o diagnóstico é adivinhação.
 *
 *  O aviso só sai quando o cartaz NÃO aparece, o que em operação normal é
 *  nunca. Fica no log do build (as páginas são estáticas) e nomeia a condição.
 */
export async function anuncioDaSuperficie(
  superficie: Superficie,
  { destino = "registo" }: { destino?: "registo" | "site" } = {},
): Promise<AnuncioParceiro | null> {
  const semCartaz = (motivo: string) => {
    console.warn(`[parcerias] ${superficie}: cartaz não renderizado — ${motivo}.`);
    return null;
  };

  // Sem parceria ativa não há cartaz — e a página continua exatamente igual.
  if (!parceriasAtivas()) return semCartaz("PARCERIAS_DESLIGADAS=true no ambiente");

  const parceria = await parceriaAtiva("fiz");
  // `parceriaUtilizavel` é um type guard: no ramo negativo o TypeScript
  // estreita `parceria` para `null`, mas em runtime ela pode muito bem ser um
  // objeto — só que inativo, sem link ou fora da janela. É precisamente esse
  // objeto que interessa ao diagnóstico, daí a referência guardada antes.
  const bruta = parceria;
  if (!parceriaUtilizavel(parceria)) {
    return semCartaz(
      bruta
        ? `parceria "fiz" inutilizável (ativo=${bruta.ativo}, link=${!!bruta.linkAfiliado}, janela=${bruta.inicioEm ?? "—"}..${bruta.fimEm ?? "—"})`
        : 'parceria "fiz" não encontrada em admin_partners nem em código',
    );
  }
  if (parceria.modo !== "LIGACAO") {
    return semCartaz(`modo da parceria é "${parceria.modo}", não "LIGACAO"`);
  }

  const placement = await placementDaSuperficie(parceria.id, superficie);
  if (!placement) {
    return semCartaz(
      `sem placement para "${superficie}" — ou existe linha em partner_placements com ativo=false ` +
        `(desligada no painel: desde a #85 isso manda e o piso em código já não a repõe), ` +
        `ou não existe linha e a superfície não consta de superficiesAtivas do parceiro "${parceria.id}"`,
    );
  }

  const recurso = copyDaSuperficie(superficie);

  return {
    titulo: placement.copyTitulo?.trim() || recurso.titulo,
    sub: placement.copySub?.trim() || recurso.sub,
    divulgacao: placement.divulgacao?.trim() || parceria.divulgacao.trim() || DIVULGACAO_LIGACAO,
    href: `/ir/fiz?s=${encodeURIComponent(superficie)}&v=banner&d=${destino}`,
  };
}
