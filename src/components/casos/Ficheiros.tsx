"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FICHEIROS — anexar e descarregar, nos três sítios que os aceitam
//  ---------------------------------------------------------------------
//  O mesmo componente serve os documentos de um caso e os anexos de uma
//  proposta. Ter dois seria ter um deles a esquecer-se de alguma coisa —
//  o limite, o tipo, o estado de «por libertar».
//
//  Descarregar passa sempre pela rota que reconfirma a autorização no
//  instante do pedido: um URL assinado sobreviveria ao acesso que o
//  produziu (ver a migração 050).
// ═══════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { PaperClip, Spinner, Check, Clock, Warning } from "@/components/ui/Icons";
import { tamanhoLegivel } from "@/lib/contabilistas/fonte/conversa";
import { enviarFicheiro, urlDoFicheiro } from "@/lib/contabilistas/fonte/casos";

/** Os mesmos que o balde aceita. Aqui só para a caixa de escolha filtrar. */
const ACEITES = [
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic",
  "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export interface FicheiroListado {
  id: string;
  caminho: string;
  nome: string;
  bytes: number;
  /** Só para documentos de caso: `null` = ainda não segue para o contabilista. */
  libertadoEm?: string | null;
  eContrato?: boolean;
}

export default function Ficheiros({
  contexto,
  alvo,
  ficheiros,
  podeAnexar,
  comoContrato,
  explicaLibertacao,
  aoMudar,
}: {
  contexto: "caso" | "proposta";
  alvo: string;
  ficheiros: FicheiroListado[];
  podeAnexar: boolean;
  /** Na proposta, o primeiro ficheiro pode ser marcado como o contrato. */
  comoContrato?: boolean;
  /** No caso, explica-se porque é que um documento ainda não seguiu. */
  explicaLibertacao?: boolean;
  aoMudar: () => void;
}) {
  const avisos = useAvisos();
  const entrada = useRef<HTMLInputElement | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [contrato, setContrato] = useState(false);

  async function escolher(lista: FileList | null) {
    if (!lista?.length) return;
    setAEnviar(true);
    for (const f of Array.from(lista).slice(0, 5)) {
      const { erro } = await enviarFicheiro(contexto, alvo, f, { eContrato: contrato });
      if (erro) avisos.erro(`${f.name}: ${erro}`);
    }
    setAEnviar(false);
    if (entrada.current) entrada.current.value = "";
    setContrato(false);
    aoMudar();
  }

  async function abrir(caminho: string, nome: string) {
    const url = await urlDoFicheiro(caminho);
    if (!url) { avisos.erro(`Não foi possível abrir «${nome}».`); return; }
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <div>
      {ficheiros.length > 0 && (
        <ul className="space-y-1.5">
          {ficheiros.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => void abrir(f.caminho, f.nome)}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-stone-300"
              >
                <PaperClip size={14} className="shrink-0 text-stone-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-stone-700">{f.nome}</span>
                  <span className="text-[11px] tabular-nums text-stone-400">
                    {tamanhoLegivel(f.bytes)}
                  </span>
                </span>
                {f.eContrato && (
                  <span className="shrink-0 rounded-lg bg-alert-bg px-2 py-0.5 text-[10px] font-bold text-alert-text">
                    Contrato
                  </span>
                )}
                {explicaLibertacao && (
                  f.libertadoEm ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                      <Check size={10} aria-hidden /> Enviado
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                      <Clock size={10} aria-hidden /> Por rever
                    </span>
                  )
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {explicaLibertacao && ficheiros.some((f) => !f.libertadoEm) && (
        <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500">
          <Warning size={12} className="mt-0.5 shrink-0" aria-hidden />
          Os documentos por rever ainda não seguiram. Um ficheiro pode ter os teus contactos lá
          dentro, e por isso é lido antes de ser encaminhado.
        </p>
      )}

      {podeAnexar && (
        <div className="mt-3">
          {comoContrato && (
            <label className="mb-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={contrato}
                onChange={(e) => setContrato(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
              />
              <span className="text-xs text-stone-600">
                O que vou anexar é o contrato — a pessoa tem de o ler antes de decidir.
              </span>
            </label>
          )}

          <input
            ref={entrada}
            type="file"
            multiple
            accept={ACEITES}
            className="sr-only"
            id={`ficheiros-${contexto}-${alvo}`}
            onChange={(e) => void escolher(e.target.files)}
          />
          <Button
            variant="secondary"
            onClick={() => entrada.current?.click()}
            disabled={aEnviar}
            className="w-full sm:w-auto"
          >
            {aEnviar ? <><Spinner size={14} /> A enviar…</>
                     : <><PaperClip size={14} aria-hidden /> Anexar ficheiro</>}
          </Button>
          <p className="mt-1.5 text-[11px] text-stone-400">
            Até 5 ficheiros, 10 MB cada. PDF, imagens, texto ou Office.
          </p>
        </div>
      )}
    </div>
  );
}
