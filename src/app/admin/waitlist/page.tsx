"use client";

import { useEffect, useState } from "react";
import { listarWaitlist, eliminarWaitlistEntry, type WaitlistRow } from "@/lib/supabase/admin";
import { Trash } from "@/components/ui/Icons";

const FONTE_LABEL: Record<string, string> = {
  landing: "Landing",
  precos: "Preços",
  dashboard: "Dashboard",
};

export default function AdminWaitlist() {
  const [lista, setLista] = useState<WaitlistRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregar = () =>
    listarWaitlist()
      .then(setLista)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true));

  useEffect(() => { carregar(); }, []);

  const apagar = async (id: string) => {
    const { erro: e } = await eliminarWaitlistEntry(id);
    if (e) { setErro(e); return; }
    setLista((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const copiarTodos = () => {
    const emails = lista.map((r) => r.email).join("\n");
    navigator.clipboard.writeText(emails);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1 text-brand">Administração</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800">Lista de espera</h1>
          <p className="mt-1 text-sm text-stone-500">
            {carregado ? `${lista.length} email${lista.length !== 1 ? "s" : ""} registado${lista.length !== 1 ? "s" : ""}` : "A carregar…"}
          </p>
        </div>
        {lista.length > 0 && (
          <button
            type="button"
            onClick={copiarTodos}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-card transition-all hover:border-stone-300 hover:shadow-lift"
          >
            Copiar todos os emails
          </button>
        )}
      </header>

      {erro && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {!carregado ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl border border-stone-100 bg-white" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-sm text-stone-400">Ainda não há nenhuma inscrição.</p>
        </div>
      ) : (
        <div className="rounded-4xl border border-stone-100 bg-white shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-400 hidden sm:table-cell">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-400 hidden md:table-cell">Data</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lista.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-stone-50/40">
                  <td className="px-5 py-3 font-medium text-stone-800">{r.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                      {FONTE_LABEL[r.fonte] ?? r.fonte}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400 hidden md:table-cell tabular-nums">
                    {new Date(r.criado_em).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => apagar(r.id)}
                          className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg px-2 py-1 text-xs text-stone-400 transition-colors hover:text-stone-600"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Remover ${r.email}`}
                        onClick={() => setConfirmDelete(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
