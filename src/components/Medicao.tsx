"use client";

// ─────────────────────────────────────────────────────────────────────
//  Liga a camada de medição ao ciclo de vida da aplicação.
//
//  Não renderiza nada e não carrega nada de terceiros: monta os ouvintes
//  que descarregam a fila quando a página é escondida ou fechada, e regista
//  a origem da visita para que o primeiro evento já vá atribuído.
//
//  Se o consentimento de estatística não existir, tudo isto é inerte —
//  `registar()` sai à primeira linha e nenhum identificador é criado.
// ─────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useEffect, useState } from "react";
import { iniciarMedicao } from "@/lib/analytics/cliente";
import { CONSENT_CHANGED_EVENT, lerConsentimento } from "@/lib/cookie-consent";

const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/next").then(({ SpeedInsights: Componente }) => ({
    default: Componente,
  })),
);

const ROTAS_DE_CAMPO = new Set([
  "/",
  "/inicio/preco",
  "/inicio/recibos",
  "/inicio/empresa",
  "/inicio/salario",
]);

export default function Medicao() {
  const [estatisticaPermitida, setEstatisticaPermitida] = useState(false);

  useEffect(() => {
    const atualizar = () => setEstatisticaPermitida(lerConsentimento()?.estatistica === true);
    const desligar = iniciarMedicao();
    atualizar();
    window.addEventListener(CONSENT_CHANGED_EVENT, atualizar);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, atualizar);
      desligar();
    };
  }, []);

  if (!estatisticaPermitida) return null;
  return (
    <Suspense fallback={null}>
      <SpeedInsights
        beforeSend={(evento) => {
          if (lerConsentimento()?.estatistica !== true) return null;
          const url = new URL(evento.url);
          if (!ROTAS_DE_CAMPO.has(url.pathname)) return null;
          // O coletor recebe apenas origem + rota de foco: sem query, hash,
          // valores fiscais, referência privada ou outro identificador.
          url.search = "";
          url.hash = "";
          return { ...evento, url: url.toString(), route: url.pathname };
        }}
      />
    </Suspense>
  );
}
