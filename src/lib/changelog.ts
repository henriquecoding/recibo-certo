// ═══════════════════════════════════════════════════════════════════════
//  CHANGELOG do popup "Novidades & Atualizações".
//
//  O histórico anterior a 2.51.0 vive em `changelog-historico/`. A separação
//  evita regravar quase 200 KB de prosa para acrescentar uma linha nova, sem
//  mudar a API do módulo: quem importa `CHANGELOG` continua a receber TODAS
//  as versões, pela mesma ordem, e `gen-novidades.mjs` continua a gerar os
//  mesmos ficheiros mensais.
//
//  ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
//  entrada NO TOPO. A asserção abaixo bloqueia o build se divergirem.
// ═══════════════════════════════════════════════════════════════════════

import { APP_VERSION, type EntradaChangelog } from "./version";
import { CHANGELOG as HISTORICO } from "./changelog-historico";

const NOVAS_ENTRADAS: EntradaChangelog[] = [
  {
    version: "2.51.1",
    data: "2026-08-14",
    titulo: "LinkedIn e calendário do painel profissional corrigidos",
    itens: [
      "A ligação do LinkedIn volta a guardar o endereço público normalmente sem enfraquecer a proteção contra HTML e scripts. Fotografias temporárias que tenham expirado deixam de aparecer quebradas e podem ser renovadas pela própria ligação do LinkedIn.",
      "O calendário de prazo ao criar uma tarefa deixa de ser cortado pelo contentor animado e continua a usar o mesmo DatePicker, incluindo modo escuro, teclado e formato pt-PT.",
    ],
  },
  {
    version: "2.51.0",
    data: "2026-08-14",
    titulo: "O painel de contabilistas ficou mais claro — e texto executável fica à porta",
    itens: [
      "O painel profissional foi redesenhado como um sistema único: navegação, formulários, listas, tabelas e calendários ganharam a mesma hierarquia, profundidade, foco e modo escuro do resto do ReciboCerto. No telemóvel, os oito destinos deixam de ser comprimidos numa grelha de seis lugares: mantêm alvos confortáveis e a barra leva o destino atual para o centro.",
      "Os campos do painel passam a aplicar a mesma regra de segurança da Ajuda & Suporte a HTML, scripts e código executável. A interface trava antes de enviar e a base de dados repete a validação, por isso contornar o browser não contorna a proteção.",
    ],
  },
];

export const CHANGELOG: EntradaChangelog[] = [...NOVAS_ENTRADAS, ...HISTORICO];

function assertChangelogIntegrity(): void {
  const erros: string[] = [];

  if (CHANGELOG.length === 0) {
    erros.push("CHANGELOG vazio.");
  } else if (CHANGELOG[0].version !== APP_VERSION) {
    erros.push(
      `A entrada mais recente do CHANGELOG (v${CHANGELOG[0].version}) não corresponde a APP_VERSION (${APP_VERSION}). Atualiza ambos.`
    );
  }

  const vistos = new Set<string>();
  CHANGELOG.forEach((e, i) => {
    if (!/^\d+\.\d+\.\d+$/.test(e.version)) erros.push(`Versão inválida na posição ${i}: "${e.version}".`);
    if (vistos.has(e.version)) erros.push(`Versão duplicada no CHANGELOG: "${e.version}".`);
    vistos.add(e.version);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data)) erros.push(`Data inválida em v${e.version}: "${e.data}".`);
    if (!e.titulo?.trim()) erros.push(`Título em falta em v${e.version}.`);
    if (!e.itens?.length) erros.push(`Sem itens em v${e.version}.`);
  });

  if (erros.length > 0) {
    throw new Error(`[version] CHANGELOG inconsistente — build bloqueado:\n - ${erros.join("\n - ")}`);
  }
}

assertChangelogIntegrity();