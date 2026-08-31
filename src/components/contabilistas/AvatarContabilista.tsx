"use client";

import { useEffect, useState } from "react";
import { avatarLinkedInExpirou } from "@/lib/contabilistas/fonte/linkedin";

type TamanhoAvatar = "sm" | "md" | "lg";

const CLASSES_TAMANHO: Record<TamanhoAvatar, string> = {
  sm: "h-12 w-12 rounded-2xl text-sm",
  md: "h-16 w-16 rounded-[1.35rem] text-lg",
  lg: "h-20 w-20 rounded-3xl text-xl sm:h-24 sm:w-24",
};

export default function AvatarContabilista({
  contabilistaId,
  nome,
  avatarUrl,
  temAvatar,
  tamanho = "md",
}: {
  contabilistaId: string;
  nome: string;
  avatarUrl?: string | null;
  /**
   * A resposta já dada a «há fotografia?».
   *
   * O diretório não recebe a URL assinada do LinkedIn — resolve a
   * existência e a validade na camada de dados e manda só o sim/não. Quem
   * tiver a URL à mão continua a passar `avatarUrl` e nada muda.
   */
  temAvatar?: boolean;
  tamanho?: TamanhoAvatar;
}) {
  const [falhou, setFalhou] = useState(false);

  useEffect(() => { setFalhou(false); }, [avatarUrl, temAvatar, contabilistaId]);

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  const disponivel = (temAvatar ?? (Boolean(avatarUrl) && !avatarLinkedInExpirou(avatarUrl)))
    && !falhou;
  const tamanhoClasse = CLASSES_TAMANHO[tamanho];

  if (disponivel) {
    return (
      // O browser fala apenas com o proxy do Recibo Certo. A URL assinada do
      // LinkedIn serve para decidir se ainda vale a pena pedir a fotografia;
      // nunca é exposta como `src` nem hotlinked diretamente.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/contabilistas/linkedin-avatar/${encodeURIComponent(contabilistaId)}`}
        alt={`Fotografia profissional de ${nome}`}
        onError={() => setFalhou(true)}
        className={`${tamanhoClasse} shrink-0 border border-stone-200 bg-stone-100 object-cover shadow-card dark:border-stone-700 dark:bg-stone-800`}
      />
    );
  }

  return (
    <div
      aria-label={`Perfil de ${nome}`}
      className={`${tamanhoClasse} flex shrink-0 items-center justify-center border border-brand/15 bg-brand-light font-display font-semibold text-brand-dark shadow-card dark:border-brand/25 dark:bg-brand/15 dark:text-brand-mint`}
    >
      {iniciais || "CC"}
    </div>
  );
}
