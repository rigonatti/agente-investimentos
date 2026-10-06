# Agente de Investimentos

Consultor de investimentos com Claude (Node 20, Express, SDK da Anthropic). Login por usuário e senha.

## Onde roda
- URL: https://agente.rigonatti.com (e https://investimento.rigonatti.com, que redireciona para ele)
- Servidor: container `agente` em `/srv/apps/agente` (src/, data/, compose.yml, .env)
- Dados por usuário (opções, perfil de risco, histórico): JSON em `/srv/apps/agente/data` (volume persistente)
- Repositório: github.com/rigonatti/agente-investimentos (via SSH)
- Documentação geral: painel https://rigoapps.tech (card do app → Documentação). Arquivos de infraestrutura (compose, Caddyfile, scripts): `/Users/rigonatti/Projetos/infra-hostinger`
- Servidor Hostinger: `ssh deploy@179.236.251.128` (acesso por chave). Visão geral dos projetos: `/Users/rigonatti/Projetos/CLAUDE.md`

## Fluxo de trabalho: GitHub + servidor
Toda alteração que deva valer em produção segue este caminho:
1. Alterar e testar localmente.
2. Commit só dos arquivos da tarefa (`git add <arquivos>`, mensagem clara em português, terminando com a linha `Co-Authored-By` indicada pela sessão).
3. Rodar `./deploy.sh`: envia ao GitHub (`push`), publica no servidor e testa a URL. Opções: `--no-push`, `--yes`, `--dry-run`.

Combinados:
- Antes de commitar, dar `push` ou publicar, confirme com o usuário se ele ainda não autorizou nesta sessão. Ao terminar uma tarefa, diga o que falta (commit / deploy) ou ofereça fazer.
- O script avisa sobre alterações não commitadas; elas vão ao servidor mas não ao GitHub. Não ignore o aviso.
- Se o deploy falhar, não repita em loop: leia a saída e os logs (`ssh deploy@179.236.251.128 'cd /srv/apps/agente && docker compose logs --tail 50'`).

## Segredos
- `/srv/apps/agente/.env` (ANTHROPIC_API_KEY, SESSION_SECRET, AUTH_PASSWORD_HASH, AUTH_USERS=rigonatti,taniamielcke, ADMIN_USERS=rigonatti). Para regravar: `ssh -t deploy@179.236.251.128 /srv/apps/agente/set-env.sh` (pede cada valor de forma oculta).
- Nunca commite `.env`, chaves ou senhas, e nunca peça que o usuário cole segredos no chat: use um prompt oculto no terminal dele (`ssh -t deploy@179.236.251.128 'read -rsp ...'`).

## Particularidades
- O app saiu do Render: **`git push` não publica mais**. Use `./deploy.sh`. O serviço antigo do Render deve ficar suspenso e depois ser apagado (não fazer deploy lá).
- O deploy nunca envia nem apaga `data/`. A sessão fica em memória: reiniciar o container desloga todos.
- Todos os usuários compartilham o mesmo hash de senha (`AUTH_PASSWORD_HASH`).
