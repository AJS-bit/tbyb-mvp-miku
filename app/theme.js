// Runs before styles and body paint, including when the PWA is offline.
// The preference is shared with the website (web/, same origin): key `tbyb-miku-theme`,
// values system | light | dark. The PWA's former key is migrated once: its value is copied
// only when the shared key is absent, and a failed copy is simply retried on the next load.
(() => {
  const key = 'tbyb-miku-theme', legacyKey = 'tbyb-teto-theme';
  const values = ['light', 'dark', 'system'];
  const valid = value => values.includes(value) ? value : 'system';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    let shared = null;
    try { shared = localStorage.getItem(key); }
    catch { return 'system'; }
    if (shared !== null) return valid(shared);
    let legacy = null;
    try { legacy = localStorage.getItem(legacyKey); } catch {}
    if (!values.includes(legacy)) return 'system';
    try { localStorage.setItem(key, legacy); } catch {}
    return legacy;
  };
  let preference = read();
  const labels = {system: '기기 설정', light: '라이트', dark: '다크'};

  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themePreference = preference;
    root.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#16130f' : root.dataset.view === 'app' ? '#faf6ef' : '#faf6ef';
    document.querySelectorAll('[data-theme-picker]').forEach(select => { select.value = preference; });
    document.querySelectorAll('[data-theme-face]').forEach(face => { face.textContent = labels[preference]; });
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
