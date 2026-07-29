"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PRÉ-VISUALIZAÇÃO DE UM CRIATIVO DE PARCEIRO
//  ---------------------------------------------------------------------
//  O `AnuncioForm` já tinha a melhor peça deste ecrã: uma pré-visualização
//  desktop/mobile em direto. Este componente aproveita-a inteira para o tipo
//  novo — o admin escolhe o formato e vê exatamente o que vai aparecer,
//  incluindo a divulgação, que não é opcional.
//
//  O destino nunca se escreve à mão aqui: é sempre `/ir/<parceiro>`, com a
//  superfície e a variante como parâmetros. É por isso que o formulário deste
//  tipo não tem campo de URL.
// ═══════════════════════════════════════════════════════════════════════

import FizCriativoTexto, {
  DIMENSAO,
  type FormatoTexto,
} from "@/components/parcerias/FizCriativoTexto";
import FizDisclosure from "@/components/fiz/FizDisclosure";
import { DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";

export const FORMATOS_CRIATIVO: { id: FormatoTexto | "half-page"; label: string; nota: string }[] = [
  { id: "leaderboard", label: "Leaderboard · 728 × 90", nota: "Faixa larga — painel, simulador, comparador" },
  { id: "billboard", label: "Billboard · 970 × 250", nota: "Faixa alta — topo da página inicial, planos" },
  { id: "retangulo", label: "Retângulo · 300 × 250", nota: "Bloco lateral — receitas, recibos" },
  { id: "retanguloGrande", label: "Retângulo grande · 336 × 280", nota: "Bloco lateral — prazos" },
  { id: "movel", label: "Móvel · 320 × 100", nota: "Faixa compacta de telemóvel" },
  { id: "half-page", label: "Half-page · 300 × 600", nota: "Imagem do kit, com captura do produto" },
];

export default function CriativoParceiroPreview({
  formato,
  divulgacao,
  mobile = false,
}: {
  formato: FormatoTexto | "half-page";
  divulgacao?: string;
  mobile?: boolean;
}) {
  const texto = divulgacao?.trim() || DIVULGACAO_LIGACAO;

  if (formato === "half-page") {
    return (
      <div className="space-y-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/parceiros/fiz/fiz-300x600-pt.webp"
          width={300}
          height={600}
          alt="FIZ — impostos no automático"
          className="h-auto w-full max-w-[220px] rounded-2xl"
        />
        <FizDisclosure texto={texto} />
      </div>
    );
  }

  const { largura, altura } = DIMENSAO[formato];
  return (
    <div className="space-y-1.5">
      <FizCriativoTexto formato={formato} href="#" className={mobile ? "max-w-full" : ""} />
      <p className="text-[10px] text-stone-400">
        {largura} × {altura} — gerado em código, sem imagem e sem CLS.
      </p>
      <FizDisclosure texto={texto} />
    </div>
  );
}
