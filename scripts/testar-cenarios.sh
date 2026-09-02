#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  A matriz de autorização de `public.cenarios`, contra PostgreSQL a sério.
#  ---------------------------------------------------------------------
#  A Entrega D do relatório do painel alarga uma tabela que já guarda dados
#  de pessoas: acrescenta dois tipos, cinco colunas, um índice e um
#  trigger. É o momento clássico em que uma política RLS se perde sem
#  ninguém dar por isso — a migração corre, o esquema fica maior, e a única
#  prova de que o isolamento continua de pé é ninguém se ter queixado.
#
#  Isto sobe um PostgreSQL descartável, aplica as migrações de `cenarios`
#  pela ordem real, DUAS vezes (a segunda prova a idempotência), e corre a
#  matriz com três identidades: anónimo, Plus e grátis.
#
#  Porque não entra em `scripts/testar-rls.sh`: essa suíte monta o esquema
#  da plataforma de contabilistas (042 em diante) e o próprio ficheiro
#  explica porque não aplica `20260813_planos_operacionais.sql` — mudaria
#  comportamento que quatro dos seus testes afirmam. `cenarios` nasce na
#  017 e vive noutro lado da casa.
#
#  Uso:  bash scripts/testar-cenarios.sh
#  Requer: postgresql-16 (binários em /usr/lib/postgresql/16/bin).
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTES="$RAIZ/supabase/tests/cenarios"
MIG="$RAIZ/supabase/migrations"

# A ordem é a real, e não é decorativa: a 032 redefine o CHECK que a 017
# criou, e cada migração de tipo novo redefine o da anterior. Aplicadas
# fora de ordem, o resultado é uma lista de tipos de outra época.
#
# `01-politicas-atuais.sql` entra NO LUGAR de `20260813_planos_operacionais`
# — é de lá que vem, copiado. A posição importa: as políticas de hoje
# nascem DEPOIS da 032 e ANTES dos tipos novos, e é por isso que o bloco
# de verificação da última migração as encontra. Pô-las no fim fazia essa
# verificação falhar, e falhar com razão.
MIGRACOES=(
  "$MIG/017_cenarios.sql"
  "$MIG/032_dashboard_contrato.sql"
  "$TESTES/01-politicas-atuais.sql"
  "$MIG/20260819120000_cenario_projeto_de_negocio.sql"
  "$MIG/20260830071059_cenario_planeador_contratacao.sql"
  "$MIG/20260902120000_cenarios_descoberta_e_preco.sql"
)

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
BASE="${PGTESTDIR:-/home/pgtest}"
export PATH="$PGBIN:$PATH"

if [ ! -x "$PGBIN/initdb" ]; then
  echo "postgres não encontrado em $PGBIN — define PGBIN." >&2
  exit 2
fi

# O initdb recusa correr como root.
if [ "$(id -u)" = "0" ]; then
  id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
  COMO_PG() { su pgtest -c "PATH=$PGBIN:\$PATH $1"; }
else
  COMO_PG() { bash -c "$1"; }
fi

if [ -n "${CI:-}" ] && pg_isready -h localhost -q 2>/dev/null; then
  BASE=localhost
  export PGUSER="${PGUSER:-postgres}"
fi

if [ "$BASE" != "localhost" ] && ! pg_isready -h "$BASE" -q 2>/dev/null; then
  echo "· a arrancar PostgreSQL descartável em $BASE"
  COMO_PG "rm -rf $BASE/pgdata && mkdir -p $BASE/pgdata && chmod 700 $BASE/pgdata"
  COMO_PG "initdb -D $BASE/pgdata -A trust -U postgres" >/dev/null
  COMO_PG "pg_ctl -D $BASE/pgdata -l $BASE/pg.log -o '-k $BASE -h \"\"' start" >/dev/null
  sleep 2
fi

P() { psql -h "$BASE" -U postgres -v ON_ERROR_STOP=1 "$@"; }

echo "· base de dados limpa"
P -q -c "DROP DATABASE IF EXISTS rc_cenarios;" -c "CREATE DATABASE rc_cenarios;" >/dev/null
P -q -d rc_cenarios -f "$TESTES/00-arreio.sql" >/dev/null

for passagem in "1.ª" "2.ª (idempotência)"; do
  for m in "${MIGRACOES[@]}"; do
    echo "· $(basename "$m") — passagem $passagem"
    P -q -d rc_cenarios -f "$m" >/dev/null
  done
done

echo ""
set +e
P -d rc_cenarios -f "$TESTES/02-matriz-rls.sql" 2>&1 \
  | grep -E "^──|ok  ·|FALHA|ERROR|✓" | sed 's/^psql.*NOTICE: *//'
estado=${PIPESTATUS[0]}
set -e

echo ""
if [ "$estado" != "0" ]; then
  echo "✗ A matriz de autorização de cenarios FALHOU." >&2
  exit 1
fi
echo "✓ cenarios: migração idempotente e matriz de autorização verificada."
