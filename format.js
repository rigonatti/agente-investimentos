(function () {
  var PERFIL_LABELS = {
    protetor: 'Protetor',
    equilibrado: 'Equilibrado',
    dinamico: 'Dinâmico',
    visionario: 'Visionário',
  };

  var PERFIL_BADGE_CLASS = {
    protetor: 'badge-protetor',
    equilibrado: 'badge-equilibrado',
    dinamico: 'badge-dinamico',
    visionario: 'badge-visionario',
  };

  var OBJETIVO_LABELS = {
    reserva_emergencia: 'Reserva de emergência',
    aposentadoria: 'Aposentadoria',
    compra_imovel: 'Compra de imóvel',
    educacao: 'Educação',
    independencia_financeira: 'Independência financeira',
    viagem: 'Viagem',
    crescimento_patrimonio: 'Crescimento de patrimônio',
    outro: 'Outro',
  };

  async function apiFetch(url, options) {
    var opts = Object.assign({}, options);
    if (!(opts.body instanceof FormData)) {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    }
    var res = await fetch(url, opts);
    if (res.status === 401) {
      window.location.href = '/login.html';
      throw new Error('Sessão expirada.');
    }
    return res;
  }

  async function getMe() {
    var res = await apiFetch('/api/me');
    if (!res.ok) return null;
    return res.json();
  }

  async function logout() {
    await apiFetch('/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }

  async function getSettings() {
    var res = await apiFetch('/api/settings');
    if (!res.ok) return {};
    return res.json();
  }

  async function saveSettings(settings) {
    await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
  }

  async function getHistory() {
    var res = await apiFetch('/api/history');
    if (!res.ok) return [];
    return res.json();
  }

  async function deleteHistoryEntry(id) {
    await apiFetch('/api/history/' + encodeURIComponent(id), { method: 'DELETE' });
  }

  async function clearHistory() {
    await apiFetch('/api/history', { method: 'DELETE' });
  }

  function formatCurrency(value) {
    const n = Number(value);
    if (!isFinite(n)) return null;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(isoString) {
    try {
      var d = new Date(isoString);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return isoString;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderParecerHtml(text) {
    var escaped = escapeHtml(text || '');
    var withBadges = escaped
      .replace(/N[ÃA]O RECOMENDO/gi, '<strong class="verdict verdict-no">NÃO RECOMENDO</strong>')
      .replace(/\bTALVEZ\b/gi, '<strong class="verdict verdict-maybe">TALVEZ</strong>')
      .replace(/\bRECOMENDO\b/gi, '<strong class="verdict verdict-yes">RECOMENDO</strong>');
    var paragraphs = withBadges
      .split(/\n{2,}/)
      .map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; })
      .join('');
    return paragraphs;
  }

  function renderCarteiraHtml(carteira, valorDisponivel) {
    return (carteira || []).map(function (item) {
      var valorBloco = '';
      if (valorDisponivel) {
        var valor = (Number(item.percentual) / 100) * Number(valorDisponivel);
        var formatted = formatCurrency(valor);
        if (formatted) valorBloco = '<div class="valor">' + formatted + '</div>';
      }
      return '<div class="carteira-item"><div class="pct">' + item.percentual + '%</div>' + valorBloco + '<div class="ativo">' + escapeHtml(item.ativo) + '</div></div>';
    }).join('');
  }

  function renderPontosAtencaoHtml(pontos) {
    if (!pontos || !pontos.length) return '';
    var items = pontos.map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; }).join('');
    return '<h3>Pontos de atenção</h3><ul class="pontos-lista">' + items + '</ul>';
  }

  window.AgenteFormat = {
    getMe: getMe,
    logout: logout,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getHistory: getHistory,
    deleteHistoryEntry: deleteHistoryEntry,
    clearHistory: clearHistory,
    formatDate: formatDate,
    formatCurrency: formatCurrency,
    escapeHtml: escapeHtml,
    renderParecerHtml: renderParecerHtml,
    renderCarteiraHtml: renderCarteiraHtml,
    renderPontosAtencaoHtml: renderPontosAtencaoHtml,
    PERFIL_LABELS: PERFIL_LABELS,
    PERFIL_BADGE_CLASS: PERFIL_BADGE_CLASS,
    OBJETIVO_LABELS: OBJETIVO_LABELS,
  };
})();
