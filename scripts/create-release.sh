#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI not found. Install GitHub CLI and authenticate first."
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
TAG="${VERSION}"

mkdir -p dist
rm -f dist/*.vsix

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "chore: release ${VERSION}"
fi

if ! UPSTREAM_REF="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)"; then
  echo "Error: No upstream configured for this branch. Set upstream before releasing."
  exit 1
fi

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "${UPSTREAM_REF}")"
if [[ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]]; then
  git push
fi

git fetch --tags origin
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Error: Tag ${TAG} already exists locally."
  exit 1
fi
if git ls-remote --tags origin "refs/tags/${TAG}" | grep -q .; then
  echo "Error: Tag ${TAG} already exists on origin."
  exit 1
fi

npm run build:vsix

if ! ls dist/*.vsix >/dev/null 2>&1; then
  echo "Error: No VSIX files found in dist/. Build failed?"
  exit 1
fi

gh release create "${TAG}" dist/*.vsix \
  --title "v${VERSION}" \
  --notes "Release ${VERSION}"

echo "Release ${TAG} created with VSIX assets."
