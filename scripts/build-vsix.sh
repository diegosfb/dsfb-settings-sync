#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

npm run package

mkdir -p dist
VERSION="$(node -p "require('./package.json').version")"
VSIX_NAME="dsfb-settings-sync-${VERSION}.vsix"
npx --no-install vsce package -o "dist/${VSIX_NAME}"

echo "VSIX created at: dist/${VSIX_NAME}"
