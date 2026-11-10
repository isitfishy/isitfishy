// Review page for IsItFishy admins. Report data comes from the public, so it is only ever
// put into the page through textContent and form values, never parsed as HTML.
// The page drafts report texts for copying; it never sends anything anywhere itself.
'use strict';

const TOKEN_KEY = 'isitfishy-admin-token';
const LANG_KEY = 'isitfishy-admin-lang';

const TEXT = {
  en: {
    title: 'IsItFishy review',
    otherLang: 'Türkçe',
    logout: 'Sign out',
    tokenLabel: 'Admin token',
    signIn: 'Sign in',
    tokenHint: 'The token is kept in this tab only and is forgotten when you close it.',
    status: 'Status',
    kind: 'Kind',
    any: 'Any',
    refresh: 'Refresh',
    draftHint:
      'The texts below are drafts to copy; nothing is sent from this page.',
    loading: 'Loading…',
    empty: 'Nothing to review.',
    wrongToken: 'Wrong token.',
    disabled: 'The admin API is disabled on this server (ADMIN_TOKEN is not set).',
    tooMany: 'Too many requests. Wait a minute and try again.',
    failed: 'Request failed',
    confirm: 'Confirm scam',
    reject: 'Reject',
    reviewed: 'Saved',
    copy: 'Copy',
    copied: 'Copied',
    usomTitle: 'Report to USOM (usom.gov.tr)',
    shortenerTitle: 'Report to {shortener}',
    shortenerNote:
      'This is a {shortener} short link. Report it to {shortener} as well so they disable it.',
    domainReports: '{n} reports for this domain',
    reportedAt: 'reported {date}',
    score: 'score {score}',
    status_PENDING: 'Pending',
    status_CONFIRMED: 'Confirmed',
    status_REJECTED: 'Rejected',
    kind_SCAM: 'Scam report',
    kind_NOT_SCAM: 'Disputed warning',
    category_CARGO: 'Cargo / delivery',
    category_BANK: 'Bank',
    category_GOVERNMENT: 'Government',
    category_TELECOM: 'Mobile operator',
    category_OTHER: 'Other',
    usomDraft:
      'Hello,\n\nThe link below is used for phishing / fraud. IsItFishy users reported it and a reviewer confirmed it as a scam ({n} reports for this domain so far).\n\nLink: {url}\nHost: {host}\nCategory: {category}\nReported: {date}\n\nPlease consider blocking it.\n\nThank you.',
    shortenerDraft:
      'Hello,\n\nThe short link below redirects to a phishing / fraud page. Please disable it.\n\nShort link: {url}\nReported to IsItFishy: {date}\n\nThank you.',
  },
  tr: {
    title: 'IsItFishy inceleme',
    otherLang: 'English',
    logout: 'Çıkış',
    tokenLabel: 'Yönetici anahtarı',
    signIn: 'Giriş',
    tokenHint: 'Anahtar yalnızca bu sekmede tutulur, sekmeyi kapatınca silinir.',
    status: 'Durum',
    kind: 'Tür',
    any: 'Hepsi',
    refresh: 'Yenile',
    draftHint:
      'Aşağıdaki metinler kopyalamak için hazırlanmış taslaklardır; bu sayfadan hiçbir şey gönderilmez.',
    loading: 'Yükleniyor…',
    empty: 'İncelenecek bildirim yok.',
    wrongToken: 'Anahtar yanlış.',
    disabled: 'Bu sunucuda yönetici API’si kapalı (ADMIN_TOKEN tanımlı değil).',
    tooMany: 'Çok fazla istek. Bir dakika bekleyip tekrar deneyin.',
    failed: 'İstek başarısız',
    confirm: 'Dolandırıcılık olarak onayla',
    reject: 'Reddet',
    reviewed: 'Kaydedildi',
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    usomTitle: 'USOM’a bildir (usom.gov.tr)',
    shortenerTitle: '{shortener} servisine bildir',
    shortenerNote:
      'Bu bir {shortener} kısa bağlantısı. Kapatılması için {shortener} servisine de bildirin.',
    domainReports: 'Bu alan adı için {n} bildirim',
    reportedAt: '{date} tarihinde bildirildi',
    score: 'puan {score}',
    status_PENDING: 'Bekliyor',
    status_CONFIRMED: 'Onaylandı',
    status_REJECTED: 'Reddedildi',
    kind_SCAM: 'Dolandırıcılık bildirimi',
    kind_NOT_SCAM: 'İtiraz edilen uyarı',
    category_CARGO: 'Kargo / teslimat',
    category_BANK: 'Banka',
    category_GOVERNMENT: 'Kamu kurumu',
    category_TELECOM: 'Mobil operatör',
    category_OTHER: 'Diğer',
    usomDraft:
      'Merhaba,\n\nAşağıdaki bağlantı oltalama / dolandırıcılık amacıyla kullanılıyor. IsItFishy kullanıcıları bağlantıyı bildirdi ve inceleme sonucunda dolandırıcılık olduğu doğrulandı (bu alan adı için şu ana kadar {n} bildirim).\n\nBağlantı: {url}\nAlan adı: {host}\nKategori: {category}\nBildirim tarihi: {date}\n\nErişimin engellenmesi için gereğini rica ederim.\n\nTeşekkürler.',
    // Shortener services are international, so the draft for them stays in English.
  },
};

let lang = initialLang();
let token = read(TOKEN_KEY);

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the page then simply asks again after a reload.
  }
}

function initialLang() {
  const saved = read(LANG_KEY);
  if (saved === 'en' || saved === 'tr') return saved;
  return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function t(key, values) {
  const text = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  // One pass, so placeholder-like text inside a reported link is never expanded.
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    values && name in values ? String(values[name]) : match,
  );
}

function $(id) {
  return document.getElementById(id);
}

function el(tag, props, children) {
  const node = document.createElement(tag);
  Object.assign(node, props || {});
  for (const child of children || []) node.append(child);
  return node;
}

function formatDate(value) {
  return new Date(value).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB');
}

function say(text) {
  $('message').textContent = text;
}

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

function explain(err) {
  if (err instanceof HttpError) {
    if (err.status === 401) {
      signOut();
      return t('wrongToken');
    }
    if (err.status === 503) return t('disabled');
    if (err.status === 429) return t('tooMany');
  }
  return `${t('failed')}: ${err.message}`;
}

function fillSelect(select, prefix, values, withAny) {
  const current = select.value;
  select.replaceChildren();
  if (withAny) select.append(el('option', { value: '', textContent: t('any') }));
  for (const value of values) {
    select.append(el('option', { value, textContent: t(`${prefix}_${value}`) }));
  }
  if (current) select.value = current;
}

function renderStatic() {
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const node of document.querySelectorAll('[data-text]')) {
    node.textContent = t(node.dataset.text);
  }
  $('lang').textContent = t('otherLang');
  fillSelect($('status'), 'status', ['PENDING', 'CONFIRMED', 'REJECTED'], true);
  fillSelect($('kind'), 'kind', ['SCAM', 'NOT_SCAM'], true);
  if (!$('status').dataset.ready) {
    $('status').value = 'PENDING';
    $('kind').value = 'SCAM';
    $('status').dataset.ready = '1';
  }
}

function draftBox(title, text) {
  const area = el('textarea', { readOnly: true, value: text, rows: 10 });
  const button = el('button', { type: 'button', textContent: t('copy') });
  button.addEventListener('click', async () => {
    area.select();
    try {
      await navigator.clipboard.writeText(area.value);
      button.textContent = t('copied');
    } catch {
      // Without clipboard access the text is selected for a manual copy.
    }
  });
  return el('details', {}, [el('summary', { textContent: title }), area, button]);
}

function renderReport(report) {
  const values = {
    url: report.url,
    host: report.host,
    n: report.domainReports,
    category: t(`category_${report.category}`),
    date: formatDate(report.createdAt),
    shortener: report.shortener,
  };
  const meta = [
    t(`kind_${report.kind}`),
    t(`category_${report.category}`),
    t(`status_${report.status}`),
    report.score === null ? null : t('score', { score: report.score }),
    t('domainReports', { n: report.domainReports }),
    t('reportedAt', { date: values.date }),
  ].filter(Boolean);

  const item = el('li', {}, [
    el('div', { className: 'url', textContent: report.url }),
    el('div', { className: 'meta', textContent: meta.join(' · ') }),
  ]);

  if (report.kind === 'SCAM') {
    if (report.shortener) {
      item.append(el('p', { className: 'note', textContent: t('shortenerNote', values) }));
      item.append(draftBox(t('shortenerTitle', values), t('shortenerDraft', values)));
    }
    item.append(draftBox(t('usomTitle'), t('usomDraft', values)));
  }

  const status = el('span', { className: 'meta' });
  const buttons = el('div', { className: 'buttons' }, [status]);
  for (const decision of ['CONFIRMED', 'REJECTED']) {
    if (report.status === decision) continue;
    const button = el('button', {
      type: 'button',
      className: decision === 'CONFIRMED' ? 'confirm' : 'reject',
      textContent: t(decision === 'CONFIRMED' ? 'confirm' : 'reject'),
    });
    button.addEventListener('click', () => review(report.id, decision, item, status));
    buttons.insertBefore(button, status);
  }
  item.append(buttons);
  return item;
}

async function review(id, decision, item, status) {
  for (const button of item.querySelectorAll('.buttons button')) button.disabled = true;
  try {
    await api(`/v1/admin/reports/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    status.textContent = `${t('reviewed')}: ${t(`status_${decision}`)}`;
  } catch (err) {
    status.textContent = explain(err);
    for (const button of item.querySelectorAll('.buttons button')) button.disabled = false;
  }
}

async function load() {
  const params = new URLSearchParams({ limit: '100' });
  if ($('status').value) params.set('status', $('status').value);
  if ($('kind').value) params.set('kind', $('kind').value);
  const list = $('reports');
  list.replaceChildren();
  say(t('loading'));
  try {
    const reports = await api(`/v1/admin/reports?${params}`);
    say(reports.length ? '' : t('empty'));
    list.replaceChildren(...reports.map(renderReport));
  } catch (err) {
    say(explain(err));
  }
}

function show() {
  $('login').hidden = Boolean(token);
  $('queue').hidden = !token;
  $('logout').hidden = !token;
  if (token) void load();
}

function signOut() {
  token = null;
  write(TOKEN_KEY, null);
  $('reports').replaceChildren();
  $('login').hidden = false;
  $('queue').hidden = true;
  $('logout').hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
  renderStatic();

  $('login').addEventListener('submit', (event) => {
    event.preventDefault();
    token = $('token').value.trim();
    $('token').value = '';
    if (!token) return;
    write(TOKEN_KEY, token);
    say('');
    show();
  });
  $('logout').addEventListener('click', () => {
    signOut();
    say('');
  });
  $('lang').addEventListener('click', () => {
    lang = lang === 'tr' ? 'en' : 'tr';
    write(LANG_KEY, lang);
    renderStatic();
    if (token) void load();
  });
  $('refresh').addEventListener('click', () => void load());
  $('status').addEventListener('change', () => void load());
  $('kind').addEventListener('change', () => void load());

  show();
});
