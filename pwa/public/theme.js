// Runs before styles and body paint, including when the PWA is offline.
(() => {
  const key = 'tbyb-teto-theme';
  const valid = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try { return valid(localStorage.getItem(key)); }
    catch { return 'system'; }
  };
  let preference = read();

  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#111c17' : location.pathname.startsWith('/app') ? '#faf9f5' : '#fbfbf7';
    document.querySelectorAll('[data-theme-picker]').forEach(select => { select.value = preference; });
  }

  apply();
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if ((event.key === key || event.key === null) && event.storageArea === localStorage) {
      preference = read();
      apply();
    }
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-theme-picker]')) return;
    preference = valid(event.target.value);
    apply();
    try { localStorage.setItem(key, preference); }
    catch {
      window.dispatchEvent(new CustomEvent('theme-storage-error', {
        detail: '이 화면에만 적용했어요. 테마 설정을 저장하지 못했어요.'
      }));
    }
  });
})();
