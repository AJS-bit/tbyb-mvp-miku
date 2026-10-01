#!/bin/sh
# 웹(web/out)과 앱(pwa/dist/app, TETO PWA)을 하나로 묶어 GitHub Pages(gh-pages 브랜치)에 올린다.
#   https://<owner>.github.io/tbyb-mvp-miku/             ← 웹
#   https://<owner>.github.io/tbyb-mvp-miku/app/         ← 앱 (PWA, 상대경로라 basePath 무관)
#   https://<owner>.github.io/tbyb-mvp-miku/app/studio/  ← 운영
# Expo 앱(app/)은 2026-10-01 통일 결정으로 배포에서 뺐다(코드는 보존).
# 사용: scripts/deploy-pages.sh <github-owner>/tbyb-mvp-miku
#       DRY_RUN=1 scripts/deploy-pages.sh <owner>/<repo>   ← 묶음만 만들고 올리지 않음
set -e
REPO="${1:?usage: deploy-pages.sh <owner>/<repo>}"
BASE="/$(basename "$REPO")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"

sh "$ROOT/scripts/sync-domain.sh" --check

(cd "$ROOT/web" && PAGES_BASE_PATH="$BASE" npm run build)
cp -R "$ROOT/web/out/." "$OUT/"

(cd "$ROOT/pwa" && npm run build)
mkdir -p "$OUT/app"
cp -R "$ROOT/pwa/dist/app/." "$OUT/app/"

touch "$OUT/.nojekyll" # _next 폴더를 Jekyll 이 숨기지 않게

if [ -n "$DRY_RUN" ]; then echo "dry run: bundle at $OUT"; exit 0; fi

cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "deploy: $(git -C "$ROOT" rev-parse --short HEAD)"
git -c credential.helper='!gh auth git-credential' push -f "https://github.com/$REPO.git" gh-pages
echo "deployed from $OUT"
