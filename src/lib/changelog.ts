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
    version: "2.55.0",
    data: "2026-08-15",
    titulo: "O perfil profissional deixa de ser um formulário e passa a ser uma identidade",
    itens: [
      "A página de perfil do contabilista passa a ter o editor à esquerda e a pré-visualização do perfil público à direita, atualizada enquanto se escreve. Deixa de ser preciso guardar para perceber o que os clientes vão ver. Os campos organizam-se em blocos com pesos diferentes — identidade, áreas de trabalho, atendimento, contacto e disponibilidade — em vez de um formulário longo onde o site tinha o mesmo destaque que a apresentação.",
      "O perfil ganha título profissional, apresentação de uma linha para o cartão do diretório, idiomas de atendimento, anos de experiência e tempo de resposta. Os dois últimos são declarados pelo próprio e a interface diz que o são: o Recibo Certo não apresenta como medição aquilo que não mede.",
      "O número de inscrição na Ordem passa a distinguir «informado» de «verificado». Um número escrito no formulário aparece como informado; a verificação passa a ser um facto registado pela administração, e alterar o número retira-a automaticamente.",
      "A disponibilidade para novos clientes deixa de ser uma caixa no fim da página e passa a ser uma escolha explícita entre aceitar novos clientes e não ter vagas — com o perfil a continuar público nos dois casos.",
    ],
  },
  {
    version: "2.54.0",
    data: "2026-08-15",
    titulo: "O que é público num contabilista passa a ser uma lista fechada",
    itens: [
      "O diretório e os perfis públicos dos contabilistas passam a ler um conjunto de campos declarado um a um, em vez da ficha inteira. O telefone deixa de sair para quem não tem sessão — nenhum ecrã o mostrava — e passa a estar disponível para quem já tem acompanhamento ativo com esse contabilista. O email, a apresentação, as áreas, a localização e o estado de vagas continuam públicos, como sempre estiveram.",
      "Identificadores internos — a ligação à candidatura e o identificador técnico da conta LinkedIn — deixam de ser legíveis a partir do diretório. Não eram mostrados em lado nenhum e não têm razão para sair.",
    ],
  },
  {
    version: "2.53.1",
    data: "2026-08-15",
    titulo: "Os documentos de exemplo passam a ser conferidos, não reescritos",
    itens: [
      "Os três documentos de demonstração — relatório de vencimento, mapa de recibos e declaração de IRS — passam a ter uma referência de exemplo estável em vez de uma referência de emissão inventada a cada vez. Quem abrir um destes PDF vê imediatamente que está perante um exemplo e não perante uma emissão real.",
      "Os números destes documentos passam a ser conferidos contra o motor de cálculo a cada execução dos testes. Antes eram reescritos em silêncio, pelo que uma alteração ao cálculo podia mudar o que os documentos mostram sem que nada o assinalasse.",
    ],
  },
  {
    version: "2.53.0",
    data: "2026-08-15",
    titulo: "A administração passa a ver o painel dos contabilistas por dentro",
    itens: [
      "A administração ganha acesso ao painel de gestão dos contabilistas com um consultório de demonstração: os mesmos ecrãs, a mesma navegação e as mesmas regras que o contabilista vê, com clientes, consultas, casos, tarefas e cupões inventados. Serve para conferir e validar a funcionalidade sem abrir a conta de ninguém — nenhum dado real de contabilista ou de cliente é mostrado.",
      "Não existe uma segunda versão do painel: o painel simulado e o painel real são literalmente o mesmo código, e uma alteração à estrutura ou à lógica passa a valer nos dois ao mesmo tempo. As regras que travam ações — confirmar uma consulta que já não está por confirmar, concluir uma que ainda não começou, aceitar um acompanhamento já aceite, gastar um cupão que já foi usado — respondem na demonstração exatamente como respondem a sério.",
      "Todos os ecrãs do painel simulado dizem que estão em demonstração e trazem um botão para repor os dados iniciais. Nada do que lá se faz sai do browser de quem está a ver.",
    ],
  },
  {
    version: "2.52.0",
    data: "2026-08-14",
    titulo: "Os contabilistas deixam de ser apenas um nome no diretório",
    itens: [
      "Os cartões do diretório passam a mostrar identidade profissional de verdade: fotografia do LinkedIn quando existe, disponibilidade para novos clientes, atendimento, localização, áreas, inscrição OCC quando indicada, preço e fidelidade quando configurados, além de um caminho claro para abrir o perfil. Quando ainda faltam campos, o cartão continua útil sem inventar experiência ou credenciais.",
      "A fotografia e o estado público do LinkedIn passam a ser lidos em lote para todo o diretório. Assim, enriquecer os cartões não cria uma consulta à base por contabilista nem torna a página progressivamente mais lenta à medida que o diretório crescer.",
      "Os seletores de distrito e área deixam de abrir o menu nativo do sistema operativo, que no modo escuro podia mostrar texto claro sobre um fundo claro/cinzento no Edge. Passam a usar uma lista do próprio design system, com contraste controlado, foco visível e navegação por setas, Home, End, Enter e Escape.",
      "O formulário do perfil profissional ganha contraste explícito em claro e escuro e um resumo dos campos essenciais que dão contexto ao cartão público. A ligação LinkedIn, os campos, estados desativados e ações de guardar mantêm-se funcionais sem remover nenhuma opção existente.",
    ],
  },
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