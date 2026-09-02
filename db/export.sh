#!/usr/bin/env bash
# Export only Tiggl schemas. Never dumps Watchlist or BuddyWP.
# Requires SOURCE_DATABASE_URL as a direct or session-mode connection.

set -euo pipefail

APP_SLUG="${APP_SLUG:-tiggl}"
SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"

if [[ "$APP_SLUG" != "tiggl" ]]; then
  echo "This script exports tiggl only." >&2
  exit 1
fi

OUT="${APP_SLUG}.dump"
pg_dump "$SOURCE_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=tiggl \
  --schema=tiggl_auth \
  --file="$OUT"

echo "Wrote $OUT"
echo "Tiggl has no Storage objects. tiggl_auth is unused and must stay empty."
