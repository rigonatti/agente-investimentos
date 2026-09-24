(function () {
  var STORAGE_KEY = 'agenteInvestimentos.theme';

  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  applyTheme(getPreferredTheme());

  window.toggleTheme = function () {
    var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    window.updateThemeToggleIcon();
  };

  window.updateThemeToggleIcon = function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var theme = document.documentElement.getAttribute('data-theme');
    var icon = btn.querySelector('i');
    if (icon) icon.className = theme === 'light' ? 'ph ph-moon' : 'ph ph-sun';
    btn.title = theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro';
  };
})();
