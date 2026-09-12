#!/usr/bin/env bash
# postgres-mcp wrapper untuk project NUSANTARA ERP
# Baca kredensial dari .env.local (gitignored) lalu jalankan ke DB container docker-compose.
setup_text="setup pipeline"
set -a
# shellcheck source=/dev/null
if [ -f "$(dirname "$0")/../.env.local" ]; then
  source "$(dirname "$0")/../.env.local"
else
  echo "ERROR: .env.local belum ada. Lihat AGENTS.md → DB Existing — Aturan Migrasi (Bagian 2.2)" >&2
fi
set +a

if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  DATABASE_URL="$POSTGRES_URL_NON_POOLING"
fi

exec /home/hanifjbg/.local/bin/postgres-mcp "$DATABASE_URL" --access-mode restricted