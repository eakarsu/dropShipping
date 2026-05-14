#!/usr/bin/env bash
# start.sh — boots dropship-manager against your LOCAL Postgres (no Docker).
#   1) frees the app port if anything is squatting on it
#   2) verifies local Postgres is running and the dropship DB exists
#   3) installs deps if missing
#   4) pushes the Drizzle schema and seeds the database
#   5) starts the Next.js dev server (with HMR — your edits hot-reload)
#
# Usage:
#   ./start.sh              start everything
#   ./start.sh --reset      drop & recreate the dropship database before starting
#   ./start.sh --no-seed    skip seeding (use existing data)
set -euo pipefail

cd "$(dirname "$0")"

# ----- load .env so we read DATABASE_URL etc. -----
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

APP_PORT="${PORT:-3001}"
DB_URL="${DATABASE_URL:-postgresql://$(whoami)@localhost:5432/dropship}"

RESET=0
SKIP_SEED=0
for arg in "$@"; do
  case "$arg" in
    --reset)   RESET=1 ;;
    --no-seed) SKIP_SEED=1 ;;
    *) echo "unknown arg: $arg"; exit 2 ;;
  esac
done

B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; D="\033[2m"; N="\033[0m"
log()  { printf "${B}${G}▸${N} %s\n" "$*"; }
warn() { printf "${B}${Y}!${N} %s\n" "$*"; }
err()  { printf "${B}${R}✗${N} %s\n" "$*" >&2; }

# ----- 1) free the app port -----
free_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    warn "port $port in use by pids: $pids — killing"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.3
  fi
}

log "freeing app port $APP_PORT"
free_port "$APP_PORT"

# ----- 2) verify local Postgres -----
if ! command -v psql >/dev/null 2>&1; then
  err "psql not found. install postgres locally (e.g. 'brew install postgresql@14') and try again."
  exit 1
fi

# Parse host/port out of DATABASE_URL for the readiness check (best effort).
PG_HOST="$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|' )"
PG_PORT="$(echo "$DB_URL" | sed -nE 's|.*@[^:]+:([0-9]+).*|\1|p')"
PG_PORT="${PG_PORT:-5432}"
PG_DB="$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')"

log "checking postgres at $PG_HOST:$PG_PORT"
if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" >/dev/null 2>&1; then
  err "postgres isn't accepting connections at $PG_HOST:$PG_PORT."
  err "start it: 'brew services start postgresql@14'"
  exit 1
fi

if [ "$RESET" = "1" ]; then
  warn "--reset: dropping & recreating database '$PG_DB'"
  dropdb --if-exists "$PG_DB" >/dev/null 2>&1 || true
  createdb "$PG_DB"
fi

# Ensure the dropship database exists.
if ! psql -h "$PG_HOST" -p "$PG_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" 2>/dev/null | grep -q 1; then
  log "creating database '$PG_DB'"
  createdb "$PG_DB"
fi

# ----- 3) ensure node_modules -----
if [ ! -d node_modules ]; then
  log "installing dependencies (first run — takes ~1 minute)"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  else
    npm install
  fi
fi

# ----- 4) push schema + seed -----
log "pushing drizzle schema → postgres"
npx drizzle-kit push --force

if [ "$SKIP_SEED" = "0" ]; then
  log "seeding database (15+ rows per feature)"
  npx tsx src/lib/db/seed.ts
else
  warn "--no-seed: skipping seed step"
fi

# ----- 5) start dev server (HMR handles live reload of your code changes) -----
log "starting Next.js on http://localhost:$APP_PORT"
echo -e "${D}  HMR is on — edits to src/** reload automatically.${N}"
echo -e "${D}  Demo login button is enabled on /login.${N}"
echo
exec npx next dev -p "$APP_PORT"
