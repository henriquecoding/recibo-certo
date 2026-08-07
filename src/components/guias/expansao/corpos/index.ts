import type { ComponentType } from "react";
import CorpoIMI from "./imi";
import CorpoIMT from "./imt";
import CorpoAIMI from "./aimi";
import CorpoVptReavaliacao from "./vpt-reavaliacao";
import CorpoImpostoSeloCompraCasa from "./imposto-selo-compra-casa";
import CorpoDespesasSenhorio from "./despesas-senhorio";
import CorpoArrendamentoCategoriaF from "./arrendamento-categoria-f";
import CorpoReciboRendaModelo44 from "./recibo-renda-modelo-44";
import CorpoMaisValiasImoveis from "./mais-valias-imoveis";
import CorpoAlojamentoLocal from "./alojamento-local";
import CorpoAlVsArrendamento from "./al-vs-arrendamento";
import CorpoHerdarImovel from "./herdar-imovel";
import CorpoImovelEmpresaOuPessoal from "./imovel-empresa-ou-pessoal";
import CorpoAnexoJ from "./anexo-j";
import CorpoCorretorasEstrangeirasIrs from "./corretoras-estrangeiras-irs";
import CorpoCripto365Dias from "./cripto-365-dias";
import CorpoRendimentosCapitaisCategoriaE from "./rendimentos-capitais-categoria-e";

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
  "mais-valias-imoveis": CorpoMaisValiasImoveis,
  "alojamento-local": CorpoAlojamentoLocal,
  "al-vs-arrendamento": CorpoAlVsArrendamento,
  "herdar-imovel": CorpoHerdarImovel,
  "imovel-empresa-ou-pessoal": CorpoImovelEmpresaOuPessoal,
  "anexo-j": CorpoAnexoJ,
  "corretoras-estrangeiras-irs": CorpoCorretorasEstrangeirasIrs,
  "cripto-365-dias": CorpoCripto365Dias,
  "rendimentos-capitais-categoria-e": CorpoRendimentosCapitaisCategoriaE,
};
