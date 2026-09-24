require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');
const RiskQuiz = require('./quiz-data.js');

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const AUTH_USERS = (process.env.AUTH_USERS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || '';

if (!AUTH_USERS.length || !AUTH_PASSWORD_HASH) {
  console.warn('Aviso: AUTH_USERS ou AUTH_PASSWORD_HASH não configurados — login ficará indisponível.');
}

const DISPLAY_NAMES = {
  rigonatti: 'Rigonatti',
  taniamielcke: 'Tania',
};

const ADMIN_USERS = (process.env.ADMIN_USERS || 'rigonatti')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-troque-em-producao',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

function requirePageAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

function requireApiAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Não autenticado.' });
}

function isAdmin(username) {
  return ADMIN_USERS.includes(username);
}

function requireAdminAuth(req, res, next) {
  if (req.session && req.session.user && isAdmin(req.session.user)) return next();
  res.status(403).json({ error: 'Acesso restrito a administradores.' });
}

function requireAdminPageAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/login.html');
  if (!isAdmin(req.session.user)) return res.redirect('/index.html');
  next();
}

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }
  const normalizedUser = String(username).trim().toLowerCase();
  if (!AUTH_USERS.includes(normalizedUser) || !AUTH_PASSWORD_HASH) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }
  if (!bcrypt.compareSync(password, AUTH_PASSWORD_HASH)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }
  req.session.user = normalizedUser;
  res.json({ ok: true, username: normalizedUser });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireApiAuth, (req, res) => {
  res.json({
    username: req.session.user,
    displayName: DISPLAY_NAMES[req.session.user] || req.session.user,
    isAdmin: isAdmin(req.session.user),
  });
});

function userDataPath(username) {
  return path.join(DATA_DIR, `${username}.json`);
}

function defaultSettings() {
  return { descricao: '', valorDisponivel: '', objetivos: [], model: 'haiku' };
}

function readUserData(username) {
  const filePath = userDataPath(username);
  if (!fs.existsSync(filePath)) {
    const seeded = {
      settings: defaultSettings(),
      history: SEED_HISTORY[username] ? SEED_HISTORY[username].slice() : [],
    };
    writeUserData(username, seeded);
    return seeded;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return { settings: parsed.settings || {}, history: parsed.history || [] };
  } catch (e) {
    return { settings: defaultSettings(), history: [] };
  }
}

function writeUserData(username, data) {
  fs.writeFileSync(userDataPath(username), JSON.stringify(data, null, 2));
}

const SYSTEM_CONFIG_PATH = path.join(DATA_DIR, '_system.json');

function readSystemConfig() {
  try {
    const raw = fs.readFileSync(SYSTEM_CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeSystemConfig(config) {
  fs.writeFileSync(SYSTEM_CONFIG_PATH, JSON.stringify(config, null, 2));
}

app.get('/api/settings', requireApiAuth, (req, res) => {
  res.json(readUserData(req.session.user).settings);
});

app.put('/api/settings', requireApiAuth, (req, res) => {
  const data = readUserData(req.session.user);
  data.settings = Object.assign({}, data.settings, req.body || {});
  writeUserData(req.session.user, data);
  res.json({ ok: true });
});

app.get('/api/history', requireApiAuth, (req, res) => {
  res.json(readUserData(req.session.user).history);
});

app.delete('/api/history/:id', requireApiAuth, (req, res) => {
  const data = readUserData(req.session.user);
  data.history = data.history.filter((entry) => entry.id !== req.params.id);
  writeUserData(req.session.user, data);
  res.json({ ok: true });
});

app.delete('/api/history', requireApiAuth, (req, res) => {
  const data = readUserData(req.session.user);
  data.history = [];
  writeUserData(req.session.user, data);
  res.json({ ok: true });
});

app.post('/api/perfil-risco', requireApiAuth, (req, res) => {
  try {
    const pontuacao = RiskQuiz.scoreAnswers((req.body || {}).respostas);
    const perfil = RiskQuiz.computeProfile(pontuacao);
    const data = readUserData(req.session.user);
    data.settings = data.settings || defaultSettings();
    data.settings.perfilRisco = { perfil, pontuacao, respondidoEm: new Date().toISOString() };
    writeUserData(req.session.user, data);
    res.json({ perfil, pontuacao });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Respostas inválidas.' });
  }
});

app.get('/api/admin/prompt', requireAdminAuth, (req, res) => {
  const config = readSystemConfig();
  res.json({
    template: config.promptTemplate || DEFAULT_PROMPT_TEMPLATE,
    isDefault: !config.promptTemplate,
    defaultTemplate: DEFAULT_PROMPT_TEMPLATE,
    updatedAt: config.promptUpdatedAt || null,
  });
});

app.put('/api/admin/prompt', requireAdminAuth, (req, res) => {
  const { template } = req.body || {};
  if (!template || !template.trim()) {
    return res.status(400).json({ error: 'O prompt não pode ficar vazio.' });
  }
  const config = readSystemConfig();
  config.promptTemplate = template;
  config.promptUpdatedAt = new Date().toISOString();
  config.promptUpdatedBy = req.session.user;
  writeSystemConfig(config);
  res.json({ ok: true });
});

app.post('/api/admin/prompt/reset', requireAdminAuth, (req, res) => {
  const config = readSystemConfig();
  delete config.promptTemplate;
  delete config.promptUpdatedAt;
  delete config.promptUpdatedBy;
  writeSystemConfig(config);
  res.json({ ok: true, template: DEFAULT_PROMPT_TEMPLATE });
});

app.get('/admin.html', requireAdminPageAuth);
app.get(['/', '/index.html', '/options.html', '/history.html'], requirePageAuth);
app.use(express.static(__dirname));

const PERFIS = {
  protetor: {
    nome: 'Protetor',
    alocacao: '70% Renda Fixa / 30% Renda Variável',
    riscoMaximo: 'Baixo',
    horizonte: '1-3 anos',
    volatilidade: '< 6% a.a.',
  },
  equilibrado: {
    nome: 'Equilibrado',
    alocacao: '50% Renda Fixa / 50% Renda Variável',
    riscoMaximo: 'Médio',
    horizonte: '3-5 anos',
    volatilidade: '6-12% a.a.',
  },
  dinamico: {
    nome: 'Dinâmico',
    alocacao: '30% Renda Fixa / 70% Renda Variável',
    riscoMaximo: 'Médio-Alto',
    horizonte: '5-8 anos',
    volatilidade: '12-20% a.a.',
  },
  visionario: {
    nome: 'Visionário',
    alocacao: '15% Renda Fixa / 85% Renda Variável',
    riscoMaximo: 'Alto',
    horizonte: '8+ anos',
    volatilidade: '> 20% a.a.',
  },
};

const MODELOS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-5',
  opus: 'claude-opus-5-5',
};

const OBJETIVOS = {
  reserva_emergencia: 'Reserva de emergência',
  aposentadoria: 'Aposentadoria',
  compra_imovel: 'Compra de imóvel',
  educacao: 'Educação',
  independencia_financeira: 'Independência financeira',
  viagem: 'Viagem',
  crescimento_patrimonio: 'Crescimento de patrimônio',
  outro: 'Outro',
};

const SEED_HISTORY = {
  rigonatti: [
    {
      id: 'seed-3',
      date: '2026-09-22T18:47:00.000Z',
      profile: 'protetor',
      objetivo: 'reserva_emergencia',
      question: 'Esse CDB de liquidez diária pagando 100% do CDI é uma boa opção para minha reserva de emergência?',
      model: 'haiku',
      parecer:
        'CDB com liquidez diária pagando 100% do CDI (10,4% a.a.) é uma opção sólida para reserva de emergência: risco baixo, protegido pelo FGC e sem perda de rentabilidade em resgates antecipados, compatível com o perfil protetor.\n\nComparado à poupança (7,0% a.a.), o CDB rende significativamente mais pelo mesmo nível de segurança, desde que a instituição emissora esteja dentro do limite de garantia do FGC.\n\nRECOMENDO manter a reserva de emergência integralmente nesse tipo de ativo, sem buscar rentabilidade adicional que comprometa a liquidez.',
      carteira: [
        { ativo: 'CDB Liquidez Diária (100% CDI)', percentual: 80 },
        { ativo: 'Tesouro Selic', percentual: 20 },
      ],
      resumoExecutivo: {
        mesReferencia: 'Setembro de 2026',
        cenarioMacro: 'CDI em 10,4% a.a., patamar elevado que favorece produtos pós-fixados de liquidez diária.',
        destaque: 'Para reserva de emergência, liquidez e segurança superam a busca por rentabilidade extra.',
      },
      pontosAtencao: [
        'Garantia do FGC: limite de R$ 250.000,00 por CPF e por instituição financeira.',
        'Evite CDBs de bancos menores com liquidez diária mas com iliquidez de fato em cenários de estresse.',
        'Reserva de emergência não deve ultrapassar 6 meses de despesas fixas alocadas fora de ativos de risco.',
      ],
      valorDisponivel: '50000',
    },
    {
      id: 'seed-2',
      date: '2026-09-17T09:15:00.000Z',
      profile: 'visionario',
      objetivo: 'crescimento_patrimonio',
      question: 'Faz sentido aumentar a exposição a BDRs de tecnologia americana este mês?',
      model: 'haiku',
      parecer:
        'BDRs de tecnologia oferecem exposição a um mercado com histórico de retorno superior ao Ibovespa em janelas longas, compatível com o horizonte de 8+ anos do perfil visionário.\n\nNo entanto, a volatilidade cambial (BRL/USD) se soma à volatilidade das ações, elevando o risco total acima de 20% a.a. em alguns cenários — dentro do limite do perfil, mas exige estômago para oscilações.\n\nRECOMENDO uma entrada gradual (aportes mensais) em vez de uma posição única, para diluir o risco de timing de mercado e câmbio.',
      carteira: [
        { ativo: 'Ações Blue Chips BR', percentual: 25 },
        { ativo: 'BDRs de Tecnologia', percentual: 25 },
        { ativo: 'Tesouro IPCA+', percentual: 20 },
        { ativo: 'Fundos Multimercado', percentual: 15 },
        { ativo: 'CDB/Renda Fixa', percentual: 15 },
      ],
      resumoExecutivo: {
        mesReferencia: 'Setembro de 2026',
        cenarioMacro: 'Ibovespa acumulando alta de 12,8% em 12 meses; mercado global de tecnologia segue como destaque de crescimento.',
        destaque: 'Exposição internacional gradual é compatível com o perfil visionário e o objetivo de crescimento de patrimônio.',
      },
      pontosAtencao: [
        'BDRs têm tributação de 15% sobre ganho de capital na venda, sem isenção para pequenas alienações.',
        'Risco cambial: valorização do real reduz o retorno em reais mesmo com alta do ativo no exterior.',
        'Evite concentrar mais de 25-30% da carteira em um único setor.',
      ],
      valorDisponivel: '50000',
    },
    {
      id: 'seed-1',
      date: '2026-09-10T14:32:00.000Z',
      profile: 'equilibrado',
      objetivo: 'aposentadoria',
      question: 'Vale a pena investir nesse FII de papel com dividend yield de 6,5% ao ano?',
      model: 'haiku',
      parecer:
        'FII de papel analisado oferece dividend yield de 6,5% a.a., mas a volatilidade de 12% está no teto da tolerância do perfil equilibrado (6-12% a.a.).\n\nComparado ao CDI (10,4% a.a.), o retorno adicional de FIIs não compensa totalmente o risco de crédito dos papéis subjacentes e a marcação a mercado das cotas.\n\nTALVEZ faça sentido uma posição pequena: limite a exposição a 10% da carteira e priorize FIIs com carteira pulverizada e baixa inadimplência.',
      carteira: [
        { ativo: 'Tesouro Selic', percentual: 45 },
        { ativo: 'CDB/Renda Fixa', percentual: 25 },
        { ativo: 'Tesouro IPCA+', percentual: 10 },
        { ativo: 'FIIs', percentual: 10 },
        { ativo: 'Ações Blue Chips', percentual: 10 },
      ],
      resumoExecutivo: {
        mesReferencia: 'Setembro de 2026',
        cenarioMacro: 'Selic em patamar restritivo, com inflação convergindo para a meta ao longo do ano.',
        destaque: 'Renda fixa pós-fixada segue como âncora de estabilidade para o perfil equilibrado.',
      },
      pontosAtencao: [
        'Tributação regressiva do IR na renda fixa: alíquotas caem de 22,5% para 15% após 2 anos.',
        'FIIs têm isenção de IR sobre dividendos para pessoa física, mas ganho de capital na venda das cotas é tributado.',
        'Rebalanceie a carteira a cada 6 meses para manter os percentuais originais.',
      ],
      valorDisponivel: '50000',
    },
  ],
};

const BENCHMARKS = {
  selic: '10.5% a.a.',
  ipca: '4.2% a.a.',
  cdi: '10.4% a.a.',
  ibovespa: '12.8% (últimos 12 meses)',
  poupanca: '7.0% a.a.',
  tesouroSelic: '10.5% a.a.',
};

async function extractText(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  if (ext === 'csv' || ext === 'txt') {
    return file.buffer.toString('utf8');
  }

  return `[Arquivo ${file.originalname}: conteúdo binário não pôde ser extraído automaticamente]`;
}

const DEFAULT_PROMPT_TEMPLATE = `Você é um consultor financeiro especializado em investimentos brasileiros. Analisa contratos, documentos e oportunidades de investimento com base no perfil do investidor.

PERFIL DO INVESTIDOR:
- Tipo: {{PERFIL_NOME}}
- Alocação ideal: {{PERFIL_ALOCACAO}}
- Risco máximo: {{PERFIL_RISCO_MAXIMO}}
- Horizonte temporal: {{PERFIL_HORIZONTE}}
{{OBJETIVO_BLOCO}}{{PERFIL_RISCO_BLOCO}}
BENCHMARKS DE REFERÊNCIA:
- Selic: {{BENCHMARK_SELIC}}
- IPCA (inflação): {{BENCHMARK_IPCA}}
- Ibovespa: {{BENCHMARK_IBOVESPA}}
- CDI: {{BENCHMARK_CDI}}
- Poupança: {{BENCHMARK_POUPANCA}}
{{DOCUMENTOS_BLOCO}}{{CONTEXTO_BLOCO}}{{WEB_SEARCH_BLOCO}}
PERGUNTA DO USUÁRIO:
{{PERGUNTA}}

ANÁLISE SOLICITADA — monte um report de investimentos profissional, no formato usado por consultorias, com estas seções:
1. Resumo executivo: mês de referência (mês/ano atual), cenário macroeconômico brasileiro resumido em 1-2 frases (Selic, inflação, contexto), e o destaque/tese principal desta análise em 1 frase.
2. Avaliação de risco/retorno de cada ativo mencionado, comparando com os benchmarks relevantes.
3. Recomendação clara: Recomendo / Não recomendo / Talvez (com condições).
4. Carteira sugerida em percentuais para este perfil{{VALOR_DISPONIVEL_NOTA}}.
5. Pontos de atenção relevantes ao caso (ex: tributação regressiva do IR em renda fixa, limite de garantia do FGC de R$ 250.000 por CPF/instituição, importância de rebalancear a carteira periodicamente, taxas/custos ocultos) — inclua só os que fizerem sentido para a pergunta e os ativos discutidos, sem gerar itens genéricos demais.
6. Teste de estresse da tese: feche o parecer com 1 frase objetiva sobre o que invalidaria essa recomendação (ex: um evento específico, dado macro ou mudança de cenário) — isso ajuda o investidor a monitorar se a tese continua válida.

CRITÉRIOS:
- RECOMENDO se: retorno > benchmark, risco compatível, taxa < 1.5%, liquidez ok
- NÃO RECOMENDO se: risco incompatível, retorno < benchmark 2+ anos, taxa > 2%, falta transparência
- TALVEZ se: depende de condições específicas

IMPORTANTE: Seja direto, concreto, sem enrolar. Use números e benchmarks. Se não souber, indique claramente.

Responda SOMENTE com um JSON válido, sem texto adicional antes ou depois, no formato exato:
{
  "resumoExecutivo": {
    "mesReferencia": "ex: Setembro de 2026",
    "cenarioMacro": "1-2 frases sobre Selic/inflação/contexto atual",
    "destaque": "1 frase com a tese principal desta análise"
  },
  "parecer": "texto do parecer detalhado (avaliação de risco/retorno e recomendação)",
  "carteira": [
    { "ativo": "nome do ativo", "percentual": numero }
  ],
  "pontosAtencao": ["ponto de atenção 1", "ponto de atenção 2"]
}`;

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

function getPromptTemplate() {
  const config = readSystemConfig();
  return config.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
}

function buildPrompt({ perfil, documentos, pergunta, objetivoLabel, userSettings, webSearch }) {
  const documentosBloco = documentos
    ? `\nDOCUMENTOS FORNECIDOS:\n${documentos}\n`
    : '';

  const objetivoBloco = objetivoLabel
    ? `- Objetivo desta análise: ${objetivoLabel}\n`
    : '';

  const perfilRiscoBloco = userSettings?.perfilRisco
    ? `- Perfil de risco (questionário respondido): ${RiskQuiz.PERFIS_RISCO[userSettings.perfilRisco.perfil]?.nome || userSettings.perfilRisco.perfil} (pontuação ${userSettings.perfilRisco.pontuacao}/36)\n`
    : '';

  const settingsPartes = [];
  if (userSettings?.descricao) {
    settingsPartes.push(`- Descrição do investidor: ${userSettings.descricao}`);
  }
  if (userSettings?.valorDisponivel) {
    settingsPartes.push(`- Valor disponível para investimento: R$ ${userSettings.valorDisponivel}`);
  }
  if (userSettings?.objetivos?.length) {
    const nomes = userSettings.objetivos.map((o) => OBJETIVOS[o] || o).join(', ');
    settingsPartes.push(`- Objetivos principais do investidor: ${nomes}`);
  }
  const settingsBloco = settingsPartes.length
    ? `\nCONTEXTO ADICIONAL DO INVESTIDOR (informado nas Opções):\n${settingsPartes.join('\n')}\nLeve essas informações em conta na análise e na composição da carteira sugerida — por exemplo, ajuste a recomendação aos objetivos e, se houver valor disponível informado, você pode referenciar valores aproximados em R$ além dos percentuais.\n`
    : '\nO investidor não preencheu o contexto adicional (descrição, valor disponível ou objetivos) nas Opções. Baseie a análise apenas no perfil selecionado e na pergunta abaixo.\n';

  const webSearchBloco = webSearch
    ? '\nVocê tem acesso a busca na web: use-a para checar dados de mercado atualizados (taxas, cotações, notícias relevantes) quando necessário para a análise.\n'
    : '';

  const valorDisponivelNota = userSettings?.valorDisponivel
    ? ' (o investidor informou valor disponível — pode citar valores aproximados em R$ no parecer, além dos percentuais)'
    : '';

  return fillTemplate(getPromptTemplate(), {
    PERFIL_NOME: perfil.nome,
    PERFIL_ALOCACAO: perfil.alocacao,
    PERFIL_RISCO_MAXIMO: perfil.riscoMaximo,
    PERFIL_HORIZONTE: perfil.horizonte,
    OBJETIVO_BLOCO: objetivoBloco,
    PERFIL_RISCO_BLOCO: perfilRiscoBloco,
    BENCHMARK_SELIC: BENCHMARKS.selic,
    BENCHMARK_IPCA: BENCHMARKS.ipca,
    BENCHMARK_IBOVESPA: BENCHMARKS.ibovespa,
    BENCHMARK_CDI: BENCHMARKS.cdi,
    BENCHMARK_POUPANCA: BENCHMARKS.poupanca,
    DOCUMENTOS_BLOCO: documentosBloco,
    CONTEXTO_BLOCO: settingsBloco,
    WEB_SEARCH_BLOCO: webSearchBloco,
    PERGUNTA: pergunta,
    VALOR_DISPONIVEL_NOTA: valorDisponivelNota,
  });
}

function parseClaudeResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta do Claude não contém JSON válido');
  }
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.parecer || !Array.isArray(parsed.carteira)) {
    throw new Error('Resposta do Claude não segue o formato esperado');
  }
  if (!Array.isArray(parsed.pontosAtencao)) parsed.pontosAtencao = [];
  if (!parsed.resumoExecutivo || typeof parsed.resumoExecutivo !== 'object') parsed.resumoExecutivo = null;
  return parsed;
}

app.post('/analyze', requireApiAuth, upload.array('files', 5), async (req, res) => {
  try {
    const { profile, question, objetivo, model } = req.body;
    const webSearch = req.body.webSearch === 'true';

    if (!profile || !PERFIS[profile]) {
      return res.status(400).json({ error: 'Perfil inválido. Use: protetor, equilibrado, dinamico ou visionario.' });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Pergunta é obrigatória.' });
    }

    const storedData = readUserData(req.session.user);
    const parsedSettings = storedData.settings || {};

    const files = req.files || [];
    const textos = await Promise.all(files.map(extractText));
    const documentos = files
      .map((file, i) => `--- ${file.originalname} ---\n${textos[i]}`)
      .join('\n\n');

    const prompt = buildPrompt({
      perfil: PERFIS[profile],
      documentos: documentos || null,
      pergunta: question,
      objetivoLabel: OBJETIVOS[objetivo] || null,
      userSettings: parsedSettings,
      webSearch,
    });

    const requestParams = {
      model: MODELOS[model] || MODELOS.haiku,
      max_tokens: 2800,
      messages: [{ role: 'user', content: prompt }],
    };

    if (webSearch) {
      requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
    }

    const message = await anthropic.messages.create(requestParams);

    const textResponse = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const resultado = parseClaudeResponse(textResponse);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      date: new Date().toISOString(),
      profile,
      objetivo: objetivo || null,
      question: question.trim(),
      model: model || 'haiku',
      parecer: resultado.parecer,
      carteira: resultado.carteira,
      resumoExecutivo: resultado.resumoExecutivo,
      pontosAtencao: resultado.pontosAtencao,
      valorDisponivel: parsedSettings.valorDisponivel || null,
    };
    storedData.history = storedData.history || [];
    storedData.history.unshift(entry);
    if (storedData.history.length > 50) storedData.history = storedData.history.slice(0, 50);
    writeUserData(req.session.user, storedData);

    res.json(resultado);
  } catch (error) {
    console.error('Erro em /analyze:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar análise.' });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo excede o limite de 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Máximo de 5 arquivos por análise.' });
    }
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`Agente de Investimentos rodando em http://localhost:${PORT}`);
});
