import { NextResponse } from "next/server";
import { loadPilotMarketEvidence } from "@/lib/negocio/market/pilot-loader";

export const revalidate = 21_600;

export async function GET() {
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, next: { revalidate } })) as typeof fetch;
  const pilots = await loadPilotMarketEvidence({ fetchImpl });
  return NextResponse.json(
    { schemaVersion: 1, generatedAt: new Date().toISOString(), pilots },
    { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
