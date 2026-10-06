#!/usr/bin/env bash
# deploy.sh: publica Agente de Investimentos no servidor Hostinger (179.236.251.128) e envia o código ao GitHub.
#
# Uso: ./deploy.sh [--no-push] [--yes] [--dry-run]
#   --no-push  não envia ao GitHub (só publica no servidor)
#   --yes      não pergunta quando há alterações não commitadas
#   --dry-run  só mostra o que seria feito, sem executar nada
#
# Variável opcional: DEPLOY_SERVER (padrão deploy@179.236.251.128)
set -euo pipefail

SERVER="${DEPLOY_SERVER:-deploy@179.236.251.128}"
cd "$(dirname "${BASH_SOURCE[0]}")"
PUSH=1; ASSUME_YES=0; DRY=0
for arg in "$@"; do
  case "$arg" in
    --no-push) PUSH=0 ;;
    --yes) ASSUME_YES=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "Opção desconhecida: $arg (use --help)"; exit 2 ;;
  esac
done

say()    { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
warn()   { printf '\033[33m! %s\033[0m\n' "$*"; }
run()    { if [[ $DRY -eq 1 ]]; then printf '  [dry-run] %s\n' "$*"; else "$@"; fi; }
remote() { run ssh "$SERVER" "$@"; }
sync()   { run rsync -a --delete "$@"; }

# ---------- 1. Git: alerta sobre o que ficou de fora e envia ao GitHub ----------
git_step() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then warn "Pasta fora de um repositório Git: nada será enviado ao GitHub."; return; fi
  say "Git ($(git rev-parse --abbrev-ref HEAD))"
  local pendentes; pendentes="$(git status --short | grep -v '\.DS_Store' || true)"
  if [[ -n "$pendentes" ]]; then
    warn "Há alterações NÃO commitadas (elas vão para o servidor, mas não para o GitHub):"
    echo "$pendentes" | head -15 | sed 's/^/    /'
    [[ $(echo "$pendentes" | wc -l) -gt 15 ]] && echo "    ..."
    if [[ $ASSUME_YES -ne 1 && $DRY -ne 1 ]]; then
      [[ -t 0 ]] || { echo "Sem terminal interativo: use --yes para continuar."; exit 1; }
      read -r -p "Continuar mesmo assim? [s/N] " r; [[ "$r" =~ ^[sSyY]$ ]] || { echo "Cancelado."; exit 1; }
    fi
  fi
  [[ $PUSH -eq 1 ]] || { warn "--no-push: o GitHub não será atualizado."; return; }
  if ! git remote get-url origin >/dev/null 2>&1; then warn "Sem remoto 'origin': nada a enviar."; return; fi
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    local ahead; ahead="$(git rev-list --count '@{u}..HEAD')"
    if [[ "$ahead" -gt 0 ]]; then run git push; else echo "  GitHub já está em dia."; fi
  else
    run git push -u origin HEAD
  fi
}

# ---------- 3. Teste de saúde: "URL|códigos aceitos" ----------
check() {
  local url="${1%%|*}" ok="${1##*|}" code="" i
  if [[ $DRY -eq 1 ]]; then echo "  [dry-run] testar $url (aceita: $ok)"; return 0; fi
  for i in 1 2 3 4 5 6; do
    code="$(curl -4 -s -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)"
    [[ " $ok " == *" $code "* ]] && { echo "  ✓ $url → $code"; return 0; }
    sleep 4
  done
  echo "  ✗ $url → $code (esperado: $ok)"; return 1
}

publish() {
  say "Enviando o código (sem node_modules, data/ e .env)"
  sync --exclude node_modules --exclude data --exclude .git --exclude '.env*' \
       --exclude backup-render --exclude .DS_Store --exclude render.yaml ./ "$SERVER:/srv/apps/agente/src/"
  say "Build e reinício do container"
  remote "cd /srv/apps/agente && chmod -R u=rwX,go=rX src && docker compose build && docker compose up -d"
}
HEALTH=("https://agente.rigonatti.com/login.html|200")

git_step
publish
say "Testando no ar"
falhou=0
for h in "${HEALTH[@]}"; do check "$h" || falhou=1; done
if [[ $falhou -eq 1 ]]; then
  warn "Publicado, mas o teste de saúde falhou. Veja os logs: ssh $SERVER 'cd /srv/apps/agente && docker compose logs --tail 50'"
  exit 1
fi
say "Pronto."
