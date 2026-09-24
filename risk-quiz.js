(function () {
  var STYLE_ID = 'rq-styles';
  var overlay = null;
  var state = { step: 0, answers: [], onComplete: null };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.rq-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }',
      '.rq-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius, 14px); padding: 28px; color: var(--text); }',
      '.rq-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }',
      '.rq-header h2 { margin: 0; font-size: 1.2rem; }',
      '.rq-close { background: none; border: none; color: var(--muted); font-size: 1.3rem; cursor: pointer; line-height: 1; }',
      '.rq-close:hover { color: var(--text); }',
      '.rq-progress-text { color: var(--muted); font-size: 0.8rem; margin-bottom: 8px; }',
      '.rq-progress-bar { height: 4px; background: var(--panel-2); border-radius: 4px; overflow: hidden; margin-bottom: 24px; }',
      '.rq-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }',
      '.rq-question { font-size: 1.02rem; line-height: 1.5; margin-bottom: 18px; }',
      '.rq-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }',
      '.rq-option { text-align: left; background: var(--panel-2); border: 2px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: pointer; color: var(--text); font-family: inherit; font-size: 0.9rem; line-height: 1.4; transition: border-color 0.15s ease; }',
      '.rq-option:hover { border-color: var(--accent); }',
      '.rq-option.selected { border-color: var(--accent); background: rgba(79, 140, 255, 0.12); }',
      '.rq-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 20px; }',
      '.rq-btn { border: none; border-radius: 10px; padding: 10px 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; }',
      '.rq-btn:disabled { opacity: 0.4; cursor: not-allowed; }',
      '.rq-btn-primary { background: var(--accent); color: #fff; }',
      '.rq-btn-secondary { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); }',
      '.rq-result { text-align: center; padding: 12px 0; }',
      '.rq-result i { font-size: 2.6rem; color: var(--accent); }',
      '.rq-result h3 { margin: 12px 0 4px; font-size: 1.4rem; }',
      '.rq-result p { color: var(--muted); font-size: 0.9rem; line-height: 1.5; margin: 0 0 20px; }',
      '.rq-result .rq-score { color: var(--muted); font-size: 0.8rem; margin-bottom: 20px; }',
      '.rq-loading { text-align: center; padding: 40px 0; color: var(--muted); }',
      '.rq-error { color: var(--danger); font-size: 0.85rem; margin-bottom: 12px; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'rq-overlay';
    overlay.innerHTML = [
      '<div class="rq-modal" role="dialog" aria-modal="true">',
      '  <div class="rq-header"><h2>Perfil de risco</h2><button class="rq-close" type="button" aria-label="Fechar"><i class="ph ph-x"></i></button></div>',
      '  <div class="rq-content"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    overlay.querySelector('.rq-close').addEventListener('click', closeQuiz);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeQuiz();
    });
  }

  function content() {
    return overlay.querySelector('.rq-content');
  }

  function renderQuestion() {
    var questions = window.RiskQuiz.QUESTIONS;
    var q = questions[state.step];
    var selected = state.answers[state.step];
    var pct = Math.round(((state.step) / questions.length) * 100);

    var optionsHtml = q.options
      .map(function (opt) {
        var cls = 'rq-option' + (selected === opt.points ? ' selected' : '');
        return '<button class="' + cls + '" type="button" data-points="' + opt.points + '">' + opt.letter + ') ' + opt.text + '</button>';
      })
      .join('');

    content().innerHTML = [
      '<div class="rq-progress-text">Pergunta ' + (state.step + 1) + ' de ' + questions.length + '</div>',
      '<div class="rq-progress-bar"><div class="rq-progress-fill" style="width:' + pct + '%"></div></div>',
      '<div class="rq-question">' + q.text + '</div>',
      '<div class="rq-options">' + optionsHtml + '</div>',
      '<div class="rq-footer">',
      '  <button class="rq-btn rq-btn-secondary" id="rqBack" type="button"' + (state.step === 0 ? ' disabled' : '') + '>Voltar</button>',
      '  <button class="rq-btn rq-btn-primary" id="rqNext" type="button"' + (selected === undefined ? ' disabled' : '') + '>' + (state.step === questions.length - 1 ? 'Ver resultado' : 'Próxima') + '</button>',
      '</div>',
    ].join('');

    content().querySelectorAll('.rq-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.answers[state.step] = Number(btn.dataset.points);
        renderQuestion();
      });
    });
    content().querySelector('#rqBack').addEventListener('click', function () {
      if (state.step > 0) {
        state.step -= 1;
        renderQuestion();
      }
    });
    content().querySelector('#rqNext').addEventListener('click', function () {
      if (state.answers[state.step] === undefined) return;
      if (state.step < questions.length - 1) {
        state.step += 1;
        renderQuestion();
      } else {
        submitQuiz();
      }
    });
  }

  function renderLoading() {
    content().innerHTML = '<div class="rq-loading">Calculando seu perfil...</div>';
  }

  function renderError(message) {
    content().innerHTML = [
      '<div class="rq-error">' + message + '</div>',
      '<div class="rq-footer">',
      '  <button class="rq-btn rq-btn-secondary" id="rqRetry" type="button">Tentar novamente</button>',
      '</div>',
    ].join('');
    content().querySelector('#rqRetry').addEventListener('click', submitQuiz);
  }

  function renderResult(result) {
    var perfil = window.RiskQuiz.PERFIS_RISCO[result.perfil];
    content().innerHTML = [
      '<div class="rq-result">',
      '  <i class="ph ' + perfil.icon + '"></i>',
      '  <h3>' + perfil.nome + '</h3>',
      '  <p>' + perfil.descricao + '</p>',
      '  <div class="rq-score">Pontuação: ' + result.pontuacao + '/36</div>',
      '  <button class="rq-btn rq-btn-primary" id="rqDone" type="button">Concluir</button>',
      '</div>',
    ].join('');
    content().querySelector('#rqDone').addEventListener('click', function () {
      var cb = state.onComplete;
      closeQuiz();
      if (cb) cb(result);
    });
  }

  async function submitQuiz() {
    renderLoading();
    try {
      var res = await fetch('/api/perfil-risco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respostas: state.answers }),
      });
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível calcular o perfil.');
      renderResult(data);
    } catch (err) {
      renderError(err.message);
    }
  }

  function closeQuiz() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  window.openRiskQuiz = function (onComplete) {
    state = { step: 0, answers: [], onComplete: onComplete };
    injectStyles();
    buildModal();
    renderQuestion();
  };
})();
