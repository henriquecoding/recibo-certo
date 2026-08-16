"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O LEITOR DE CONTRATOS — o documento lê-se aqui, e não noutro separador
//  ---------------------------------------------------------------------
//  Enquanto o contrato era um link para descarregar, «li o documento» era
//  uma afirmação sobre um ficheiro que ninguém sabia se tinha sido aberto.
//  Aqui o documento abre-se dentro da página, página a página, e o fim é
//  um sítio a que é preciso CHEGAR.
//
//  O que isto prova, dito sem exagero: que a última página esteve no ecrã
//  — ou foi alcançada com o teclado. Não prova compreensão, e nenhuma
//  interface o pode fazer. O que deixa de ser possível é decidir sobre um
//  contrato que nunca foi aberto, que era o buraco real.
//
//  DESENHO
//  · As páginas são desenhadas à medida que se aproximam do ecrã. Um
//    contrato de quarenta páginas não desenha quarenta telas de uma vez,
//    mas as caixas têm desde o início a altura certa — senão a barra de
//    scroll saltava a cada página desenhada.
//  · O `pdfjs` entra por `import()` dentro do efeito: são centenas de
//    kilobytes que só quem abre um contrato precisa de descarregar.
//  · Documentos que não são PDF não se desenham aqui. Nesse caso o leitor
//    diz o que é verdade — que só consegue confirmar a abertura — e pede
//    uma confirmação explícita.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, Export, Spinner, Warning } from "@/components/ui/Icons";
import { urlDoFicheiro } from "@/lib/contabilistas/fonte/casos";

interface Pagina {
  numero: number;
  largura: number;
  altura: number;
  desenhada: boolean;
}

export default function LeitorDeDocumento({
  caminho,
  nome,
  tipoMime,
  jaLido,
  aoChegarAoFim,
}: {
  caminho: string;
  nome: string;
  tipoMime: string;
  jaLido: boolean;
  /** Chamado uma vez, quando a última página é alcançada. */
  aoChegarAoFim: () => void;
}) {
  const avisos = useAvisos();
  const scroller = useRef<HTMLDivElement | null>(null);
  const caixas = useRef<Map<number, HTMLDivElement>>(new Map());
  const documento = useRef<{ getPage: (n: number) => Promise<unknown> } | null>(null);
  const url = useRef<string | null>(null);

  const [estado, setEstado] = useState<"a-abrir" | "pronto" | "erro" | "sem-visualizador">("a-abrir");
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [atual, setAtual] = useState(1);
  const [fim, setFim] = useState(jaLido);
  const [confirmouAbertura, setConfirmouAbertura] = useState(false);

  const ePdf = tipoMime === "application/pdf";

  const marcarFim = useCallback(() => {
    setFim((antes) => {
      if (!antes) aoChegarAoFim();
      return true;
    });
  }, [aoChegarAoFim]);

  // ── Abrir o documento ────────────────────────────────────────────────
  useEffect(() => {
    if (!ePdf) { setEstado("sem-visualizador"); return; }

    let vivo = true;
    (async () => {
      try {
        const endereco = await urlDoFicheiro(caminho);
        if (!endereco) throw new Error("sem-acesso");
        if (!vivo) { URL.revokeObjectURL(endereco); return; }
        url.current = endereco;

        const pdfjs = await import("pdfjs-dist");
        // Worker na mesma origem — copiado para /public no postinstall.
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ url: endereco }).promise;
        if (!vivo) return;

        documento.current = doc as unknown as { getPage: (n: number) => Promise<unknown> };

        // As dimensões de todas as páginas, ANTES de desenhar qualquer
        // uma: é o que permite reservar a altura certa e ter uma barra de
        // scroll que não mente.
        const medidas: Pagina[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const pagina = await doc.getPage(n);
          const vista = pagina.getViewport({ scale: 1 });
          medidas.push({ numero: n, largura: vista.width, altura: vista.height, desenhada: false });
        }
        if (!vivo) return;
        setPaginas(medidas);
        setEstado("pronto");

        // Um contrato de uma página só está inteiro no ecrã desde o
        // primeiro instante: exigir «chegar ao fim» seria exigir um gesto
        // sem destino.
        if (medidas.length === 1) marcarFim();
      } catch {
        if (vivo) setEstado("erro");
      }
    })();

    return () => {
      vivo = false;
      if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    };
  }, [caminho, ePdf, marcarFim]);

  // ── Desenhar as páginas que se aproximam ─────────────────────────────
  const desenhar = useCallback(async (numero: number) => {
    const doc = documento.current;
    const caixa = caixas.current.get(numero);
    if (!doc || !caixa || caixa.dataset.desenhada === "sim") return;
    caixa.dataset.desenhada = "sim";

    try {
      const pagina = (await doc.getPage(numero)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: Record<string, unknown>) => { promise: Promise<void> };
      };
      const largura = caixa.clientWidth || 600;
      const base = pagina.getViewport({ scale: 1 });
      const escala = largura / base.width;
      const vista = pagina.getViewport({ scale: escala });
      // Retina sem exageros: acima de 2 o ganho é invisível e a memória não.
      const densidade = Math.min(2, window.devicePixelRatio || 1);

      const tela = document.createElement("canvas");
      tela.width = Math.floor(vista.width * densidade);
      tela.height = Math.floor(vista.height * densidade);
      tela.style.width = "100%";
      tela.style.height = "auto";
      tela.style.display = "block";
      const ctx = tela.getContext("2d");
      if (!ctx) return;

      await pagina.render({
        canvasContext: ctx,
        viewport: vista,
        transform: densidade !== 1 ? [densidade, 0, 0, densidade, 0, 0] : undefined,
      }).promise;

      caixa.replaceChildren(tela);
    } catch {
      caixa.dataset.desenhada = "";
    }
  }, []);

  useEffect(() => {
    if (estado !== "pronto" || paginas.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const numero = Number((e.target as HTMLElement).dataset.pagina);
          if (!numero) continue;
          if (e.isIntersecting) {
            void desenhar(numero);
            setAtual((a) => Math.max(a, numero));
            if (numero === paginas.length) marcarFim();
          }
        }
      },
      // A margem faz a página seguinte começar a desenhar antes de entrar
      // no ecrã; o limiar baixo evita que uma página alta nunca conte.
      { root: scroller.current, rootMargin: "400px 0px", threshold: 0.01 },
    );

    for (const caixa of caixas.current.values()) observador.observe(caixa);
    return () => observador.disconnect();
  }, [estado, paginas.length, desenhar, marcarFim]);

  async function descarregar() {
    const endereco = await urlDoFicheiro(caminho);
    if (!endereco) { avisos.erro(`Não foi possível abrir «${nome}».`); return; }
    const a = document.createElement("a");
    a.href = endereco; a.download = nome; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(endereco), 30_000);
  }

  const progresso = paginas.length ? Math.round((atual / paginas.length) * 100) : 0;

  return (
    <section
      aria-label={`Contrato: ${nome}`}
      className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-950"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{nome}</p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            {estado === "pronto" && paginas.length > 0
              ? `Página ${atual} de ${paginas.length}`
              : estado === "a-abrir" ? "A abrir o documento…"
              : estado === "sem-visualizador" ? "Documento para abrir fora da página"
              : "Documento"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fim && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-light px-2 py-1 text-[11px] font-semibold text-brand-dark dark:bg-brand/20 dark:text-brand-mint">
              <Check size={12} aria-hidden /> Lido até ao fim
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => void descarregar()}>
            <Export size={14} aria-hidden /> Descarregar
          </Button>
        </div>
      </header>

      {estado === "pronto" && paginas.length > 0 && (
        <div
          className="h-1 bg-stone-200 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quanto do contrato já leste"
        >
          <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${progresso}%` }} />
        </div>
      )}

      {estado === "a-abrir" && (
        <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-stone-500 dark:text-stone-400">
          <Spinner size={15} aria-hidden /> A abrir o contrato…
        </p>
      )}

      {estado === "erro" && (
        <div className="px-4 py-8 text-center">
          <Warning size={22} className="mx-auto text-alert-text" aria-hidden />
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Não foi possível mostrar o contrato aqui.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Descarrega-o para o leres. Enquanto não confirmares que o leste, a decisão
            continua fechada.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={() => void descarregar()}>
              <Export size={14} aria-hidden /> Descarregar contrato
            </Button>
          </div>
        </div>
      )}

      {estado === "pronto" && (
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label="Páginas do contrato"
          className="max-h-[60vh] min-h-0 space-y-3 overflow-y-auto overscroll-contain bg-stone-100 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-950"
        >
          {paginas.map((p) => (
            <div
              key={p.numero}
              data-pagina={p.numero}
              ref={(el) => {
                if (el) caixas.current.set(p.numero, el);
                else caixas.current.delete(p.numero);
              }}
              // A altura sai da proporção real da página: reservar o
              // espaço certo antes de desenhar é o que impede o salto.
              style={{ aspectRatio: `${p.largura} / ${p.altura}` }}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700"
              aria-label={`Página ${p.numero} de ${paginas.length}`}
            />
          ))}

          {/* O fim, alcançável com Tab por quem não rola com o rato. */}
          <div
            tabIndex={0}
            onFocus={marcarFim}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-xs text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
          >
            {fim ? <Check size={13} className="text-brand" aria-hidden /> : <Warning size={13} aria-hidden />}
            Fim do contrato.
          </div>
        </div>
      )}

      {estado === "sem-visualizador" && (
        <div className="px-4 py-5">
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Este documento não é um PDF, por isso não o conseguimos mostrar aqui dentro.
            Descarrega-o, lê-o, e confirma em baixo — só tu sabes que o leste, e é isso
            que estás a declarar.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void descarregar()}>
              <Export size={14} aria-hidden /> Descarregar
            </Button>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={confirmouAbertura || fim}
                disabled={fim}
                onChange={(e) => {
                  setConfirmouAbertura(e.target.checked);
                  if (e.target.checked) marcarFim();
                }}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-stone-700 dark:text-stone-200">
                Descarreguei e li o documento até ao fim.
              </span>
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
