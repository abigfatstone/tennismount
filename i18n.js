/* Runs synchronously after the static DOM, before main.js. No HTML is replaced:
 * text-node bindings preserve controls, inline markup, code and event listeners.
 */
(() => {
  'use strict';
  const locales = Object.freeze({ en: 'en', zh: 'zh-CN', ja: 'ja', ko: 'ko', es: 'es' });
  const storageKey = 'tm.language';
  const clean = value => value.trim().replace(/\s+/g, ' ');
  const normalize = value => {
    const aliases = { 'zh-cn': 'zh', 'zh-hans': 'zh', 'en-us': 'en', 'en-gb': 'en', 'ja-jp': 'ja', 'ko-kr': 'ko', 'es-es': 'es' };
    const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return Object.hasOwn(locales, code) ? code : Object.hasOwn(aliases, code) ? aliases[code] : null;
  };
  const messages = Object.fromEntries(Object.keys(locales).map(lang => [lang, Object.create(null)]));
  const lookup = new Map();
  const rows = window.TM_STATIC_TRANSLATIONS || [];
  (window.TM_STATIC_ENGLISH || []).forEach((source, number) => {
    const key = `static.${number}`;
    lookup.set(clean(source), key);
    messages.en[key] = source;
    ['zh', 'ja', 'ko', 'es'].forEach((lang, index) => {
      messages[lang][key] = rows[number]?.[index]?.trim() || source;
    });
  });
  (window.TM_STATIC_EXTRA || []).forEach(([source, ...translations], number) => {
    const key = `label.${number}`;
    lookup.set(clean(source), key);
    messages.en[key] = source;
    ['zh', 'ja', 'ko', 'es'].forEach((lang, index) => {
      messages[lang][key] = translations[index]?.trim() || source;
    });
  });
  const bindings = [];
  const bindText = node => {
    const source = node.data;
    const key = lookup.get(clean(source));
    if (!key) return;
    const prefix = source.match(/^\s*/)[0];
    const suffix = source.match(/\s*$/)[0];
    bindings.push({ key, apply(value) { node.data = prefix + value + suffix; } });
  };
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement.closest('script, style, noscript, #languageSelect')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) bindText(walker.currentNode);
  document.querySelectorAll('[aria-label], [alt], meta[content]').forEach(element => {
    ['aria-label', 'alt', 'content'].forEach(attribute => {
      const source = element.getAttribute(attribute);
      const key = source && lookup.get(clean(source));
      if (key) bindings.push({ key, apply(value) { element.setAttribute(attribute, value); } });
    });
  });
  let lang = 'en';
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch (_) { /* Private mode may block storage. */ }
  lang = normalize(new URLSearchParams(location.search).get('lang')) || normalize(saved) || 'en';
  const t = (key, fallback) => messages[lang][key] ?? messages.en[key] ?? fallback ?? key;
  function apply() {
    document.documentElement.lang = locales[lang];
    bindings.forEach(binding => binding.apply(t(binding.key)));
    document.querySelectorAll('.glitch[data-text]').forEach(el => { el.dataset.text = el.textContent; });
    document.getElementById('languageSelect').value = lang;
  }
  function setLanguage(value) {
    const next = normalize(value);
    if (!next) return lang;
    lang = next;
    try { localStorage.setItem(storageKey, lang); } catch (_) { /* Switching works without persistence. */ }
    apply();
    window.dispatchEvent(new CustomEvent('tm:languagechange', { detail: { lang } }));
    return lang;
  }
  Object.values(messages).forEach(Object.freeze);
  Object.freeze(messages);
  window.TM_I18N = Object.freeze({ get lang() { return lang; }, t, setLanguage,
    messages, get bindingCount() { return bindings.length; } });
  document.getElementById('languageSelect').addEventListener('change', event => setLanguage(event.target.value));
  try { localStorage.setItem(storageKey, lang); } catch (_) { /* Optional persistence. */ }
  apply();
})();
