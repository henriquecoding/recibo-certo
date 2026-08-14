"use client";

// Perfil público — o que aparece no diretório e na página que os clientes
// veem. O endereço (`slug`) não se edita aqui: está trancado por gatilho na
// migração 042, para ninguém ocupar o endereço de outra pessoa.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { atualizarFicha } from "@/lib/contabilistas/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import Button from "@/components/ui/Button";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import LinkedInConta from "@/components/contabilistas/LinkedInConta";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, ExternalLink, Warning } from "@/components/ui/Icons";

interface Formulario {
  nome: string; occ: string; bio: string; distrito: string; concelho: string;
  email: string; telefone: string; website: string; aceita: boolean;
  especialidades: string[]; modalidades: string[];
}

const OPCOES_DISTRITO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Sem distrito" },
  ...DISTRITOS.map((d) => ({ value: d, label: d })),
];

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

  const sinaisDoPerfil = useMemo(() => {
    const sinais = [
      { rotulo: "Apresentação", completo: f.bio.trim().length >= 60 },
      { rotulo: "Áreas de trabalho", completo: f.especialidades.length > 0 },
      { rotulo: "Contacto", completo: Boolean(f.email.trim() || f.telefone.trim() || f.website.trim()) },
    ];
    if (f.modalidades.includes("presencial")) {
      sinais.push({ rotulo: "Localização", completo: Boolean(f.distrito || f.concelho.trim()) });
    }
    return sinais;
  }, [f.bio, f.especialidades, f.email, f.telefone, f.website, f.modalidades, f.distrito, f.concelho]);

  const sinaisCompletos = sinaisDoPerfil.filter((s) => s.completo).length;

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

  if (aCarregar) return <EsqueletoPainel forma="formulario" />;
  if (!ficha) return null;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Perfil público"
        descricao="É isto que aparece no diretório e na página onde os clientes te encontram."
        acao={
          <Link
            href={`/contabilistas/${ficha.slug}`}
            className="focus-marca inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-600"
          >
            Ver como os clientes veem <ExternalLink size={14} aria-hidden />
          </Link>
        }
      />

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text dark:bg-red-950/35 dark:text-red-200">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <div className="space-y-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800 dark:bg-stone-900">
        <section aria-labelledby="perfil-contexto" className="rounded-3xl border border-brand/15 bg-brand-light/40 p-4 dark:border-brand/25 dark:bg-brand/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="perfil-contexto" className="font-semibold text-brand-dark dark:text-brand-mint">Dá contexto antes do primeiro contacto</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                O diretório já mostra fotografia, atendimento e estado de disponibilidade. Uma apresentação, áreas e contacto completos ajudam a pessoa a perceber se faz sentido abrir o teu perfil.
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tabular-nums text-brand-dark shadow-sm dark:bg-stone-950/70 dark:text-brand-mint">
              {sinaisCompletos}/{sinaisDoPerfil.length} essenciais
            </span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sinaisDoPerfil.map((sinal) => (
              <li
                key={sinal.rotulo}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  sinal.completo
                    ? "bg-white text-brand-dark dark:bg-stone-950/70 dark:text-brand-mint"
                    : "bg-white/55 text-stone-500 dark:bg-stone-950/40 dark:text-stone-400"
                }`}
              >
                {sinal.completo ? <Check size={12} className="text-brand" aria-hidden /> : <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />}
                {sinal.rotulo}
              </li>
            ))}
          </ul>
        </section>

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
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Apresentação</span>
          <textarea
            value={f.bio}
            onChange={(e) => mudar({ bio: e.target.value.slice(0, 2000) })}
            rows={5}
            className="focus-marca mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
            placeholder="Com quem trabalhas, no que és mais forte, como costumas acompanhar."
          />
          <span className="mt-1 block text-xs tabular-nums text-stone-400 dark:text-stone-500">{f.bio.length} / 2000</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="distrito-perfil" className="block">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Distrito</span>
            <SelectMenu
              id="distrito-perfil"
              value={f.distrito}
              options={OPCOES_DISTRITO}
              onChange={(value) => mudar({ distrito: value })}
              ariaLabel="Distrito do perfil profissional"
              className="mt-2"
            />
          </label>
          <Texto rotulo="Concelho" id="concelho" valor={f.concelho} onChange={(v) => mudar({ concelho: v })} />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-700 dark:text-stone-200">Áreas</legend>
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
                    ativo
                      ? "bg-brand text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-700 dark:text-stone-200">Atendimento</legend>
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
                    ativo
                      ? "bg-brand text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
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

        <LinkedInConta contabilistaId={ficha.userId} />

        <label className="flex items-start gap-3 rounded-2xl bg-cream p-4 dark:bg-stone-950/70">
          <input
            type="checkbox"
            checked={f.aceita}
            onChange={(e) => mudar({ aceita: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
          />
          <span className="text-sm text-stone-600 dark:text-stone-300">
            <strong className="block font-semibold text-stone-800 dark:text-stone-100">Aceito novos clientes</strong>
            Desligado, continuas no diretório mas ninguém te pode pedir vínculo.
          </span>
        </label>

        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4 dark:border-stone-700 dark:bg-stone-900/95">
          <Button onClick={guardar} disabled={aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar perfil"}
          </Button>
          <span role="status" className="text-sm text-stone-500 dark:text-stone-400">
            {porGuardar ? "Tens alterações por guardar." : "Está tudo guardado."}
          </span>
        </div>

        <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400 dark:border-stone-800 dark:text-stone-500">
          O endereço público é <code className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800 dark:text-stone-300">/contabilistas/{ficha.slug}</code> e
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
      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{rotulo}</span>
      {ajuda && <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">{ajuda}</span>}
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="focus-marca mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
      />
    </label>
  );
}
