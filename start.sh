#!/usr/bin/env bash
# Safe launcher: install, migration, and account provisioning are separate actions.
set -euo pipefail
project_root="$(cd "$(dirname "$0")" && pwd)"
if [ "${NODE_ENV:-development}" = test ] && [ -n "${RUNTIME_PROJECT_SOURCE:-}" ] && [ -d "$RUNTIME_PROJECT_SOURCE" ];then project_root="$RUNTIME_PROJECT_SOURCE";fi
cd "$project_root"
if [ "${NODE_ENV:-development}" != test ] && [ -f .env ];then set -a;. ./.env;set +a;fi
if [ "${NODE_ENV:-development}" = test ];then ORDER_AUDIT_SIGNING_KEY="${JWT_SECRET:-}";export ORDER_AUDIT_SIGNING_KEY;fi
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${ORDER_AUDIT_SIGNING_KEY:?ORDER_AUDIT_SIGNING_KEY is required}"
[ "${#JWT_SECRET}" -ge 32 ] || { echo "JWT_SECRET must be at least 32 characters" >&2; exit 1; }
[ "${#ORDER_AUDIT_SIGNING_KEY}" -ge 32 ] || { echo "ORDER_AUDIT_SIGNING_KEY must be at least 32 characters" >&2; exit 1; }
[[ "${BACKEND_PORT:-}" =~ ^[0-9]+$ ]]&&[ "$BACKEND_PORT" -ge 1024 ]&&[ "$BACKEND_PORT" -le 65535 ]||{ echo "BACKEND_PORT must be an explicit integer between 1024 and 65535" >&2;exit 1; }
[ -d node_modules ] || { echo "Dependencies are missing; run npm ci explicitly" >&2; exit 1; }
lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1&&{ echo "Assigned port $BACKEND_PORT is occupied" >&2;exit 1; }
if [ "${NODE_ENV:-development}" = "production" ]; then exec npm start -- -H 127.0.0.1 -p "$BACKEND_PORT"; fi
exec npm run dev -- -H 127.0.0.1 -p "$BACKEND_PORT"
