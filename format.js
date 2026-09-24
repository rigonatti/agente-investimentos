(function () {
  var HISTORICO_KEY = 'agenteInvestimentos.historico';
  var MAX_HISTORICO = 50;

  var PERFIL_LABELS = {
    conservador: 'Conservador',
    moderado: 'Moderado',
    agressivo: 'Agressivo',
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

  function getHistory() {
    try {
      var raw = localStorage.getItem(HISTORICO_KEY);
      var lista = raw ? JSON.parse(raw) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistoryEntry(entry) {
    var historico = getHistory();
    historico.unshift(entry);
    if (historico.length > MAX_HISTORICO) historico = historico.slice(0, MAX_HISTORICO);
    try { localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico)); } catch (e) {}
  }

  function deleteHistoryEntry(id) {
    var historico = getHistory().filter(function (item) { return item.id !== id; });
    try { localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico)); } catch (e) {}
  }

  function clearHistory() {
    try { localStorage.removeItem(HISTORICO_KEY); } catch (e) {}
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
    getHistory: getHistory,
    saveHistoryEntry: saveHistoryEntry,
    deleteHistoryEntry: deleteHistoryEntry,
    clearHistory: clearHistory,
    formatDate: formatDate,
    formatCurrency: formatCurrency,
    escapeHtml: escapeHtml,
    renderParecerHtml: renderParecerHtml,
    renderCarteiraHtml: renderCarteiraHtml,
    renderPontosAtencaoHtml: renderPontosAtencaoHtml,
    PERFIL_LABELS: PERFIL_LABELS,
    OBJETIVO_LABELS: OBJETIVO_LABELS,
  };
})();
