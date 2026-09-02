import type { Metadata } from "next";
import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import SimuladorPrecoLazy from "@/app/ferramentas/calcular-preco/lazy";

/**
 * FORMAR PREÇO, DENTRO DO PAINEL.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UM MOTOR, DUAS PORTAS (ADR-05)                                       │
 * │                                                                     │
 * │ «Calcular», «retomar» e «comparar» pareciam três produtos: o cálculo │
 * │ vivia em `/ferramentas/calcular-preco`, a lista guardada vivia em    │
 * │ `/dashboard/precos`, e não havia caminho de uma para a outra.        │
 * │                                                                     │
 * │ Esta rota é a MESMA `SimuladorPreco`, no mesmo chunk dinâmico, dentro │
 * │ do shell do painel. Não há duas fórmulas nem duas árvores de         │
 * │ perguntas — havê-las seria a maneira mais rápida de as pôr a         │
 * │ discordar.                                                           │
 * │                                                                     │
 * │ A página pública continua a porta gratuita e indexável. Esta é a de  │
 * │ quem já entrou.                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * O rascunho é o MESMO cofre das duas portas: começar aqui e continuar lá
 * (ou o contrário) é continuar o mesmo trabalho, não recomeçá-lo.
 */
export const metadata: Metadata = {
  title: "Calcular um preço",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

  return (
    <PaginaFerramenta
      eyebrow="O teu negócio"
      titulo="Calcular um preço"
      descricao="Quanto cobrar para cobrir custos, comissões e impostos. O contexto e o rascunho ficam neste dispositivo."
    >
      <SimuladorPrecoLazy cenarioInicial={c ?? null} />
    </PaginaFerramenta>
  );
}
