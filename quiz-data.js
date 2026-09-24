(function (root) {
  var QUESTIONS = [
    {
      text: 'Como você avalia a sua disposição para riscos financeiros?',
      options: [
        { letter: 'a', text: 'Assumo riscos muito mais baixos do que a maioria das pessoas', points: 1 },
        { letter: 'b', text: 'Assumo riscos um pouco mais baixos do que a maioria das pessoas', points: 2 },
        { letter: 'c', text: 'Assumo, em média, o mesmo nível de risco que a maioria das pessoas', points: 3 },
        { letter: 'd', text: 'Assumo riscos um pouco mais altos do que a maioria das pessoas', points: 4 },
        { letter: 'e', text: 'Assumo riscos muito mais altos do que a maioria das pessoas', points: 5 },
      ],
    },
    {
      text: 'Se você tivesse de escolher entre mais estabilidade no emprego com um pequeno aumento salarial ou menos segurança no emprego com um grande aumento salarial, o que você escolheria?',
      options: [
        { letter: 'a', text: 'Certamente, mais estabilidade com um pequeno aumento', points: 1 },
        { letter: 'b', text: 'Provavelmente, mais estabilidade com um pequeno aumento', points: 2 },
        { letter: 'c', text: 'Provavelmente, menos estabilidade com um grande aumento', points: 3 },
        { letter: 'd', text: 'Certamente, menos estabilidade com um grande aumento', points: 4 },
      ],
    },
    {
      text: 'Quando você realiza um investimento, o que é mais importante na sua avaliação: obter ganhos ou evitar as possíveis perdas sobre o valor investido?',
      options: [
        { letter: 'a', text: 'Evitar perdas, sempre', points: 1 },
        { letter: 'b', text: 'Evitar perdas, na maior parte das vezes', points: 2 },
        { letter: 'c', text: 'Buscar ganhos, na maior parte das vezes', points: 3 },
        { letter: 'd', text: 'Buscar ganhos, sempre', points: 4 },
      ],
    },
    {
      text: 'Investimentos podem aumentar ou diminuir de valor, e especialistas geralmente dizem que você deveria estar preparado para enfrentar uma turbulência/perda. Em quanto deveria diminuir o valor total de todos seus investimentos para você começar a se sentir desconfortável?',
      options: [
        { letter: 'a', text: 'Qualquer diminuição me deixaria desconfortável', points: 1 },
        { letter: 'b', text: '5%', points: 2 },
        { letter: 'c', text: '10%', points: 3 },
        { letter: 'd', text: '15%', points: 4 },
        { letter: 'e', text: '20%', points: 5 },
        { letter: 'f', text: 'Mais de 20%', points: 6 },
      ],
    },
    {
      text: 'Você realizou um investimento de R$ 100 mil, para um período de um ano, em alguns ativos de sua escolha. Ao final do prazo estipulado, qual das alternativas abaixo satisfaria melhor a sua expectativa em relação a esse investimento?',
      options: [
        { letter: 'a', text: 'Ganhar com certeza R$ 12 mil', points: 1 },
        { letter: 'b', text: '50% de chance de ganhar R$ 30 mil e 50% de chance de preservar o valor aplicado, ou seja, não ganhar nada', points: 2 },
        { letter: 'c', text: '50% de chance de ganhar R$ 50 mil e 50% de chance de perder R$ 12 mil', points: 3 },
        { letter: 'd', text: '50% de chance de ganhar R$ 70 mil e 50% de chance de perder R$ 20 mil', points: 4 },
      ],
    },
    {
      text: 'Considerando apenas três grupos de investimentos: GRUPO 1 – ativos de maior retorno esperado, mas com risco elevado (por exemplo: ações e derivativos); GRUPO 2 – ativos de retorno esperado e risco intermediários (por exemplo, renda fixa e títulos indexados à inflação); GRUPO 3 – ativos de menor retorno esperado e baixo risco (por exemplo: DI e Poupança). Se você tivesse de alocar todos os seus investimentos em uma das carteiras abaixo, qual delas seria a mais adequada ao seu perfil?',
      options: [
        { letter: 'a', text: 'Carteira 1 - Alto Risco/Retorno 0% - Médio Risco/Retorno 0% - Baixo Risco/Retorno 100%', points: 1 },
        { letter: 'b', text: 'Carteira 2 - Alto Risco/Retorno 0% - Médio Risco/Retorno 20% - Baixo Risco/Retorno 80%', points: 2 },
        { letter: 'c', text: 'Carteira 3 - Alto Risco/Retorno 20% - Médio Risco/Retorno 40% - Baixo Risco/Retorno 40%', points: 3 },
        { letter: 'd', text: 'Carteira 4 - Alto Risco/Retorno 70% - Médio Risco/Retorno 30% - Baixo Risco/Retorno 0%', points: 4 },
      ],
    },
    {
      text: 'Investimentos como depósitos bancários e poupança têm risco bastante reduzido, mas em alguns períodos podem apresentar valorização inferior à inflação, perdendo seu valor de compra. Por outro lado, investimentos mais arriscados, como em ações, geralmente possuem um potencial de valorização ao longo do tempo maior que o da inflação, mas podem, no curto prazo, apresentar maior volatilidade e em alguns momentos até perder valor. Levando isso em consideração, o que é mais importante para você?',
      options: [
        { letter: 'a', text: 'Muito mais importante que o valor não caia', points: 1 },
        { letter: 'b', text: 'Um pouco mais importante que o valor não caia', points: 2 },
        { letter: 'c', text: 'Um pouco mais importante que o valor retenha seu poder de compra', points: 3 },
        { letter: 'd', text: 'Muito mais importante que o valor retenha seu poder de compra', points: 4 },
      ],
    },
    {
      text: 'Qual o seu conhecimento/experiência em renda variável?',
      options: [
        { letter: 'a', text: 'Não conheço nada sobre o mercado de ações', points: 1 },
        { letter: 'b', text: 'Conheço muito pouco o mercado de ações e nunca comprei uma ação', points: 2 },
        { letter: 'c', text: 'Acompanho às vezes a bolsa de valores no noticiário, mas ainda não me sinto confortável para realizar esse tipo de operação', points: 3 },
        { letter: 'd', text: 'Acompanho o mercado acionário e já comprei ações mais de uma vez', points: 4 },
        { letter: 'e', text: 'Tenho conhecimentos profundos sobre renda variável, acompanho o mercado e aplico com frequência', points: 5 },
      ],
    },
  ];

  var PERFIS_RISCO = {
    protetor: {
      key: 'protetor',
      nome: 'Protetor',
      min: 8,
      max: 18,
      descricao: 'Prioriza a preservação do capital e busca estabilidade, mesmo que isso signifique retornos menores.',
      icon: 'ph-shield',
    },
    equilibrado: {
      key: 'equilibrado',
      nome: 'Equilibrado',
      min: 19,
      max: 25,
      descricao: 'Busca equilíbrio entre segurança e rentabilidade, aceitando alguma oscilação em troca de retornos melhores.',
      icon: 'ph-scales',
    },
    dinamico: {
      key: 'dinamico',
      nome: 'Dinâmico',
      min: 26,
      max: 32,
      descricao: 'Tolera oscilações maiores em busca de retornos mais expressivos no médio/longo prazo.',
      icon: 'ph-chart-line-up',
    },
    visionario: {
      key: 'visionario',
      nome: 'Visionário',
      min: 33,
      max: 36,
      descricao: 'Prioriza o crescimento de patrimônio no longo prazo e tolera alta volatilidade e risco elevado.',
      icon: 'ph-rocket-launch',
    },
  };

  function computeProfile(pontuacao) {
    var keys = ['protetor', 'equilibrado', 'dinamico', 'visionario'];
    for (var i = 0; i < keys.length; i++) {
      var p = PERFIS_RISCO[keys[i]];
      if (pontuacao >= p.min && pontuacao <= p.max) return p.key;
    }
    return pontuacao < PERFIS_RISCO.protetor.min ? 'protetor' : 'visionario';
  }

  function scoreAnswers(respostas) {
    if (!Array.isArray(respostas) || respostas.length !== QUESTIONS.length) {
      throw new Error('Número de respostas inválido.');
    }
    var total = 0;
    for (var i = 0; i < QUESTIONS.length; i++) {
      var pontos = respostas[i];
      var valido = QUESTIONS[i].options.some(function (opt) { return opt.points === pontos; });
      if (!valido) throw new Error('Resposta inválida na pergunta ' + (i + 1) + '.');
      total += pontos;
    }
    return total;
  }

  var RiskQuiz = {
    QUESTIONS: QUESTIONS,
    PERFIS_RISCO: PERFIS_RISCO,
    computeProfile: computeProfile,
    scoreAnswers: scoreAnswers,
  };

  root.RiskQuiz = RiskQuiz;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskQuiz;
  }
})(typeof window !== 'undefined' ? window : this);
