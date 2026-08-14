"use client";

import { useEffect, useState } from "react";
import { obterLinkedInPublico, type LinkedInPublico } from "@/lib/contabilistas/linkedin";

export default function LinkedInPublico({
  contabilistaId,
  nome,
}: {
  contabilistaId: string;
  nome: string;
}) {
  const [dados, setDados] = useState<LinkedInPublico | null>(null);

  useEffect(() => {
    let vivo = true;
    obterLinkedInPublico(contabilistaId).then((d) => {
      if (vivo) setDados(d);
    });
    return () => { vivo = false; };
  }, [contabilistaId]);

  if (!dados?.ligadoEm) return null;

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      {dados.avatarUrl ? (
        // O browser nunca fala diretamente com o CDN do LinkedIn: a rota do
        // ReciboCerto faz proxy da imagem e valida a origem no servidor.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/contabilistas/linkedin-avatar/${encodeURIComponent(contabilistaId)}`}
          alt={`Fotografia profissional de ${nome}`}
          className="h-20 w-20 rounded-3xl border border-stone-200 bg-stone-100 object-cover shadow-card sm:h-24 sm:w-24"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-stone-200 bg-stone-100 font-display text-xl text-stone-500 shadow-card sm:h-24 sm:w-24">
          {iniciais || "CC"}
        </div>
      )}

      {dados.url && (
        <a
          href={dados.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A66C2] underline-offset-2 hover:underline"
          aria-label={`Abrir o LinkedIn de ${nome}`}
        >
          <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#0A66C2] text-[10px] font-bold leading-none text-white">in</span>
          LinkedIn
        </a>
      )}
    </div>
  );
}
