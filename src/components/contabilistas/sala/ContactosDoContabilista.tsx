"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS CANAIS DIRETOS — o que se ganha ao ser aceite
//  ---------------------------------------------------------------------
//  Havia uma RPC autorizada na base de dados que devolvia o email e o
//  telefone do contabilista a quem tinha vínculo vivo. Existia, estava
//  testada, e não era chamada por ecrã nenhum. O cliente aceite nunca via
//  o contacto de quem o acompanha.
//
//  Ao mesmo tempo, o email saía no diretório para quem não tinha sessão
//  nenhuma. Estava exatamente ao contrário: público para quem não tem
//  relação, invisível para quem tem.
//
//  Este bloco é a outra metade da correção do contrato público. Sem ele,
//  fechar o diretório teria tirado o contacto a toda a gente.
//
//  ---------------------------------------------------------------------
//  O QUE ESTE COMPONENTE **NÃO** FAZ
//
//  Não decide quem pode ver. A decisão é da base de dados —
//  `contactos_do_contabilista` exige vínculo `ativo` ou `pausado` e o
//  contabilista aprovado. Aqui não há nenhuma condição sobre o estado do
//  vínculo, e é de propósito: uma segunda opinião em JavaScript é uma
//  opinião que corre no browser de quem a quiser contornar. Se a RPC não
//  devolver nada, não há bloco.
//
//  Também não expõe contactos do CLIENTE ao contabilista. Isto é um só
//  sentido. O que o cliente decide dar sobre si é outra decisão, noutro
//  sítio, e nasce desligada.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
// Direto a `dados`, e não à porta de `fonte/`: a demonstração vive em
// `/admin/contabilista`, e este bloco é do lado do CLIENTE — a página que
// o monta (`/dashboard/contabilista`) nunca corre em modo demonstração.
import { contactosDoContabilista } from "@/lib/contabilistas/dados";
import type { ContactosPrivados } from "@/lib/contabilistas/tipos";
import { Globe, Lock, Mail, Phone } from "@/components/ui/Icons";

/** O `href` de cada canal, e o texto que se mostra em vez do endereço. */
function canais(c: ContactosPrivados) {
  const lista: { chave: string; rotulo: string; href: string; texto: string; Icon: typeof Mail; externo?: boolean }[] = [];

  if (c.emailContacto) {
    lista.push({
      chave: "email", rotulo: "Email", Icon: Mail,
      href: `mailto:${c.emailContacto}`, texto: c.emailContacto,
    });
  }
  if (c.telefone) {
    lista.push({
      chave: "telefone", rotulo: "Telefone", Icon: Phone,
      // `tel:` sem espaços — no telemóvel é o que faz o toque ligar.
      href: `tel:${c.telefone.replace(/\s+/g, "")}`, texto: c.telefone,
    });
  }
  if (c.website) {
    lista.push({
      chave: "site", rotulo: "Site", Icon: Globe, externo: true,
      href: c.website, texto: c.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    });
  }
  return lista;
}

export default function ContactosDoContabilista({
  contabilistaId, nome,
}: { contabilistaId: string; nome: string }) {
  const [contactos, setContactos] = useState<ContactosPrivados | null>(null);

  useEffect(() => {
    let vivo = true;
    contactosDoContabilista(contabilistaId)
      .then((c) => { if (vivo) setContactos(c); })
      .catch(() => { if (vivo) setContactos(null); });
    return () => { vivo = false; };
  }, [contabilistaId]);

  // Sem contactos não há bloco — nem esqueleto, nem estado vazio. Um
  // «ainda a carregar» aqui piscava em todas as visitas de quem não tem
  // acesso, e um estado vazio anunciava a existência de uma coisa que a
  // pessoa não vai ter.
  if (!contactos) return null;
  const lista = canais(contactos);
  if (lista.length === 0) return null;

  return (
    <section
      aria-labelledby="canais-titulo"
      className="mt-4 rounded-2xl border border-stone-200 bg-cream px-4 py-3.5 sm:px-5"
    >
      <h2
        id="canais-titulo"
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500"
      >
        <Lock size={12} className="shrink-0" aria-hidden />
        Contacto direto
      </h2>

      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        {nome} partilhou estes canais contigo ao aceitar o acompanhamento.
        Não aparecem no perfil público.
      </p>

      {/* Lista, não grelha: em 360px duas colunas partiam um email ao meio,
          e um endereço truncado não serve para copiar nem para ligar. */}
      <dl className="mt-3 space-y-2.5">
        {lista.map(({ chave, rotulo, href, texto, Icon, externo }) => (
          <div key={chave} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-stone-400">
              {rotulo}
            </dt>
            <dd className="min-w-0 flex-1">
              <a
                href={href}
                {...(externo ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
                className="inline-flex min-h-[36px] max-w-full items-center gap-1.5 break-all text-sm text-stone-800 underline underline-offset-2 hover:text-brand-dark"
              >
                <Icon size={14} className="shrink-0 text-stone-400" aria-hidden />
                <span className="min-w-0 break-all">{texto}</span>
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
