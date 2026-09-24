# Agente de Investimentos

Agente consultor de investimentos que analisa contratos, ativos e sugere carteiras com base no perfil de risco do investidor (Protetor, Equilibrado, Dinâmico, Visionário), usando a Claude API.

## Funcionalidades

- Login por usuário e senha, com dados isolados por conta (cada usuário tem seu próprio perfil, opções e histórico) e saudação personalizada ("Oi, Nome")
- Questionário de perfil de risco (8 perguntas, em popup passo a passo): classifica o investidor em Protetor, Equilibrado, Dinâmico ou Visionário. Aparece automaticamente no primeiro acesso do usuário e pode ser refeito a qualquer momento em Opções — apenas o resultado fica salvo, nunca as respostas — e é considerado pela IA nas análises
- Seleção de perfil de investidor com alocação, risco e horizonte de referência (pré-selecionado conforme o resultado do questionário)
- Objetivo da análise (reserva de emergência, aposentadoria, compra de imóvel etc.)
- Upload de até 5 arquivos (PDF, CSV, XLSX) via drag-and-drop
- Pergunta aberta sobre os ativos/documentos enviados
- Busca na web opcional (o agente pode pesquisar dados de mercado atualizados)
- Report estruturado: resumo executivo, parecer detalhado, carteira sugerida em percentuais (e em R$ quando o valor disponível é informado), pontos de atenção (tributação, FGC, rebalanceamento), comparando com benchmarks (Selic, CDI, IPCA, Ibovespa, Poupança)
- Exportação do report como imagem (PNG)
- Tela de opções: descrição do perfil, valor disponível para investimento, objetivos principais e escolha do modelo Claude (Haiku é o padrão; Sonnet e Opus também disponíveis) — tudo opcional, usado como contexto adicional quando preenchido
- Histórico de análises realizadas, com data e detalhe formatado de cada parecer
- Modo claro/escuro em todo o sistema
- Ícones Phosphor em toda a interface (sem emojis)
- Interface responsiva, com menu hamburguer em telas pequenas e botão "Voltar" sempre no canto superior esquerdo
- Painel de administração (em Opções, visível só para usuários em `ADMIN_USERS`): editar, salvar e restaurar o prompt do sistema usado nas análises de todos os usuários

## Instalação — Mac

```bash
cd /Users/rigonatti/MyGitHubProjects/agente-investimentos
npm install
cp .env.example .env
```

Edite o `.env`:

```
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
PORT=3000
SESSION_SECRET=um-valor-aleatorio-longo
AUTH_USERS=rigonatti,taniamielcke
AUTH_PASSWORD_HASH=hash-bcrypt-da-senha
```

Gere o `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Gere o `AUTH_PASSWORD_HASH` (hash bcrypt da senha compartilhada pelos usuários):

```bash
node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_AQUI', 10))"
```

```bash
npm start
```

Acesse `http://localhost:3000` no navegador — você será redirecionado para a tela de login.

## Instalação — Raspberry Pi 5 (SSH)

O `apt` do Raspberry Pi OS costuma trazer uma versão antiga do Node. Instale o Node 20 via NodeSource:

```bash
ssh user@seu-pi5-ip

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # confirme v20.x

git clone git@github.com:rigonatti/agente-investimentos.git
cd agente-investimentos
npm install
cp .env.example .env
nano .env   # preencha ANTHROPIC_API_KEY, SESSION_SECRET, AUTH_USERS, AUTH_PASSWORD_HASH, ADMIN_USERS
```

Gere `SESSION_SECRET` e `AUTH_PASSWORD_HASH` com os comandos da seção de instalação no Mac (mesmos comandos, Node já instalado no Pi).

Teste com `npm start` e confirme em `http://seu-pi5-ip:3000`. Para manter rodando permanentemente e reiniciar sozinho após quedas de energia, use o PM2:

```bash
sudo npm install -g pm2
pm2 start server.js --name agente-investimentos
pm2 save
pm2 startup   # siga a instrução impressa (registra o PM2 como serviço do systemd)
```

Para atualizar depois de um `git push` no Mac:

```bash
cd agente-investimentos
git pull
npm install
pm2 restart agente-investimentos
```

Isso também acontece automaticamente: um webhook do GitHub (via Tailscale Funnel, servido pelo `webhook` já rodando no Pi) dispara esses mesmos passos a cada push na `main`.

## Deploy no Render

O repositório já inclui um `render.yaml` (Blueprint). No painel do Render, ao criar o serviço a partir dele, informe `ANTHROPIC_API_KEY`, `SESSION_SECRET` e `AUTH_PASSWORD_HASH` (o `AUTH_USERS` já vem definido no blueprint).

**Atenção:** no plano free do Render o sistema de arquivos é efêmero — a pasta `data/` (onde ficam opções e histórico de cada usuário) é apagada a cada novo deploy ou reinício do serviço. Para persistência definitiva nesse plano, seria necessário migrar esse armazenamento para um serviço externo (ex: banco de dados gerenciado) ou usar um disco persistente do Render (pago).

## Como usar

1. Faça login com seu usuário e senha
2. Selecione o perfil de investidor
3. (Opcional) Envie até 5 arquivos PDF/CSV/XLSX (até 10MB cada)
4. Digite sua pergunta
5. Clique em "Analisar"
6. Veja o report gerado — pode baixar como imagem ou consultar depois no histórico

## Usuários

`rigonatti` (Rigonatti) e `taniamielcke` (Tania) — compartilham a mesma senha, definida via `AUTH_PASSWORD_HASH`. No primeiro acesso de cada usuário, o servidor cria automaticamente seus dados em `data/<usuario>.json`; para `rigonatti`, esse primeiro acesso já vem com 3 análises de exemplo no histórico.

## Estrutura de arquivos

```
agente-investimentos/
├── login.html         # Tela de login
├── admin.html          # Painel de admin (editar o prompt do sistema) — restrito a ADMIN_USERS
├── index.html         # Página principal (perfil, objetivo, pergunta, análise)
├── options.html        # Tela de opções (perfil do investidor, valor, objetivos, modelo)
├── history.html        # Histórico de análises realizadas
├── theme.js            # Modo claro/escuro compartilhado entre as páginas
├── format.js           # Cliente da API (settings/histórico) e formatação do report
├── quiz-data.js         # Perguntas e pontuação do questionário de perfil de risco (compartilhado front/back)
├── risk-quiz.js         # Popup do questionário de perfil de risco
├── favicon.svg         # Ícone do site
├── server.js           # Backend Express + autenticação + Claude API
├── data/                # Dados por usuário (settings.json/history.json) — não versionado
├── package.json        # Dependências
├── .env                 # Variáveis de ambiente (não versionado)
├── .env.example         # Template de variáveis de ambiente
├── render.yaml          # Blueprint de deploy no Render
├── .gitignore
└── README.md
```

## Variáveis de ambiente

| Variável              | Descrição                                              |
|------------------------|----------------------------------------------------------|
| `ANTHROPIC_API_KEY`    | Chave da Claude API (console.anthropic.com)              |
| `PORT`                 | Porta do servidor (padrão: 3000)                          |
| `SESSION_SECRET`       | Valor aleatório usado para assinar o cookie de sessão      |
| `AUTH_USERS`           | Usuários autorizados, separados por vírgula               |
| `AUTH_PASSWORD_HASH`   | Hash bcrypt da senha compartilhada pelos usuários          |
| `ADMIN_USERS`          | Usuários com acesso ao painel de admin (padrão: `rigonatti`) |

## Requisitos técnicos

- Node.js 16+
- npm 7+
- Chave Claude API válida

## Limitações

- Máximo de 5 arquivos por análise, 10MB cada
- Resposta limitada a 2800 tokens
- Benchmarks estáticos (busca na web é opcional e usa a tool nativa da Claude API)
- Senha compartilhada entre os usuários autorizados (sem senha individual por conta)
- No plano free do Render, os dados de opções/histórico não sobrevivem a um redeploy (filesystem efêmero)
- Recomendações são educacionais e não substituem consultoria financeira profissional
