# Agente de Investimentos

Agente consultor de investimentos que analisa contratos, ativos e sugere carteiras com base no perfil do investidor (conservador, moderado, agressivo), usando a Claude API.

## Funcionalidades

- Seleção de perfil de investidor com alocação, risco e horizonte de referência
- Objetivo da análise (reserva de emergência, aposentadoria, compra de imóvel etc.)
- Upload de até 3 arquivos (PDF, CSV, XLSX) via drag-and-drop
- Pergunta aberta sobre os ativos/documentos enviados
- Busca na web opcional (o agente pode pesquisar dados de mercado atualizados)
- Parecer detalhado + carteira sugerida em percentuais, comparando com benchmarks (Selic, CDI, IPCA, Ibovespa, Poupança)
- Tela de opções: descrição do perfil, valor disponível para investimento, objetivos principais e escolha do modelo Claude (Haiku, Sonnet, Opus) — tudo opcional, usado como contexto adicional quando preenchido
- Histórico de análises realizadas, com data e detalhe formatado de cada parecer
- Modo claro/escuro em todo o sistema

## Instalação — Mac

```bash
cd /Users/rigonatti/MyGitHubProjects/agente-investimentos
npm install
cp .env.example .env
```

Edite o `.env` e informe sua chave da Claude API:

```
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
PORT=3000
```

```bash
npm start
```

Acesse `http://localhost:3000` no navegador.

## Instalação — Raspberry Pi 5 (SSH)

```bash
ssh user@seu-pi5-ip

sudo apt-get update
sudo apt-get install nodejs npm

git clone git@github.com:seu-usuario/agente-investimentos.git
cd agente-investimentos
npm install
cp .env.example .env
# edite o .env com ANTHROPIC_API_KEY

npm start
```

Acesse `http://seu-pi5-ip:3000` no navegador.

## Como usar

1. Selecione o perfil de investidor
2. (Opcional) Envie até 3 arquivos PDF/CSV/XLSX (até 10MB cada)
3. Digite sua pergunta
4. Clique em "Analisar"
5. Veja o parecer e a carteira sugerida

## Estrutura de arquivos

```
agente-investimentos/
├── index.html       # Página principal (perfil, objetivo, pergunta, análise)
├── options.html      # Tela de opções (perfil do investidor, valor, objetivos, modelo)
├── history.html       # Histórico de análises realizadas
├── theme.js          # Modo claro/escuro compartilhado entre as páginas
├── format.js         # Histórico (localStorage) e formatação do parecer
├── favicon.svg        # Ícone do site
├── server.js         # Backend Express + Claude API
├── package.json      # Dependências
├── .env               # Variáveis de ambiente (não versionado)
├── .env.example       # Template de variáveis de ambiente
├── .gitignore
└── README.md
```

## Variáveis de ambiente

| Variável             | Descrição                          |
|-----------------------|-------------------------------------|
| `ANTHROPIC_API_KEY`   | Chave da Claude API (console.anthropic.com) |
| `PORT`                | Porta do servidor (padrão: 3000)    |

## Requisitos técnicos

- Node.js 16+
- npm 7+
- Chave Claude API válida

## Limitações

- Máximo de 3 arquivos por análise, 10MB cada
- Resposta limitada a 2000 tokens
- Benchmarks estáticos, sem busca na web
- Sem persistência de análises em banco de dados
- Recomendações são educacionais e não substituem consultoria financeira profissional
