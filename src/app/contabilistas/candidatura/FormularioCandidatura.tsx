"use client";

// Candidatura a conta de contabilista.
//
// Três formas de provar, e a pessoa escolhe: texto protegido (número de
// inscrição, códigos de validação), documentos anexados, ou simplesmente
// resolver por email. A última existe porque nem toda a gente quer carregar
// documentos para uma plataforma, e recusar por isso seria recusar por causa
// da forma e não da substância.
//
// As credenciais e os documentos são legíveis pelo próprio e pela
// administração, e por mais ninguém — nem por outros contabilistas.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { minhasCandidaturas, submeterCandidatura } from "@/lib/contabilistas/dados";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, Lock, PaperClip, Warning, Trash } from "@/components/ui/Icons";

const MAX_DOCS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface Pedido {
  id: string; estado: string; motivo_decisao: string | null;
  criado_em: string; decidido_em: string | null;
}

export default function FormularioCandidatura() {
  const { user, carregado, abrirModal, disponivel } = useAuth();
  const avisos = useAvisos();
  const [aSubir, setASubir] = useState<{ feitos: number; total: number } | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [credenciais, setCredenciais] = useState("");
  const [ficheiros, setFicheiros] = useState<File[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [anteriores, setAnteriores] = useState<Pedido[]>([]);

  useEffect(() => {
    if (!user) return;
    setEmail((e) => e || user.email || "");
    minhasCandidaturas(user.id)
      .then((l) => setAnteriores(l as unknown as Pedido[]))
      .catch(() => setAnteriores([]));
  }, [user]);

  function escolherFicheiros(lista: FileList | null) {
    if (!lista) return;
    setErro(null);
    const novos: File[] = [];
    // Um ficheiro recusado avisa-se um a um: escolher cinco e ver uma só
    // mensagem deixava a pessoa sem saber qual deles não entrou.
    for (const f of Array.from(lista)) {
      if (!TIPOS_ACEITES.includes(f.type)) { avisos.erro(`«${f.name}» não é PDF nem imagem.`); continue; }
      if (f.size > MAX_BYTES) { avisos.erro(`«${f.name}» passa dos 5 MB.`); continue; }
      novos.push(f);
    }
    setFicheiros((atual) => {
      const juntos = [...atual, ...novos];
      if (juntos.length > MAX_DOCS) {
        avisos.info(`São no máximo ${MAX_DOCS} documentos.`, {
          detalhe: `${juntos.length - MAX_DOCS} ficaram de fora.`,
        });
      }
      return juntos.slice(0, MAX_DOCS);
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { abrirModal("criar"); return; }
    setErro(null);

    if (nome.trim().length < 2) { setErro("Escreve o teu nome."); return; }
    if (!email.trim().includes("@")) { setErro("Escreve um email de contacto válido."); return; }
    if (mensagem.trim().length < 20) { setErro("A justificação precisa de pelo menos 20 caracteres."); return; }

    setAEnviar(true);
    const caminhos: string[] = [];

    try {
      if (ficheiros.length > 0) {
        const { getSupabase } = await import("@/lib/supabase/client");
        const sb = getSupabase();
        // Carregar cinco ficheiros pode demorar. Sem contagem, um botão
        // parado durante meio minuto parece um botão avariado.
        setASubir({ feitos: 0, total: ficheiros.length });
        for (const f of ficheiros) {
          // A pasta é o id da pessoa: a política de storage da migração 042
          // só deixa escrever dentro da própria pasta.
          const nomeSeguro = f.name.replace(/[^\w.\-]/g, "_").slice(-80);
          const caminho = `${user.id}/${Date.now()}-${nomeSeguro}`;
          const { error } = await sb.storage
            .from("contabilista-documentos")
            .upload(caminho, f, { upsert: false, contentType: f.type });
          if (error) throw new Error(`Não foi possível enviar «${f.name}»: ${error.message}`);
          caminhos.push(caminho);
          setASubir((a) => (a ? { ...a, feitos: a.feitos + 1 } : a));
        }
      }

      const { erro: e2 } = await submeterCandidatura(user.id, {
        nome, emailContacto: email, telefone, mensagem, credenciais, documentos: caminhos,
      });
      if (e2) { setErro(e2); return; }
      setEnviado(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setAEnviar(false);
      setASubir(null);
    }
  }

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A ORDEM DESTAS DUAS GUARDAS NÃO É INDIFERENTE                     │
  // │                                                                   │
  // │ Estava ao contrário, e dava um erro de hidratação real numa        │
  // │ instalação sem nuvem configurada: o servidor desenhava o esqueleto │
  // │ (`carregado` é falso durante o render do servidor) e o cliente     │
  // │ desenhava já a mensagem — porque o `AuthProvider` está acima desta │
  // │ fronteira de Suspense e o efeito dele corre ANTES de este pedaço   │
  // │ hidratar. React deitava a subárvore fora e voltava a desenhá-la.   │
  // │                                                                   │
  // │ `disponivel` não depende de sessão nenhuma: vem da configuração, e │
  // │ vale o mesmo no servidor e no cliente. Perguntá-lo primeiro é a    │
  // │ ordem certa por significado, e por acaso é também a que hidrata.   │
  // └───────────────────────────────────────────────────────────────────┘
  if (!disponivel) {
    return (
      <p className="mt-8 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
        As candidaturas ainda não estão abertas nesta instalação.
      </p>
    );
  }

  if (!carregado) return <div className="mt-8 h-64 animate-pulse rounded-4xl bg-stone-100" aria-busy="true" />;

  if (!user) {
    return (
      <div className="mt-8 rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card">
        <p className="text-sm leading-relaxed text-stone-600">
          Precisas de uma conta ReciboCerto para te candidatares. É a mesma conta que
          usarás depois para entrar no painel.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Button onClick={() => abrirModal("criar")}>Criar conta</Button>
          <Button variant="secondary" onClick={() => abrirModal("entrar")}>Já tenho conta</Button>
        </div>
      </div>
    );
  }

  const emAberto = anteriores.find((p) => p.estado === "pendente" || p.estado === "em_analise");
  const recusada = anteriores.find((p) => p.estado === "recusado");
  const aprovada = anteriores.find((p) => p.estado === "aprovado");

  if (aprovada) {
    return (
      <div className="mt-8 rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card">
        <Check size={26} className="mx-auto text-brand" aria-hidden />
        <p className="mt-3 font-display text-xl text-ink">A tua candidatura foi aprovada</p>
        <Link href="/contabilista" className="mt-5 inline-block">
          <Button>Ir para o painel</Button>
        </Link>
      </div>
    );
  }

  if (enviado || emAberto) {
    return (
      <div className="mt-8 rounded-4xl border border-stone-200 bg-white p-6 shadow-card">
        <Badge tone="alert">Em análise</Badge>
        <p className="mt-3 font-display text-xl text-ink">Candidatura recebida</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          A administração vai analisar o que enviaste e responder para{" "}
          <strong className="text-stone-800">{email || user.email}</strong>. Enquanto isso,
          podes continuar a usar a tua conta normalmente.
        </p>
        <Link href="/dashboard" className="mt-5 inline-block">
          <Button variant="secondary">Voltar ao painel</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 space-y-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      {recusada && (
        <div className="rounded-2xl bg-alert-bg px-4 py-3.5 text-sm text-alert-text">
          <p className="font-semibold">A candidatura anterior foi recusada.</p>
          {recusada.motivo_decisao && <p className="mt-1 leading-relaxed">{recusada.motivo_decisao}</p>}
          <p className="mt-1.5 leading-relaxed">Podes corrigir e voltar a candidatar-te.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" id="nome" valor={nome} onChange={setNome} obrigatorio />
        <Campo rotulo="Email de contacto" id="email" tipo="email" valor={email} onChange={setEmail} obrigatorio />
      </div>
      <Campo rotulo="Telefone (opcional)" id="tel" tipo="tel" valor={telefone} onChange={setTelefone} />

      <label className="block">
        <span className="text-sm font-semibold text-stone-700">
          Quem és e com quem trabalhas <span className="text-clay-text">*</span>
        </span>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value.slice(0, 4000))}
          rows={5}
          required
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="Há quanto tempo exerces, que tipo de clientes acompanhas, e porque queres usar a plataforma."
        />
        <span className="mt-1 block text-xs tabular-nums text-stone-400">{mensagem.length} / 4000</span>
      </label>

      <label className="block">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
          <Lock size={14} className="text-stone-400" aria-hidden />
          Credenciais protegidas
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
          Número de inscrição na OCC, códigos de validação, o que quiseres. Só tu e a
          administração conseguem ler isto — nunca aparece no perfil público.
        </span>
        <textarea
          value={credenciais}
          onChange={(e) => setCredenciais(e.target.value.slice(0, 4000))}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 font-mono text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
          <PaperClip size={14} className="text-stone-400" aria-hidden />
          Documentos comprovativos
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
          Até {MAX_DOCS} ficheiros, PDF ou imagem, 5 MB cada. Ficam num espaço privado.
          Também podes não anexar nada e tratar disso por email.
        </span>
        <input
          type="file"
          multiple
          accept={TIPOS_ACEITES.join(",")}
          onChange={(e) => escolherFicheiros(e.target.files)}
          className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:min-h-[2.25rem] file:cursor-pointer file:rounded-xl file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-700 hover:file:bg-stone-200"
        />
        {ficheiros.length > 0 && (
          <ul className="mt-2.5 space-y-1.5">
            {ficheiros.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3.5 py-2 text-sm">
                <span className="min-w-0 truncate text-stone-700">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFicheiros((a) => a.filter((_, j) => j !== i))}
                  aria-label={`Remover ${f.name}`}
                  className="inline-flex min-h-[2rem] min-w-[2rem] shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-clay-text"
                >
                  <Trash size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={aEnviar}>
          {aEnviar ? "A enviar…" : "Enviar candidatura"}
        </Button>
        {aSubir && (
          <span role="status" className="text-sm tabular-nums text-stone-500">
            Documento {Math.min(aSubir.feitos + 1, aSubir.total)} de {aSubir.total}…
          </span>
        )}
      </div>

      <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400">
        Só a administração do ReciboCerto vê esta candidatura. Aprovar cria a tua conta de
        contabilista; recusar não apaga nada e explica-te porquê, para poderes corrigir.
      </p>
    </form>
  );
}

function Campo({
  rotulo, id, valor, onChange, tipo = "text", obrigatorio,
}: {
  rotulo: string; id: string; valor: string; onChange: (v: string) => void;
  tipo?: string; obrigatorio?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-stone-700">
        {rotulo} {obrigatorio && <span className="text-clay-text">*</span>}
      </span>
      <input
        id={id}
        type={tipo}
        value={valor}
        required={obrigatorio}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
