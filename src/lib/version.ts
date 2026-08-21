// Versão da app + changelog do popup "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. O popup só reaparece a um utilizador quando
// `APP_VERSION` muda (guarda a última vista em localStorage). Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.
//
// ⚠️ REGRA IMUTÁVEL do comportamento do popup (NÃO alterar sem autorização):
// o popup "Novidades" só pode aparecer (1) na PRIMEIRA visita de sempre e
// (2) quando há uma NOVA versão (este `APP_VERSION` muda). Nunca a cada refresh.
// A garantia vive em `NovidadesModal.tsx`: a versão é marcada como vista no
// INSTANTE em que o popup é mostrado (não só ao fechar), pelo que atualizar a
// página com ele aberto nunca o faz reaparecer para a mesma versão.

export const APP_VERSION = "2.94.0";
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
