#!/bin/sh
# Vercel: sair com 0 pula o deploy; sair com 1 faz o deploy.
# Pula só quando o último commit mexeu apenas em dados (data/, uploads/, media/).
git rev-parse -q --verify HEAD^ >/dev/null 2>&1 || exit 1
if git diff --quiet HEAD^ HEAD -- . ':(exclude)data' ':(exclude)uploads' ':(exclude)media'; then
  exit 0
fi
exit 1
