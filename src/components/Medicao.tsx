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

import { useEffect } from "react";
import { iniciarMedicao } from "@/lib/analytics/cliente";

export default function Medicao() {
  useEffect(() => iniciarMedicao(), []);
  return null;
}
