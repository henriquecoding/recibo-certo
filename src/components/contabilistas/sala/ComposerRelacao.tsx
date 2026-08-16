"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O COMPOSITOR DA SALA
//  ---------------------------------------------------------------------
//  Uma linha: mais, campo, enviar. É o que fecha a sala em baixo, porque
//  depois de ler o que aconteceu a única coisa que falta é responder.
//
//  Não reescreve o envio: chama `enviarMensagem`, a mesma função que a
//  conversa usa desde a migração 044, com a mesma cadeia de anexos
//  endurecida (vaga pedida ao servidor, escrita no balde, fecho validado —
//  048 e 050). Reimplementar isto aqui era duplicar a parte mais delicada
//  do produto para ganhar um cabeçalho diferente.
//
//  O aviso de contacto aparece enquanto se escreve. É a diferença entre
//  uma explicação e uma parede: a fronteira a sério está no gatilho da
//  migração da fronteira de contacto e não vai a lado nenhum, mas ser recusado depois de
//  carregar em enviar não ensina nada a quem só estava a fazer o que se
//  faz em todo o lado.
// ═══════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react";
import {
  ANEXO_MAX_BYTES, ANEXOS_MAX, enviarMensagem, MENSAGEM_MAX,
  tamanhoLegivel, TIPOS_ANEXO_ACEITES,
} from "@/lib/contabilistas/fonte/conversa";
import {
  detetarContactoExterno, eRecusaDeContacto, explicarContactoExterno,
} from "@/lib/contabilistas/contacto-externo";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import { PaperClip, Plus, Trash, Warning } from "@/components/ui/Icons";

export default function ComposerRelacao({
  vinculoId,
  meuId,
  nomeDoOutro,
  aoEnviar,
}: {
  vinculoId: string;
  meuId: string;
  nomeDoOutro: string;
  /** Chamado depois de a mensagem entrar, para a sala recarregar. */
  aoEnviar?: () => void;
}) {
  const avisos = useAvisos();
  const [texto, setTexto] = useState("");
  const [ficheiros, setFicheiros] = useState<File[]>([]);
  const [aEnviar, setAEnviar] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const fuga = detetarContactoExterno(texto);
  const podeEnviar = Boolean(texto.trim()) && !aEnviar && !fuga.encontrado;

  function escolher(lista: FileList | null) {
    if (!lista) return;
    const bons: File[] = [];
    const maus: string[] = [];
    for (const f of Array.from(lista)) {
      if (f.size > ANEXO_MAX_BYTES) { maus.push(`${f.name} (acima de 10 MB)`); continue; }
      if (!(TIPOS_ANEXO_ACEITES as readonly string[]).includes(f.type)) {
        maus.push(`${f.name} (formato não aceite)`); continue;
      }
      bons.push(f);
    }
    if (maus.length) avisos.erro(`${maus.length} ficheiro(s) ficaram de fora.`, { detalhe: maus.join(", ") });
    setFicheiros((a) => [...a, ...bons].slice(0, ANEXOS_MAX));
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!podeEnviar) return;

    setAEnviar(true);
    const r = await enviarMensagem({ vinculoId, autorId: meuId, corpo: texto, ficheiros });
    setAEnviar(false);

    if (r.erro) {
      avisos.erro(
        eRecusaDeContacto({ message: r.erro })
          ? "Os contactos pessoais não se partilham aqui."
          : r.erro,
      );
      return;
    }

    setTexto("");
    setFicheiros([]);
    if (r.recusados?.length) {
      avisos.erro(`Enviado, mas ${r.recusados.length} ficheiro(s) ficaram de fora.`);
    }
    aoEnviar?.();
  }

  return (
    <form onSubmit={enviar} className="rounded-3xl border border-stone-200 bg-white p-2.5 shadow-card">
      {ficheiros.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5 px-1">
          {ficheiros.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 rounded-lg bg-cream px-2.5 py-1 text-xs text-stone-600"
            >
              <span className="max-w-[10rem] truncate">{f.name}</span>
              <span className="tabular-nums text-stone-400">{tamanhoLegivel(f.size)}</span>
              <button
                type="button"
                onClick={() => setFicheiros((a) => a.filter((_, j) => j !== i))}
                aria-label={`Remover ${f.name}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 hover:text-clay-text"
              >
                <Trash size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {fuga.encontrado && (
        <p
          id="aviso-contacto-sala"
          role="status"
          className="mx-1 mb-2 flex items-start gap-2 rounded-xl bg-alert-bg px-3 py-2 text-sm leading-relaxed text-alert-text"
        >
          <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
          {explicarContactoExterno(fuga.motivos)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700">
          <Plus size={18} aria-hidden />
          <span className="sr-only">
            Juntar ficheiro (até {ANEXOS_MAX}, 10 MB cada)
          </span>
          <input
            ref={campo}
            type="file"
            multiple
            accept={TIPOS_ANEXO_ACEITES.join(",")}
            onChange={(e) => { escolher(e.target.files); e.target.value = ""; }}
            className="sr-only"
          />
        </label>

        <label className="sr-only" htmlFor="composer-sala">
          Escrever a {nomeDoOutro}
        </label>
        <input
          id="composer-sala"
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MENSAGEM_MAX))}
          placeholder={`Escreve a ${nomeDoOutro} ou junta um ficheiro…`}
          aria-invalid={fuga.encontrado}
          aria-describedby={fuga.encontrado ? "aviso-contacto-sala" : undefined}
          className={`min-h-[2.75rem] min-w-0 flex-1 rounded-xl border bg-white px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 ${
            fuga.encontrado
              ? "border-alert-border focus:border-alert-border focus:ring-alert-border/40"
              : "border-transparent focus:border-brand focus:ring-brand/30"
          }`}
        />

        <Button type="submit" disabled={!podeEnviar} className="shrink-0">
          {aEnviar ? "A enviar…" : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
