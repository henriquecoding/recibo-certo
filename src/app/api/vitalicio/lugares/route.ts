import { NextResponse } from "next/server";
import { lugaresVitalicios } from "@/lib/plus/vitalicio-server";

export const revalidate = 30;

export async function GET() {
  const lugares = await lugaresVitalicios();
  return NextResponse.json(lugares, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
