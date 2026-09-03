// Versão da app + changelog do painel "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. É `APP_VERSION` que acende o ponto do botão
// «Novidades» a quem ainda não viu esta versão. Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.
//
// ⚠️ REGRA 10 (CLAUDE.md) — «Novidades & Atualizações» NÃO É UM POPUP.
// Não abre sozinho: nem na primeira visita, nem quando há versão nova, nem
// nunca. A única porta é o botão que vive ao lado do seletor de tema
// (`components/novidades/BotaoNovidades.tsx`). O que esta versão comanda é o
// PONTO desse botão: `VERSAO_STORAGE_KEY` guarda a última versão vista, e
// `hooks/useNovidadesPorVer.ts` compara-a com esta. A marca é posta no
// INSTANTE em que o painel é mostrado (não só ao fechar), pelo que atualizar a
// página com ele aberto não volta a acender o ponto.

export const APP_VERSION = "2.159.0";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

// O array CHANGELOG vive em `./changelog` — ver a nota nesse ficheiro sobre
// porque foi separado (peso no bundle do cliente). Este módulo fica leve de
// propósito: pode ser importado de qualquer lado sem custo.
