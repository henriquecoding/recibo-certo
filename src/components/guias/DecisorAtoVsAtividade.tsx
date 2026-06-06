"use client";

import { useState } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

type ResultadoId = "ATO_ISOLADO" | "ABRIR_ATIVIDADE" | "RECIBO_VERDE" | "CONSIDERAR_ATIVIDADE";

interface Opcao {
  id: string;
  texto: string;
  proximo: string | null;
  resultado?: ResultadoId;
}

interface Pergunta {
  id: string;
  texto: string;
  opcoes: Opcao[];
}

const PERGUNTAS: Pergunta[] = [
  {
    id: "q1",
    texto: "Quantas vezes vais faturar este ano?",
    opcoes: [
      { id: "uma", texto: "Apenas uma vez", proximo: "q2" },
      { id: "multiplas", texto: "Mais do que uma vez", proximo: null, resultado: "ABRIR_ATIVIDADE" },
    ],
  },
  {
    id: "q2",
    texto: "Esta situação vai repetir-se no futuro?",
    opcoes: [
      { id: "nao", texto: "Não, é mesmo pontual", proximo: "q3" },
      { id: "sim", texto: "Sim, vai repetir-se", proximo: null, resultado: "ABRIR_ATIVIDADE" },
    ],
  },
  {
    id: "q3",
    texto: "Já tens atividade aberta nas Finanças?",
    opcoes: [
      { id: "sim", texto: "Sim, já tenho atividade aberta", proximo: null, resultado: "RECIBO_VERDE" },
      { id: "nao", texto: "Não, não tenho", proximo: "q4" },
    ],
  },
  {
    id: "q4",
    texto: "É um serviço realmente único e inesperado?",
    opcoes: [
      { id: "sim", texto: "Sim, não prevejo repetir", proximo: null, resultado: "ATO_ISOLADO" },
      { id: "talvez", texto: "Talvez se repita", proximo: null, resultado: "CONSIDERAR_ATIVIDADE" },
    ],
  },
];

const RESULTADOS: Record<ResultadoId, { titulo: string; descricao: string; cta: { texto: string; href: string }; badge: string; tone: "brand" | "alert" }> = {
  ATO_ISOLADO: {
    titulo: "Ato isolado",
    descricao: "Podes faturar sem abrir atividade. Emites diretamente no Portal das Finanças. Atenção: pagas IVA (23% na maioria dos casos) e só podes usar uma vez por ano.",
    cta: { texto: "Saber mais sobre ato isolado", href: "/guias/ato-isolado" },
    badge: "Recomendado para ti",
    tone: "brand",
  },
  ABRIR_ATIVIDADE: {
    titulo: "Abre atividade nas Finanças",
    descricao: "Vai faturar regularmente. Abres atividade uma vez e podes emitir recibos ilimitados. Se faturares menos de 15 000 €/ano, ficas isento de IVA.",
    cta: { texto: "Como abrir atividade", href: "/guias/abrir-atividade" },
    badge: "Recomendado para ti",
    tone: "brand",
  },
  RECIBO_VERDE: {
    titulo: "Emite um recibo verde normal",
    descricao: "Já tens atividade aberta — podes faturar diretamente. Aplicas as regras normais de retenção na fonte e IVA.",
    cta: { texto: "Ver regras de retenção", href: "/guias/retencao-na-fonte" },
    badge: "Já estás preparado",
    tone: "brand",
  },
  CONSIDERAR_ATIVIDADE: {
    titulo: "Considera abrir atividade",
    descricao: "Se houver possibilidade de se repetir, é mais seguro abrir atividade já. A abertura é gratuita e imediata online. O 1.º ano tem isenção de Segurança Social.",
    cta: { texto: "Como abrir atividade", href: "/guias/abrir-atividade" },
    badge: "Pensa bem",
    tone: "alert",
  },
};

export function DecisorAtoVsAtividade() {
  const [perguntaAtual, setPerguntaAtual] = useState<string>("q1");
  const [resultado, setResultado] = useState<ResultadoId | null>(null);
  const [historico, setHistorico] = useState<string[]>([]);

  const pergunta = PERGUNTAS.find((p) => p.id === perguntaAtual);

  function escolher(opcao: Opcao) {
    if (opcao.resultado) {
      setResultado(opcao.resultado);
    } else if (opcao.proximo) {
      setHistorico((h) => [...h, perguntaAtual]);
      setPerguntaAtual(opcao.proximo);
    }
  }

  function reiniciar() {
    setPerguntaAtual("q1");
    setResultado(null);
    setHistorico([]);
  }

  function voltar() {
    if (historico.length === 0) return;
    const anterior = historico[historico.length - 1];
    setHistorico((h) => h.slice(0, -1));
    setPerguntaAtual(anterior);
    setResultado(null);
  }

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Decisor interativo
      </p>

      {resultado ? (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <div className="mb-3">
            <Badge tone={RESULTADOS[resultado].tone}>{RESULTADOS[resultado].badge}</Badge>
          </div>
          <h3 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
            {RESULTADOS[resultado].titulo}
          </h3>
          <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-5">
            {RESULTADOS[resultado].descricao}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={RESULTADOS[resultado].cta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:shadow-float transition-shadow"
            >
              {RESULTADOS[resultado].cta.texto}
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={reiniciar}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 hover:border-stone-300 transition-colors"
            >
              Recomeçar
            </button>
          </div>
        </m.div>
      ) : pergunta ? (
        <m.div
          key={pergunta.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <p className="text-sm text-stone-400 mb-1">
            Pergunta {historico.length + 1} de {PERGUNTAS.length}
          </p>
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-base mb-4">
            {pergunta.texto}
          </h3>
          <div className="flex flex-col gap-2">
            {pergunta.opcoes.map((opcao) => (
              <button
                key={opcao.id}
                onClick={() => escolher(opcao)}
                className="group flex items-center justify-between rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3.5 text-sm font-medium text-stone-700 dark:text-stone-300 text-left hover:border-brand hover:text-brand transition-all duration-200"
              >
                {opcao.texto}
                <ChevronRight size={16} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
          {historico.length > 0 && (
            <button
              onClick={voltar}
              className="mt-4 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </m.div>
      ) : null}
    </div>
  );
}
