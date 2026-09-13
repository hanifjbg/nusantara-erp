#!/usr/bin/env bash
# Fase 0 — backup rutin sebelum tiap migration run (AGENTS.md larangan DROP/TRUNCATE/push --force tanpa dump).
# Pakai Postgres LOKAL (127.0.0.1:5432) sebagai primer. Hasil dump: artifacts/db-backup/*.sql (gitignored via *.sql? dump baseline dikecualikan).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/artifacts/db-backup"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/agent_dev-$STAMP.sql"

# Baca URL dari env (jangan hardcode password di repo).
if [ -f "$ROOT/.env.local" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env.local"
  set +a
fi
DB_URL="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "ERROR: POSTGRES_URL_NON_POOLING/DATABASE_URL kosong. Isi .env.local dulu (lihat .env.example)." >&2
  exit 1
fi

echo "-> pg_dump ke $OUT"
pg_dump "$DB_URL" --format=plain --no-owner --no-privileges --file="$OUT"
echo "OK: $OUT"
