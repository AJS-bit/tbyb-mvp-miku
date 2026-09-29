#!/bin/sh
# 웹(web/out)과 앱 웹 미리보기(app/dist)를 하나로 묶어 GitHub Pages(gh-pages 브랜치)에 올린다.
#   https://<owner>.github.io/tbyb-mvp-miku/      ← 웹
#   https://<owner>.github.io/tbyb-mvp-miku/app/  ← 앱 (Expo 웹 빌드)
# 사용: scripts/deploy-pages.sh <github-owner>/tbyb-mvp-miku
set -e
REPO="${1:?usage: deploy-pages.sh <owner>/<repo>}"
BASE="/$(basename "$REPO")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"

sh "$ROOT/scripts/sync-domain.sh" --check

(cd "$ROOT/web" && PAGES_BASE_PATH="$BASE" npm run build)
cp -R "$ROOT/web/out/." "$OUT/"

(cd "$ROOT/app" && rm -rf dist && EXPO_BASE_URL="$BASE/app" npx expo export --platform web --output-dir dist)
mkdir -p "$OUT/app"
cp -R "$ROOT/app/dist/." "$OUT/app/"

touch "$OUT/.nojekyll" # _next, _expo 폴더를 Jekyll 이 숨기지 않게

cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "deploy: $(git -C "$ROOT" rev-parse --short HEAD)"
git -c credential.helper='!gh auth git-credential' push -f "https://github.com/$REPO.git" gh-pages
echo "deployed from $OUT"
