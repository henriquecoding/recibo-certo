// GERADO automaticamente por scripts/gen-quiz-meta.mjs — não editar à mão.
// Contagens do banco de perguntas, para o ecrã de seleção poder mostrar os
// totais SEM importar (e descarregar) os ~900 KB de bancos.
//
// Regenerar com:  npm run quiz:meta
// Verificar com:  npm run quiz:meta:check   (corre no CI e falha se divergir)
import type { QuizCategoria } from "./types";

export interface ContagemCategoria { total: number; facil: number; medio: number; dificil: number }

export const ESTATISTICAS_BANCO: Record<QuizCategoria, ContagemCategoria> = {
  "retencao": {
    "total": 100,
    "facil": 33,
    "medio": 43,
    "dificil": 24
  },
  "iva": {
    "total": 100,
    "facil": 27,
    "medio": 40,
    "dificil": 33
  },
  "seguranca_social": {
    "total": 100,
    "facil": 32,
    "medio": 44,
    "dificil": 24
  },
  "regime_simplificado": {
    "total": 100,
    "facil": 27,
    "medio": 42,
    "dificil": 31
  },
  "irs_jovem": {
    "total": 100,
    "facil": 24,
    "medio": 40,
    "dificil": 36
  },
  "escaloes_deducoes": {
    "total": 100,
    "facil": 30,
    "medio": 41,
    "dificil": 29
  },
  "atividades": {
    "total": 100,
    "facil": 25,
    "medio": 43,
    "dificil": 32
  },
  "categoria_f": {
    "total": 100,
    "facil": 24,
    "medio": 43,
    "dificil": 33
  },
  "prazos": {
    "total": 100,
    "facil": 30,
    "medio": 41,
    "dificil": 29
  },
  "geral": {
    "total": 100,
    "facil": 30,
    "medio": 41,
    "dificil": 29
  },
  "dep_ss": {
    "total": 109,
    "facil": 29,
    "medio": 53,
    "dificil": 27
  },
  "dep_irs": {
    "total": 87,
    "facil": 31,
    "medio": 28,
    "dificil": 28
  },
  "dep_subsidios": {
    "total": 123,
    "facil": 31,
    "medio": 27,
    "dificil": 65
  },
  "empresa_criacao": {
    "total": 102,
    "facil": 52,
    "medio": 23,
    "dificil": 27
  },
  "empresa_legislacao": {
    "total": 99,
    "facil": 44,
    "medio": 31,
    "dificil": 24
  },
  "empresa_fiscalidade": {
    "total": 94,
    "facil": 24,
    "medio": 44,
    "dificil": 26
  }
};

export const TOTAL_PERGUNTAS_META = 1614;
