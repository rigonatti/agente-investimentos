require('dotenv').config();

const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
});

app.use(express.json());
app.use(express.static(__dirname));

const PERFIS = {
  conservador: {
    nome: 'Conservador',
    alocacao: '60% Renda Fixa / 40% Renda Variável',
    riscoMaximo: 'Baixo',
    horizonte: '1-3 anos',
    volatilidade: '< 8% a.a.',
  },
  moderado: {
    nome: 'Moderado',
    alocacao: '50% Renda Fixa / 50% Renda Variável',
    riscoMaximo: 'Médio',
    horizonte: '3-5 anos',
    volatilidade: '8-15% a.a.',
  },
  agressivo: {
    nome: 'Agressivo',
    alocacao: '30% Renda Fixa / 70% Renda Variável',
    riscoMaximo: 'Alto',
    horizonte: '5+ anos',
    volatilidade: '> 15% a.a.',
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

function buildPrompt({ perfil, documentos, pergunta, objetivoLabel, userSettings, webSearch }) {
  const documentosBloco = documentos
    ? `\nDOCUMENTOS FORNECIDOS:\n${documentos}\n`
    : '';

  const objetivoBloco = objetivoLabel
    ? `- Objetivo desta análise: ${objetivoLabel}\n`
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

  return `Você é um consultor financeiro especializado em investimentos brasileiros. Analisa contratos, documentos e oportunidades de investimento com base no perfil do investidor.

PERFIL DO INVESTIDOR:
- Tipo: ${perfil.nome}
- Alocação ideal: ${perfil.alocacao}
- Risco máximo: ${perfil.riscoMaximo}
- Horizonte temporal: ${perfil.horizonte}
${objetivoBloco}
BENCHMARKS DE REFERÊNCIA:
- Selic: ${BENCHMARKS.selic}
- IPCA (inflação): ${BENCHMARKS.ipca}
- Ibovespa: ${BENCHMARKS.ibovespa}
- CDI: ${BENCHMARKS.cdi}
- Poupança: ${BENCHMARKS.poupanca}
${documentosBloco}${settingsBloco}${webSearchBloco}
PERGUNTA DO USUÁRIO:
${pergunta}

ANÁLISE SOLICITADA — monte um report de investimentos profissional, no formato usado por consultorias, com estas seções:
1. Resumo executivo: mês de referência (mês/ano atual), cenário macroeconômico brasileiro resumido em 1-2 frases (Selic, inflação, contexto), e o destaque/tese principal desta análise em 1 frase.
2. Avaliação de risco/retorno de cada ativo mencionado, comparando com os benchmarks relevantes.
3. Recomendação clara: Recomendo / Não recomendo / Talvez (com condições).
4. Carteira sugerida em percentuais para este perfil${userSettings?.valorDisponivel ? ' (o investidor informou valor disponível — pode citar valores aproximados em R$ no parecer, além dos percentuais)' : ''}.
5. Pontos de atenção relevantes ao caso (ex: tributação regressiva do IR em renda fixa, limite de garantia do FGC de R$ 250.000 por CPF/instituição, importância de rebalancear a carteira periodicamente, taxas/custos ocultos) — inclua só os que fizerem sentido para a pergunta e os ativos discutidos, sem gerar itens genéricos demais.

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

app.post('/analyze', upload.array('files', 3), async (req, res) => {
  try {
    const { profile, question, objetivo, model, userSettings } = req.body;
    const webSearch = req.body.webSearch === 'true';

    if (!profile || !PERFIS[profile]) {
      return res.status(400).json({ error: 'Perfil inválido. Use: conservador, moderado ou agressivo.' });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Pergunta é obrigatória.' });
    }

    let parsedSettings = {};
    if (userSettings) {
      try {
        parsedSettings = JSON.parse(userSettings);
      } catch (e) {
        parsedSettings = {};
      }
    }

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
      model: MODELOS[model] || MODELOS.sonnet,
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
      return res.status(400).json({ error: 'Máximo de 3 arquivos por análise.' });
    }
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`Agente de Investimentos rodando em http://localhost:${PORT}`);
});
