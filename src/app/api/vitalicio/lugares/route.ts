// Quantos lugares vitalícios ainda há. Só números — nenhuma identidade,
// nenhum montante — porque quem faz esta pergunta é precisamente quem ainda
// não tem conta e está a decidir se compra.

import { NextResponse } from "next/server";
import { lugaresVitalicios } from "@/lib/plus/vitalicio";

// O contador tem de ser fresco perto do fim: anunciar «faltam 3» quando já
// esgotou é pior do que não anunciar nada. Trinta segundos de cache chegam
// para aguentar tráfego sem mentir de forma relevante.
export const revalidate = 30;

export async function GET() {
  const lugares = await lugaresVitalicios();
  return NextResponse.json(lugares, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
