#!/bin/sh
# Vercel: sair com 0 pula o deploy; sair com 1 faz o deploy.
# Pula só quando, desde o último deploy, mudaram apenas dados (data/, uploads/, media/).
# Redeploy manual (mesmo commit) sempre faz o deploy, para aplicar variáveis novas.
ANTES="${VERCEL_GIT_PREVIOUS_SHA:-}"
AGORA="$(git rev-parse HEAD 2>/dev/null)"
[ -z "$ANTES" ] && exit 1
[ "$ANTES" = "$AGORA" ] && exit 1
git cat-file -e "$ANTES^{commit}" 2>/dev/null || git fetch -q --depth=50 origin "$ANTES" 2>/dev/null || exit 1
git cat-file -e "$ANTES^{commit}" 2>/dev/null || exit 1
if git diff --quiet "$ANTES" HEAD -- . ':(exclude)data' ':(exclude)uploads' ':(exclude)media'; then
  exit 0
fi
exit 1
