"use client";

// Perfil público — o que aparece no diretório e na página que os clientes
// veem. O endereço (`slug`) não se edita aqui: está trancado por gatilho na
// migração 042, para ninguém ocupar o endereço de outra pessoa.

import Link from "next/link";
import { useEffect, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { atualizarFicha } from "@/lib/contabilistas/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import Button from "@/components/ui/Button";
import { Check, ExternalLink, Warning } from "@/components/ui/Icons";

export default function PerfilPage() {
  const { ficha, aCarregar, recarregar } = usarFicha();
  const [f, setF] = useState({
    nome: "", occ: "", bio: "", distrito: "", concelho: "",
    email: "", telefone: "", website: "", aceita: true,
    especialidades: [] as string[], modalidades: ["presencial", "online"] as string[],
  });
  const [erro, setErro] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (!ficha) return;
    setF({
      nome: ficha.nome, occ: ficha.occ ?? "", bio: ficha.bio,
      distrito: ficha.distrito ?? "", concelho: ficha.concelho ?? "",
      email: ficha.emailContacto ?? "", telefone: ficha.telefone ?? "",
      website: ficha.website ?? "", aceita: ficha.aceitaNovosClientes,
      especialidades: ficha.especialidades, modalidades: ficha.modalidades,
    });
  }, [ficha]);

  function alternar(lista: "especialidades" | "modalidades", valor: string) {
    setGuardado(false);
    setF((x) => ({
      ...x,
      [lista]: x[lista].includes(valor) ? x[lista].filter((v) => v !== valor) : [...x[lista], valor],
    }));
  }

  async function guardar() {
    if (!ficha) return;
    setErro(null); setGuardado(false);
    if (f.nome.trim().length < 2) { setErro("O nome não pode ficar vazio."); return; }
    if (f.modalidades.length === 0) { setErro("Escolhe pelo menos uma modalidade de atendimento."); return; }

    setAGuardar(true);
    const { erro: e } = await atualizarFicha(ficha.userId, {
      nome: f.nome.trim(),
      occ: f.occ.trim() || null,
      bio: f.bio.trim(),
      distrito: f.distrito || null,
      concelho: f.concelho.trim() || null,
      especialidades: f.especialidades,
      modalidades: f.modalidades,
      email_contacto: f.email.trim() || null,
      telefone: f.telefone.trim() || null,
      website: f.website.trim() || null,
      aceita_novos_clientes: f.aceita,
    });
    setAGuardar(false);
    if (e) setErro(e); else { setGuardado(true); recarregar(); }
  }

  if (aCarregar) return <div className="h-96 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Painel de gestão</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Perfil público</h1>
        <Link
          href={`/contabilistas/${ficha.slug}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark underline underline-offset-2"
        >
          Ver como os clientes veem <ExternalLink size={14} aria-hidden />
        </Link>
      </header>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <div className="space-y-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Texto rotulo="Nome" id="nome" valor={f.nome} onChange={(v) => { setF({ ...f, nome: v }); setGuardado(false); }} />
          <Texto
            rotulo="Nº de inscrição na OCC"
            id="occ"
            valor={f.occ}
            ajuda="Opcional. Fica visível no perfil público."
            onChange={(v) => { setF({ ...f, occ: v }); setGuardado(false); }}
          />
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Apresentação</span>
          <textarea
            value={f.bio}
            onChange={(e) => { setF({ ...f, bio: e.target.value.slice(0, 2000) }); setGuardado(false); }}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Com quem trabalhas, em que és mais forte, como costumas acompanhar."
          />
          <span className="mt-1 block text-xs tabular-nums text-stone-400">{f.bio.length} / 2000</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Distrito</span>
            <select
              value={f.distrito}
              onChange={(e) => { setF({ ...f, distrito: e.target.value }); setGuardado(false); }}
              className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">Sem distrito</option>
              {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <Texto rotulo="Concelho" id="concelho" valor={f.concelho} onChange={(v) => { setF({ ...f, concelho: v }); setGuardado(false); }} />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-700">Áreas</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ESPECIALIDADES.map((e) => {
              const ativo = f.especialidades.includes(e);
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => alternar("especialidades", e)}
                  className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-700">Atendimento</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(["presencial", "online"] as const).map((m) => {
              const ativo = f.modalidades.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => alternar("modalidades", m)}
                  className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium capitalize transition-colors ${
                    ativo ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Texto rotulo="Email de contacto" id="email" tipo="email" valor={f.email} onChange={(v) => { setF({ ...f, email: v }); setGuardado(false); }} />
          <Texto rotulo="Telefone" id="tel" tipo="tel" valor={f.telefone} onChange={(v) => { setF({ ...f, telefone: v }); setGuardado(false); }} />
        </div>
        <Texto rotulo="Site" id="site" tipo="url" valor={f.website} onChange={(v) => { setF({ ...f, website: v }); setGuardado(false); }} />

        <label className="flex items-start gap-3 rounded-2xl bg-cream p-4">
          <input
            type="checkbox"
            checked={f.aceita}
            onChange={(e) => { setF({ ...f, aceita: e.target.checked }); setGuardado(false); }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
          />
          <span className="text-sm text-stone-600">
            <strong className="block font-semibold text-stone-800">Aceito novos clientes</strong>
            Desligado, continuas no diretório mas ninguém te pode pedir vínculo.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={guardar} disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar perfil"}
          </Button>
          {guardado && (
            <span role="status" className="flex items-center gap-1.5 text-sm font-medium text-brand-dark">
              <Check size={15} aria-hidden /> Guardado.
            </span>
          )}
        </div>

        <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400">
          O endereço público é <code className="rounded bg-stone-100 px-1.5 py-0.5">/contabilistas/{ficha.slug}</code> e
          só a administração o altera — para ninguém poder ocupar o endereço de outra pessoa.
        </p>
      </div>
    </div>
  );
}

function Texto({
  rotulo, id, valor, onChange, tipo = "text", ajuda,
}: {
  rotulo: string; id: string; valor: string;
  onChange: (v: string) => void; tipo?: string; ajuda?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-stone-700">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400">{ajuda}</span>}
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
