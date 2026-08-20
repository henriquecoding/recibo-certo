// ═══════════════════════════════════════════════════════════════════════
//  AS PREFERÊNCIAS FISCAIS, OFERECIDAS — nunca aplicadas em silêncio
//  ---------------------------------------------------------------------
//  §45 do relatório. O site já guarda um perfil fiscal — IRS Jovem,
//  tributação conjunta, dependentes, incapacidade, IFICI — e o simulador
//  de empresa assumia sempre continente, não casado, sem dependentes,
//  ignorando tudo o que a pessoa já tinha respondido noutro ecrã.
//
//  §0: «uma resposta já dada não volta a ser uma pergunta». Mas há uma
//  fronteira que este ficheiro existe para não atravessar:
//
//      «Nunca aplicar silenciosamente.»
//
//  Encontrar respostas antigas e usá-las sem dizer nada dá o pior dos
//  dois mundos: a pessoa vê um número personalizado que não pediu, e não
//  sabe com que dados foi feito. O que se oferece é a IMPORTAÇÃO — com o
//  que vai ser preenchido à vista, e uma saída.
// ═══════════════════════════════════════════════════════════════════════

import type { PerfilFiscalPessoa } from "@/lib/perfil-pessoa";
import { ROTULO_ESTADO_CIVIL } from "@/lib/perfil-pessoa";
import type { PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";

export interface OfertaDePreferencias {
  /** O perfil que se aplicaria, se a pessoa aceitar. */
  perfil: PerfilFiscalPessoa;
  /** As linhas a mostrar antes de aplicar. Legíveis, já formatadas. */
  linhas: string[];
  /** Vale a pena oferecer? Falso quando não há nada de útil guardado. */
  temAlgoUtil: boolean;
}

/**
 * O que as preferências guardadas dizem sobre a situação pessoal.
 *
 * ⚠️ `conjunta` NÃO vira `estadoCivil`. §43: são conceitos diferentes —
 * a opção pela tributação conjunta é da declaração anual; a tabela de
 * retenção depende de quem aufere rendimentos. As preferências não
 * guardam a segunda, e por isso não se infere.
 */
export function ofertaDePreferencias(prefs: PreferenciasFiscais): OfertaDePreferencias {
  const perfil: PerfilFiscalPessoa = {};
  const linhas: string[] = [];

  if (prefs.dependentes > 0) {
    perfil.dependentes = prefs.dependentes;
    linhas.push(
      `${prefs.dependentes} ${prefs.dependentes === 1 ? "dependente" : "dependentes"}`,
    );
  }
  if (prefs.conjunta) {
    perfil.conjunta = true;
    linhas.push("Tributação conjunta");
  }
  if (prefs.deficiencia) {
    perfil.deficiencia = true;
    linhas.push("Incapacidade ≥ 60% declarada");
  }
  if (prefs.ifici) {
    perfil.ifici = true;
    linhas.push("IFICI (Art. 58.º-A EBF)");
  }
  if (prefs.irsJovemAno > 0) {
    perfil.irsJovemAno = prefs.irsJovemAno;
    linhas.push(`IRS Jovem — ${prefs.irsJovemAno}.º ano`);
  }

  return { perfil, linhas, temAlgoUtil: linhas.length > 0 };
}

/**
 * O que a importação NÃO consegue preencher, e porquê.
 *
 * Aparece ao lado do que vai ser preenchido. Sem isto, a pessoa aceita a
 * importação e fica a pensar que o perfil está completo — e a tabela de
 * retenção, que é o campo com mais impacto, continua por declarar.
 */
export function pendentesDaImportacao(perfil: PerfilFiscalPessoa): string[] {
  const pendentes: string[] = [];

  if (perfil.estadoCivil === undefined) {
    pendentes.push(
      `Tabela de retenção (${Object.values(ROTULO_ESTADO_CIVIL).join(", ")}) — depende de quem aufere rendimentos, e as preferências não o guardam`,
    );
  }
  if (perfil.regiao === undefined) {
    pendentes.push("Região de residência fiscal — vem da localização do projeto, não do perfil");
  }

  return pendentes;
}
