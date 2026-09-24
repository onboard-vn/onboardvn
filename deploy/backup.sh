#!/usr/bin/env bash
# Nightly Postgres backup for the Onboard prod stack (see docs/deployment.md).
# Env overrides: REPO_DIR, BACKUP_DIR, SECONDARY_DIR, RCLONE_REMOTE, KEEP.
set -euo pipefail
umask 077

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
SECONDARY_DIR="${SECONDARY_DIR:-}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
KEEP="${KEEP:-14}"
COMPOSE_PROJECT="onboard"
COMPOSE_FILE="$REPO_DIR/compose.prod.yml"
ENV_FILE="$REPO_DIR/.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE, aborting" >&2
  exit 1
fi

postgres_user="$(grep -m1 '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"
postgres_db="$(grep -m1 '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"
postgres_user="${postgres_user:-onboard}"
postgres_db="${postgres_db:-onboard}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
dump_file="$BACKUP_DIR/onboard-${timestamp}.dump"
tmp_file="$dump_file.tmp"

cleanup_tmp() {
  [[ -f "$tmp_file" ]] && rm -f "$tmp_file"
}
trap cleanup_tmp EXIT

docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -Fc -U "$postgres_user" "$postgres_db" >"$tmp_file"

if ! docker compose -p "$COMPOSE_PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore --list <"$tmp_file" >/dev/null 2>&1; then
  echo "dump failed integrity check (pg_restore --list), discarding: $tmp_file" >&2
  exit 1
fi

mv "$tmp_file" "$dump_file"
trap - EXIT
echo "backup written: $dump_file"

if [[ -n "$SECONDARY_DIR" ]]; then
  mkdir -p "$SECONDARY_DIR"
  cp "$dump_file" "$SECONDARY_DIR/"
  echo "copied to secondary dir: $SECONDARY_DIR"
fi

if [[ -n "$RCLONE_REMOTE" ]] && command -v rclone >/dev/null 2>&1; then
  rclone copy "$dump_file" "$RCLONE_REMOTE"
  echo "uploaded via rclone to: $RCLONE_REMOTE"
fi

# Rotate: keep the newest $KEEP dumps in BACKUP_DIR, delete the rest.
mapfile -t all_dumps < <(find "$BACKUP_DIR" -maxdepth 1 -name 'onboard-*.dump' -type f | sort -r)
if ((${#all_dumps[@]} > KEEP)); then
  for f in "${all_dumps[@]:KEEP}"; do
    rm -f "$f"
  done
fi

echo "rotation complete, keeping newest $KEEP backups in $BACKUP_DIR"
