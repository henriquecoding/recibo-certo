import { manifesto } from "@/lib/guias/manifests";
import { projetarGuia } from "@/lib/guias/dossie/projecao.servidor";
import { passoDoGuia } from "@/lib/guias/dossie/passo";
import { resolverAcaoDoGuia } from "@/lib/fiz/guide-routing.server";
import FizNextStep from "@/components/fiz/FizNextStep";
import DossieDoGuia from "./dossie/DossieDoGuia";

// ═══════════════════════════════════════════════════════════════════════
//  O PASSO SEGUINTE DE UM GUIA — um bloco, não dois botões
//  ---------------------------------------------------------------------
//  Substitui a chamada direta a `FizNextStep` no fim de `GuiaLayout`, e
//  resolve de uma vez três achados da auditoria:
//
//   A2 — 29 dos 57 guias estáticos declaravam `FIND_ACCOUNTANT` e
//        mandavam esse intent para a FIZ, com o rótulo «Falar com um
//        contabilista certificado» a apontar para um link de afiliado.
//   A3 — 112 dos 169 guias não tinham passo seguinte NENHUM: `FizNextStep`
//        devolvia `null` e dois terços do catálogo acabavam em «fontes».
//   A4 — `escolherRota()` nunca era chamado num Guia.
//
//  A regra de composição: UMA ação principal, e quando existe outra, ela
//  vem em TEXTO — nunca num botão do mesmo peso. Duas ações do mesmo peso
//  no fim de uma página é a forma garantida de ninguém clicar em nenhuma.
//
//  O motivo da escolha fica visível, em pt-PT, como o §13.2 da estratégia
//  de crescimento exige: quem lê tem direito a saber porque é que lhe
//  estamos a sugerir aquilo.
// ═══════════════════════════════════════════════════════════════════════

export default async function ProximoPassoDoGuia({ slug }: { slug: string }) {
  const m = manifesto(slug);
  if (!m) return null;

  const projecao = projetarGuia(slug);
  if (!projecao) return null;

  const passo = passoDoGuia({
    categoria: m.categoria,
    arquetipo: m.archetype,
    estado: m.status,
    afirmacoesPorRever: projecao.sinais.afirmacoesPorRever,
    temAcaoFiz: Boolean(m.fizAction),
    // Um guia sem checklist, sem critérios e sem fontes não tem matéria
    // para projetar — e um dossiê de um guia desses seria uma capa vazia.
    temMateria:
      projecao.sinais.elementos + projecao.sinais.perguntas + projecao.sinais.fontes > 0,
  });

  if (passo.principal === "nenhum") return null;

  // Resolvido no servidor, como antes: em modo LIGACAO o destino é
  // conhecido no momento em que a página é renderizada, e manter o `fetch`
  // custava um round-trip por visita e nenhum link sem JavaScript.
  const acaoFiz = m.fizAction ? await resolverAcaoDoGuia({ slug, placement: "NEXT_STEP" }) : null;

  if (passo.principal === "fiz") {
    return (
      <>
        <FizNextStep slug={slug} acaoInicial={acaoFiz} />
        {passo.secundario === "contabilista" && (
          <DossieDoGuia projecao={projecao} variante="secundaria" rota="fiz" />
        )}
      </>
    );
  }

  return (
    <>
      <DossieDoGuia
        projecao={projecao}
        variante="principal"
        motivo={passo.motivo}
        rota="contabilista"
      />
      {passo.secundario === "fiz" && (
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Se o que queres é executar — emitir, faturar, declarar — a FIZ faz esse trabalho.
          O bloco abaixo continua a ser o mesmo.
        </p>
      )}
      {passo.secundario === "fiz" && <FizNextStep slug={slug} acaoInicial={acaoFiz} />}
    </>
  );
}
