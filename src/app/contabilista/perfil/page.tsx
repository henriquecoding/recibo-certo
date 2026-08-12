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
import { useAvisos } from "@/components/ui/Avisos";
import { ExternalLink, Warning } from "@/components/ui/Icons";

interface Formulario {
  nome: string; occ: string; bio: string; distrito: string; concelho: string;
  email: string; telefone: string; website: string; aceita: boolean;
  especialidades: string[]; modalidades: string[];
}

export default function PerfilPage() {
  const { ficha, aCarregar, recarregar } = usarFicha();
  const avisos = useAvisos();
  const [f, setF] = useState<Formulario>({
    nome: "", occ: "", bio: "", distrito: "", concelho: "",
    email: "", telefone: "", website: "", aceita: true,
    especialidades: [], modalidades: ["presencial", "online"],
  });
  const [erro, setErro] = useState<string | null>(null);
  const [porGuardar, setPorGuardar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  /** Uma só porta para mudar o formulário — e para saber que mudou. */
  function mudar(patch: Partial<Formulario>) {
    setPorGuardar(true);
    setF((x) => ({ ...x, ...patch }));
  }

  useEffect(() => {
    if (!ficha) return;
    setF({
      nome: ficha.nome, occ: ficha.occ ?? "", bio: ficha.bio,
      distrito: ficha.distrito ?? "", concelho: ficha.concelho ?? "",
      email: ficha.emailContacto ?? "", telefone: ficha.telefone ?? "",
      website: ficha.website ?? "", aceita: ficha.aceitaNovosClientes,
      especialidades: ficha.especialidades, modalidades: ficha.modalidades,
    });
    setPorGuardar(false);
  }, [ficha]);

  function alternar(lista: "especialidades" | "modalidades", valor: string) {
    setPorGuardar(true);
    setF((x) => ({
      ...x,
      [lista]: x[lista].includes(valor) ? x[lista].filter((v) => v !== valor) : [...x[lista], valor],
    }));
  }

  async function guardar() {
    if (!ficha) return;
    setErro(null);
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
    if (e) { setErro(e); return; }
    setPorGuardar(false);
    recarregar();
    avisos.sucesso("Perfil guardado.", {
      detalhe: f.aceita
        ? "É isto que os clientes veem no diretório."
        : "Continuas no diretório, mas sem aceitar novos clientes.",
    });
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
          <Texto rotulo="Nome" id="nome" valor={f.nome} onChange={(v) => mudar({ nome: v })} />
          <Texto
            rotulo="Nº de inscrição na OCC"
            id="occ"
            valor={f.occ}
            ajuda="Opcional. Fica visível no perfil público."
            onChange={(v) => mudar({ occ: v })}
          />
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Apresentação</span>
          <textarea
            value={f.bio}
            onChange={(e) => mudar({ bio: e.target.value.slice(0, 2000) })}
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
              onChange={(e) => mudar({ distrito: e.target.value })}
              className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">Sem distrito</option>
              {DISTRITOS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <Texto rotulo="Concelho" id="concelho" valor={f.concelho} onChange={(v) => mudar({ concelho: v })} />
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
          <Texto rotulo="Email de contacto" id="email" tipo="email" valor={f.email} onChange={(v) => mudar({ email: v })} />
          <Texto rotulo="Telefone" id="tel" tipo="tel" valor={f.telefone} onChange={(v) => mudar({ telefone: v })} />
        </div>
        <Texto rotulo="Site" id="site" tipo="url" valor={f.website} onChange={(v) => mudar({ website: v })} />

        <label className="flex items-start gap-3 rounded-2xl bg-cream p-4">
          <input
            type="checkbox"
            checked={f.aceita}
            onChange={(e) => mudar({ aceita: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
          />
          <span className="text-sm text-stone-600">
            <strong className="block font-semibold text-stone-800">Aceito novos clientes</strong>
            Desligado, continuas no diretório mas ninguém te pode pedir vínculo.
          </span>
        </label>

        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
          <Button onClick={guardar} disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar perfil"}
          </Button>
          <span role="status" className="text-sm text-stone-500">
            {porGuardar ? "Tens alterações por guardar." : "Está tudo guardado."}
          </span>
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
