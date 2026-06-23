"use client";

// Carrega a secção da calculadora (que embute os simuladores pesados) apenas
// quando o utilizador se aproxima dela — tira esse JS do carregamento inicial
// da homepage e melhora o desempenho em telemóvel (TBT/LCP/bundle).

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

function CalcSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 h-12 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-[560px] animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
    </div>
  );
}

const Calculadora = dynamic(() => import("./CalculadoraSecao"), {
  ssr: false,
  loading: () => <CalcSkeleton />,
});

export default function CalculadoraSecaoLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setVisivel(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisivel(true);
          io.disconnect();
        }
      },
      // Começa a carregar um pouco antes de ficar visível, para entrar suave.
      { rootMargin: "500px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{visivel ? <Calculadora /> : <CalcSkeleton />}</div>;
}
