"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import {
  avatarLinkedInExpirou,
  desligarLinkedIn,
  guardarUrlLinkedIn,
  ligarLinkedIn,
  normalizarUrlLinkedIn,
  obterEstadoLinkedIn,
  obterLinkedInPublico,
  renovarLinkedIn,
  sincronizarLinkedIn,
} from "@/lib/contabilistas/linkedin";

export default function LinkedInConta({ contabilistaId }: { contabilistaId: string }) {
  const avisos = useAvisos();
  const [aLer, setALer] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [ligado, setLigado] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFalhou, setAvatarFalhou] = useState(false);
  const [url, setUrl] = useState("");
  const [urlGuardada, setUrlGuardada] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setALer(true);
    setErro(null);
    setAvatarFalhou(false);
    const [estado, publico] = await Promise.all([
      obterEstadoLinkedIn(),
      obterLinkedInPublico(contabilistaId),
    ]);

    if (estado.erro) setErro(estado.erro);
    setLigado(estado.ligado);
    setUrl(publico.url ?? "");
    setUrlGuardada(publico.url ?? "");
    setAvatar(publico.avatarUrl ?? estado.fotoDaIdentidade);

    // A foto verificada vive na ficha pública, não em metadata editável pelo
    // browser. Quando a identidade existe, a própria base de dados copia a
    // fotografia que veio do LinkedIn para a coluna protegida.
    if (estado.ligado) {
      const sync = await sincronizarLinkedIn();
      if (sync.erro) setErro(sync.erro);
      else setAvatar(sync.avatarUrl ?? estado.fotoDaIdentidade);
    }

    setALer(false);
  }, [contabilistaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function ligar() {
    setOcupado(true);
    setErro(null);
    const { erro: e } = await ligarLinkedIn();
    // Em sucesso o browser é redirecionado para o LinkedIn, por isso este
    // estado só é observado quando a chamada falha antes de sair da página.
    if (e) {
      setOcupado(false);
      const manual = /manual|linking|identity/i.test(e);
      setErro(manual
        ? "A ligação de identidades ainda não está ativa no Supabase Auth. Ativa «Enable Manual Linking» nas definições de autenticação."
        : e);
    }
  }

  async function desligar() {
    setOcupado(true);
    setErro(null);
    const { erro: e } = await desligarLinkedIn();
    setOcupado(false);
    if (e) { setErro(e); return; }
    setLigado(false);
    setAvatar(null);
    setAvatarFalhou(false);
    avisos.sucesso("LinkedIn desligado do perfil.");
  }

  async function renovarFoto() {
    setOcupado(true);
    setErro(null);
    const { erro: e } = await renovarLinkedIn();
    if (e) {
      setOcupado(false);
      setErro(e);
    }
    // Em sucesso há redirecionamento para o consentimento do LinkedIn.
  }

  async function guardarUrl() {
    setOcupado(true);
    setErro(null);
    const resultado = await guardarUrlLinkedIn(contabilistaId, url);
    setOcupado(false);
    if (resultado.erro) { setErro(resultado.erro); return; }

    const guardada = resultado.url ?? "";
    setUrl(guardada);
    setUrlGuardada(guardada);
    avisos.sucesso(guardada ? "Endereço do LinkedIn guardado." : "Endereço do LinkedIn removido.");
  }

  const urlNormalizada = normalizarUrlLinkedIn(url);
  const urlAlterada = (urlNormalizada ?? url.trim()) !== urlGuardada;
  const avatarExpirado = avatarLinkedInExpirou(avatar);
  const mostrarAvatar = Boolean(avatar) && !avatarExpirado && !avatarFalhou;

  return (
    <section aria-labelledby="linkedin-titulo" className="rounded-3xl border border-stone-200 bg-cream/55 p-4 sm:p-5 dark:border-stone-700 dark:bg-stone-950/55">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {mostrarAvatar ? (
            // Também na pré-visualização do dono passamos pelo proxy do
            // ReciboCerto. Evita hotlink direto, URLs externas expiradas a
            // aparecer como imagem quebrada e mantém a mesma política do
            // perfil público.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/contabilistas/linkedin-avatar/${encodeURIComponent(contabilistaId)}`}
              alt="Fotografia atual do LinkedIn"
              onError={() => setAvatarFalhou(true)}
              className="h-14 w-14 shrink-0 rounded-2xl border border-stone-200 object-cover shadow-card dark:border-stone-700"
            />
          ) : (
            <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-lg font-bold text-[#0A66C2] shadow-card dark:border-stone-700 dark:bg-stone-900">
              in
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="linkedin-titulo" className="font-semibold text-stone-800 dark:text-stone-100">LinkedIn</h2>
              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                ligado
                  ? "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                  : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
              }`}>
                {ligado ? "Conta ligada" : "Não ligado"}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              A foto é confirmada pela tua conta LinkedIn via OpenID Connect. O LinkedIn não envia o endereço público `/in/...` neste login, por isso esse link é confirmado por ti uma única vez.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {ligado ? (
            <Button type="button" size="sm" variant="secondary" onClick={desligar} disabled={ocupado || aLer}>
              Desligar
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={ligar} disabled={ocupado || aLer}>
              {ocupado ? "A abrir…" : "Ligar LinkedIn"}
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-clay-bg px-3 py-2 text-xs leading-relaxed text-clay-text dark:bg-red-950/35 dark:text-red-200">
          {erro}
        </p>
      )}

      {ligado && avatar && (avatarExpirado || avatarFalhou) && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-alert-border/70 bg-alert-bg/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-yellow-800/60 dark:bg-yellow-950/25">
          <p className="text-xs leading-relaxed text-alert-text dark:text-yellow-200">
            A fotografia que o LinkedIn forneceu é temporária e já não está disponível. Renova a autorização para receber a fotografia atual sem alterar o teu login principal.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={renovarFoto} disabled={ocupado || aLer}>
            {ocupado ? "A abrir…" : "Atualizar fotografia"}
          </Button>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="linkedin-url" className="text-sm font-semibold text-stone-700 dark:text-stone-200">Perfil público no LinkedIn</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="linkedin-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            disabled={!ligado || aLer}
            onChange={(e) => setUrl(e.target.value.slice(0, 300))}
            placeholder="https://www.linkedin.com/in/o-teu-perfil"
            className="focus-marca min-h-[2.75rem] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-55 focus:border-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-600"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={guardarUrl}
            disabled={!ligado || aLer || ocupado || !urlAlterada || (Boolean(url.trim()) && !urlNormalizada)}
          >
            Guardar link
          </Button>
        </div>
        {!ligado && (
          <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">Liga primeiro a conta para que o endereço e a fotografia possam aparecer no perfil público.</p>
        )}
      </div>
    </section>
  );
}
