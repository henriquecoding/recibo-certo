"use client";

import ErroWorkspace from "@/components/dashboard/ErroWorkspace";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErroWorkspace etiqueta="o planeador de contratação" error={error} reset={reset} />;
}
