import type { ComponentType } from "react";
import CorpoIMI from "./imi";
import CorpoIMT from "./imt";
import CorpoAIMI from "./aimi";
import CorpoVptReavaliacao from "./vpt-reavaliacao";
import CorpoImpostoSeloCompraCasa from "./imposto-selo-compra-casa";
import CorpoDespesasSenhorio from "./despesas-senhorio";
import CorpoArrendamentoCategoriaF from "./arrendamento-categoria-f";
import CorpoReciboRendaModelo44 from "./recibo-renda-modelo-44";

// ═══════════════════════════════════════════════════════════════════════
//  CORPOS REDIGIDOS DOS GUIAS DA EXPANSÃO
//  ---------------------------------------------------------------------
//  O registo tem de coincidir com `CORPOS_REDIGIDOS` (o conjunto de slugs
//  que decide o estado editorial). São duas listas porque vivem em lados
//  diferentes da fronteira cliente/servidor: os manifestos precisam de
//  saber QUE guias têm corpo sem arrastar o JSX de todos eles.
//
//  `guias:expansao` verifica as duas direções e falha se divergirem — é a
//  única razão por que duas listas são aceitáveis aqui.
// ═══════════════════════════════════════════════════════════════════════

export const CORPOS: Record<string, ComponentType> = {
  imi: CorpoIMI,
  imt: CorpoIMT,
  aimi: CorpoAIMI,
  "vpt-reavaliacao": CorpoVptReavaliacao,
  "imposto-selo-compra-casa": CorpoImpostoSeloCompraCasa,
  "despesas-senhorio": CorpoDespesasSenhorio,
  "arrendamento-categoria-f": CorpoArrendamentoCategoriaF,
  "recibo-renda-modelo-44": CorpoReciboRendaModelo44,
};
