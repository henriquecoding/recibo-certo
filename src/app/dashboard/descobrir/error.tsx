"use client";

import ErroWorkspace from "@/components/dashboard/ErroWorkspace";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErroWorkspace etiqueta="Descobrir" error={error} reset={reset} />;
}
