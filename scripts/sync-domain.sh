#!/bin/sh
# shared/domain.ts 원본을 web·app 으로 복사한다. --check 는 사본이 원본과 같은지만 확인.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shared/domain.ts"
HEADER='// 자동 복사본 — 원본은 shared/domain.ts. 여기서 고치지 말고 scripts/sync-domain.sh 를 실행한다.'
for DEST in "$ROOT/web/src/lib/domain.ts" "$ROOT/app/src/domain.ts"; do
  [ -d "$(dirname "$(dirname "$DEST")")" ] || continue
  TMP="$(mktemp)"
  { echo "$HEADER"; cat "$SRC"; } > "$TMP"
  if [ "$1" = "--check" ]; then
    cmp -s "$TMP" "$DEST" || { echo "out of sync: $DEST"; rm -f "$TMP"; exit 1; }
    rm -f "$TMP"
  else
    mkdir -p "$(dirname "$DEST")"
    mv "$TMP" "$DEST"
    echo "synced: $DEST"
  fi
done
