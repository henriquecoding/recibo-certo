#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  Testes de RLS da plataforma de contabilistas, contra PostgreSQL a sério.
#  ---------------------------------------------------------------------
#  As garantias da migração 042 — ninguém se auto-aprova, ninguém marca duas
#  consultas no mesmo horário, ninguém se oferece cupões, e um contabilista
#  só lê o que lhe foi enviado — são políticas RLS e restrições da base de
#  dados. Lê-las não prova nada; correm-se.
#
#  Sobe um PostgreSQL descartável, imita o suficiente do Supabase
#  (auth.uid(), storage, profiles, is_admin), aplica a migração DUAS vezes
#  (para provar a idempotência) e exerce as políticas com cinco identidades.
#
#  Uso:  bash scripts/testar-rls.sh
#  Requer: postgresql-16 (binários em /usr/lib/postgresql/16/bin).
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTES="$RAIZ/supabase/tests"
# As migrações NUMERADAS da plataforma, por ordem: 042 a 099, pelo número no
# nome. Uma migração numerada nova entra aqui sozinha — o glob apanha-a, e a
# suíte passa a exercê-la sem se alterar.
#
# ⚠️ Isso vale só para as numeradas. Uma migração DATADA não é apanhada por
# glob nenhum e tem de ser acrescentada à lista explícita mais abaixo. Já
# custou caro: `20260817120000_local_verificado_da_consulta` ficou de fora e
# ninguém viu que não sobrevivia a uma segunda aplicação — largava a
# assinatura antiga de `confirmar_consulta` e criava a nova com
# `CREATE FUNCTION`, por isso a segunda passagem morria com 42723 e deixava
# a base com as duas assinaturas vivas e a chamada ambígua. Foi a
# idempotência que este arreio prova que teria apanhado o defeito, se ele
# estivesse dentro do alcance dela.
#
# Duas versões anteriores disto estavam erradas de maneiras diferentes.
# `04[2-9]` deixava a 050 de fora — e uma migração que a suíte não aplica é
# uma migração que ninguém testa, sem aviso nenhum. E `$NF >= "042"` era
# uma comparação de TEXTO: `20260813_planos_operacionais.sql` também é
# maior do que `042`, e entrava aqui sem este arreio ter o esquema que ela
# precisa. O padrão é agora explícito.
MIGRACOES=($(ls "$RAIZ"/supabase/migrations/*.sql \
  | grep -E '/0(4[2-9]|[5-9][0-9])_' | sort))

# ── E as que vieram depois, com nome por data ────────────────────────
#
# Estas TÊM de correr aqui: os testes 13 e 14 exercem-nas. Vêm depois das
# numeradas porque é essa a ordem real — a fronteira de contacto desfaz
# uma coluna que uma migração de agosto tinha acabado de pôr numa RPC, e
# aplicá-la antes reintroduzia o contacto do cliente sem ninguém dar por
# isso.
#
# ⚠️ A LISTA É EXPLÍCITA, e não um `ls` de tudo o que tem data no nome.
# Tentou-se o `ls`: as restantes migrações da plataforma aplicam-se sem
# erro, mas mudam comportamento que os testes 02, 03, 04 e 12 afirmam
# contra o esquema de 042-053 — a fidelidade passa a nascer inativa, o
# motivo de recusa de `concluir_consulta` muda de nome, e uma proposta
# passa a exigir leitura do contrato antes de ser aceite. Pô-las a correr
# aqui exige atualizar esses quatro ficheiros, e isso é outro trabalho —
# um que vale a pena, e que fica por fazer de olhos abertos e não por
# distração.
#
# A `local_verificado_da_consulta` entra por outro motivo que não um teste
# que a exerça: nenhum dos ficheiros a chama. Entra pela SEGUNDA passagem —
# é ela que prova que a migração se deixa reaplicar, e foi a falta dessa
# prova que deixou passar o 42723. Aplica-se sobre o esquema de 042-053 sem
# mexer no que os testes 02, 03, 04 e 12 afirmam.
#
# A `fim_da_mediacao` entra no fim, e a ordem não é decorativa: ela DESFAZ
# a fronteira de contacto e a revisão de mensagens que as anteriores
# montaram. Aplicada antes delas, seria desfeita por elas.
MIGRACOES+=(
  "$RAIZ/supabase/migrations/20260816150000_fronteira_de_contacto.sql"
  "$RAIZ/supabase/migrations/20260816160000_sala_de_acompanhamento.sql"
  "$RAIZ/supabase/migrations/20260817120000_local_verificado_da_consulta.sql"
  "$RAIZ/supabase/migrations/20260818210000_fim_da_mediacao.sql"
)

if [ ${#MIGRACOES[@]} -eq 0 ]; then
  echo "Nenhuma migração no intervalo — o filtro está errado." >&2
  exit 2
fi

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

# No CI há um PostgreSQL já a correr, alcançável por TCP. Localmente
# sobe-se um descartável. `PGHOST_RLS` distingue os dois casos sem obrigar
# quem corre isto na sua máquina a configurar seja o que for.
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
P -q -c "DROP DATABASE IF EXISTS rc_testes;" -c "CREATE DATABASE rc_testes;" >/dev/null
P -q -d rc_testes -f "$TESTES/00-arreio-supabase.sql"

for passagem in "1.ª" "2.ª (idempotência)"; do
  for m in "${MIGRACOES[@]}"; do
    echo "· $(basename "$m") — passagem $passagem"
    P -q -d rc_testes -f "$m" >/dev/null
  done
done

P -q -d rc_testes -f "$TESTES/01-dados.sql"

falhou=0
# Do 02 em diante, por ordem. `0[2-9]` deixava o 10 de fora em silêncio.
for f in $(ls "$TESTES"/[0-9][0-9]-*.sql | grep -v "/0[01]-"); do
  # Uma passagem só: estes testes escrevem, e correr o mesmo ficheiro duas
  # vezes falharia por os dados já lá estarem — não por falta de garantia.
  # O código de saída vem do psql (PIPESTATUS), nunca do grep, que devolve 1
  # sempre que não encontra linhas.
  set +e
  P -d rc_testes -f "$f" 2>&1 | grep -E "^──|ok  ·|FALHA|ERROR" | sed 's/^psql.*NOTICE: *//'
  estado=${PIPESTATUS[0]}
  set -e
  if [ "$estado" != "0" ]; then
    echo "FALHOU: $(basename "$f")" >&2
    falhou=1
  fi
done

if [ "$falhou" = "0" ]; then
  echo ""
  echo "RLS: todas as garantias verificadas."
else
  echo ""
  echo "RLS: há garantias por cumprir." >&2
  exit 1
fi
