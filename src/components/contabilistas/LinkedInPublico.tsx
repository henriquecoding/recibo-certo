"use client";

import { useEffect, useState } from "react";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import {
  obterLinkedInPublico,
  type LinkedInPublico,
} from "@/lib/contabilistas/linkedin";

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

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <AvatarContabilista
        contabilistaId={contabilistaId}
        nome={nome}
        avatarUrl={dados?.avatarUrl}
        tamanho="lg"
      />

      {dados?.ligadoEm && dados.url && (
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
