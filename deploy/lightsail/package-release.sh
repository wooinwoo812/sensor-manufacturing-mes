#!/usr/bin/env bash
set -euo pipefail

archive=${1:?Pass the output archive path}
revision=${GITHUB_SHA:?GITHUB_SHA is required}
[[ $revision =~ ^[0-9a-f]{40}$ ]] || exit 1
test -s apps/web/dist/index.html
test -s apps/api/dist/main.js
test -d apps/api/src/generated/prisma
printf '{"commit":"%s"}\n' "$revision" > apps/web/dist/version.json

# An explicit list prevents environment files, credentials and local DB files
# from entering the deployment artifact.
tar --exclude='.env' --exclude='.env.*' --exclude='*.pem' --exclude='*.key' \
  -czf "$archive" \
  .dockerignore package.json pnpm-lock.yaml pnpm-workspace.yaml \
  deploy/lightsail apps/api/package.json apps/api/dist apps/api/src \
  apps/api/prisma apps/api/prisma.config.ts \
  apps/api/scripts/create-portfolio-demo.mjs apps/web/dist
sha256sum "$archive"
