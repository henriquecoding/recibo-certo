"use client";

// ═══════════════════════════════════════════════════════════════════════
//  /d/<id> — o dossiê para o contabilista que não está aqui
//  ---------------------------------------------------------------------
//  É a razão de D3 existir: a maioria de quem lê estes guias já tem
//  contabilista, e esse contabilista não está na plataforma. Sem isto, o
//  motor só serviria a minoria.
//
//  E não é um link. Um link não tem estas propriedades:
//
//   · o TOKEN viaja no FRAGMENTO (`#`), que o browser não põe no `Referer`
//     nem em logs de servidor. Por isso a página é de cliente e o
//     conteúdo é pedido depois de montar: o servidor nunca vê o token no
//     pedido de navegação;
//   · na base fica só o `token_hash` — quem lê a tabela não abre nada;
//   · expira, revoga-se com efeito imediato, e conta cada abertura;
//   · não dá acesso a mais nada: não é sessão, não é conta, não vê outros
//     dossiês, não vê o painel;
//   · e deste lado há CONSOLA: extrair, selecionar, pedir elementos.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import ConsolaDossie from "@/components/guias/dossie/ConsolaDossie";
import { Logo, Lock, Spinner, Warning } from "@/components/ui/Icons";
import type { DossieDeGuia, PedidoDeElementos } from "@/lib/guias/dossie";

type Estado =
  | { fase: "a-abrir" }
  | { fase: "sem-token" }
  | { fase: "erro"; mensagem: string }
  | { fase: "aberto"; dossie: DossieDeGuia; etiqueta: string | null; expiraEm: string; acessos: number };

export default function DossiePublico({ id }: { id: string }) {
  const [estado, setEstado] = useState<Estado>({ fase: "a-abrir" });
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const bruto = window.location.hash.replace(/^#/, "").trim();
    if (!bruto) { setEstado({ fase: "sem-token" }); return; }
    setToken(bruto);

    let vivo = true;
    void (async () => {
      try {
        const resposta = await fetch("/api/dossie/abrir", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, token: bruto }),
        });
        const corpo = (await resposta.json()) as {
          erro?: string; dossie?: DossieDeGuia; etiqueta?: string | null;
          expiraEm?: string; acessos?: number;
        };
        if (!vivo) return;
        if (!resposta.ok || !corpo.dossie) {
          setEstado({ fase: "erro", mensagem: corpo.erro ?? "Não foi possível abrir o dossiê." });
          return;
        }
        setEstado({
          fase: "aberto",
          dossie: corpo.dossie,
          etiqueta: corpo.etiqueta ?? null,
          expiraEm: corpo.expiraEm ?? "",
          acessos: corpo.acessos ?? 1,
        });
      } catch {
        if (vivo) setEstado({ fase: "erro", mensagem: "Não foi possível contactar o servidor." });
      }
    })();
    return () => { vivo = false; };
  }, [id]);

  async function enviarPedido(pedido: PedidoDeElementos): Promise<{ erro?: string }> {
    const resposta = await fetch("/api/dossie/pedir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        token,
        itens: pedido.itens.map((i) => ({
          texto: i.texto,
          origem: i.origem,
          item_id: i.itemId ?? null,
          prazo: i.prazo ?? "",
          nota: i.nota ?? null,
        })),
      }),
    });
    const corpo = (await resposta.json()) as { erro?: string };
    return resposta.ok ? {} : { erro: corpo.erro ?? "Não foi possível enviar o pedido." };
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-ink" aria-label="Recibo Certo">
          <Logo small />
        </Link>
        {estado.fase === "aberto" && (
          <p className="texto-mini text-stone-400">
            Aberto {estado.acessos} {estado.acessos === 1 ? "vez" : "vezes"}
            {estado.expiraEm ? ` · expira a ${estado.expiraEm.slice(8, 10)}/${estado.expiraEm.slice(5, 7)}` : ""}
          </p>
        )}
      </header>

      {estado.fase === "a-abrir" && (
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Spinner size={16} aria-hidden /> A abrir o dossiê…
        </p>
      )}

      {estado.fase === "sem-token" && (
        <Aviso
          titulo="Falta a parte final do endereço"
          texto="Este endereço só abre com a chave que vem depois do cardinal (#). Copia-o outra vez, inteiro, de onde o recebeste."
        />
      )}

      {estado.fase === "erro" && <Aviso titulo="Não foi possível abrir" texto={estado.mensagem} />}

      {estado.fase === "aberto" && (
        <>
          <p className="mb-6 flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
            <span>
              {estado.etiqueta ? `«${estado.etiqueta}» partilhou ` : "Alguém partilhou "}
              este dossiê contigo. Não tens conta nem precisas de uma: podes ler, extrair o
              que precisares e pedir os elementos em falta. Quem o criou pode revogar o
              acesso a qualquer momento.
            </span>
          </p>

          <ConsolaDossie
            dossie={estado.dossie}
            origem={{ referencia: `LIGACAO-${id.slice(0, 8)}`, enviarPedido }}
            avisoDeIdentidade="Quem pedir elementos por esta ligação não é identificado pela plataforma. O cliente vê o pedido com essa ressalva."
          />
        </>
      )}
    </main>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-700 dark:bg-stone-900">
      <Warning size={24} className="mx-auto text-stone-400" aria-hidden />
      <h1 className="mt-3 font-display text-xl text-ink">{titulo}</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{texto}</p>
      <Link
        href="/guias"
        className="mt-5 inline-block text-sm font-semibold text-brand-dark underline underline-offset-2 dark:text-brand"
      >
        Ver os guias do Recibo Certo
      </Link>
    </div>
  );
}
