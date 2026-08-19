"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O ANÚNCIO DO RESULTADO — para quem não vê o número mudar
//  ---------------------------------------------------------------------
//  A ferramenta não tem botão «calcular»: o número reage a cada tecla. É a
//  decisão de UX que a torna uma conversa em vez de um formulário — e era,
//  ao mesmo tempo, a razão pela qual ela não dizia nada a quem usa leitor
//  de ecrã. Sem região viva, escrever «12» no custo mudava o preço em
//  silêncio absoluto: a pessoa preenchia o formulário inteiro sem nunca
//  saber que já havia resposta.
//
//  Três decisões, todas obrigatórias para isto funcionar e não incomodar:
//
//  ① `role="status"` (equivalente a `aria-live="polite"`): espera que a
//    pessoa acabe de escrever. `assertive` interromperia a cada dígito.
//
//  ② Debounce de 700 ms. Sem ele, escrever «1250» produz quatro anúncios,
//    três dos quais sobre preços que nunca existiram.
//
//  ③ Uma frase curta. O leitor de ecrã lê o conteúdo TODO da região a cada
//    mudança; pôr aqui o cartão inteiro seria ler o resultado completo de
//    dez em dez segundos.
//
//  A região está visualmente escondida porque quem vê já tem o número em
//  corpo 48 — a informação é a mesma, o canal é que é outro.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { fmt, pct } from "@/lib/format";
import type { ResultadoPreco } from "@/lib/pricing";

const ESPERA_MS = 700;

export default function AnuncioResultado({
  resultado,
  exemplo,
}: {
  resultado: ResultadoPreco;
  /** Enquanto for exemplo não se anuncia nada: não há nada de novo a dizer. */
  exemplo: boolean;
}) {
  const [frase, setFrase] = useState("");
  const anterior = useRef<string>("");

  const alvo = exemplo ? "" : frasear(resultado);

  useEffect(() => {
    if (alvo === anterior.current) return;
    const t = setTimeout(() => {
      anterior.current = alvo;
      setFrase(alvo);
    }, ESPERA_MS);
    return () => clearTimeout(t);
  }, [alvo]);

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {frase}
    </p>
  );
}

function frasear(r: ResultadoPreco): string {
  if (!r.ok) {
    return "Não há preço possível com estes números. Vê a explicação no resultado.";
  }
  const partes = [
    `Preço ${fmt(r.pvp)}${r.taxaIVA > 0 ? " com IVA" : ", isento de IVA"}`,
    `margem ${pct(r.margem.margem)}`,
    `ficam-te ${fmt(r.margem.lucroUnidade)} por venda`,
  ];
  if (r.margem.lucroUnidade < 0) {
    partes.push("atenção: a este preço cada venda dá prejuízo");
  }
  return `${partes.join(", ")}.`;
}
