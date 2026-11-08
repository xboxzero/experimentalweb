// GH0ST//SEEK — glue: search UI, alternative finder, source bank, synth rack, privacy panel.
import { Synth, PARAMS, SRC_LAYERS, SRC_W, SRC_H } from './synth.js';
import * as S from './search.js';
import { ALTS, findAlts, looksLikeUrl, cleanUrl, reroute, altsForHost } from './alts.js';
import { makeCanvas, paintTag, paintSerp, paintText, paintNoise, fontsReady } from './paint.js';
import { Sound } from './audio.js';

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// tiny DOM builder (textContent only, never innerHTML with remote data)
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  if (tag === 'a') { el.target = '_blank'; el.rel = 'noopener noreferrer nofollow'; el.referrerPolicy = 'no-referrer'; }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const state = { mode: 'all', q: null, lastMode: null, gen: 0, ctrl: null, items: [], images: [], auto: false, derive: null, shotConsent: false, calm: false, autoFeed: true, midi: null, learn: null, ccMap: {} };
const input = $('#q'), results = $('#results'), statusEl = $('#status');
let synth = null;
const sound = new Sound();

// ---------------------------------------------------------------- toast
let toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------------------------------------------------------------- synth boot
const tagCanvas = makeCanvas(), serpCanvas = makeCanvas();
const slotNames = new Array(SRC_LAYERS).fill('');
const previews = [];

function bootSynth() {
  try { synth = new Synth($('#synth')); }
  catch (e) { document.body.classList.add('nogl'); toast('WebGL2 unavailable — synth disabled, search still works', 5000); return; }
  synth.onLoopDone = () => { $('#bLoop').classList.remove('rec'); $('#bLoop').textContent = '● LOOP'; toast('LOOP CAPTURED · ' + synth.loopFrames + ' frames — try TIME SMEAR'); };
}

function buildBank() {
  const bank = $('#bank');
  for (let i = 0; i < SRC_LAYERS; i++) {
    const cv = h('canvas', { width: 128, height: 72 });
    const label = h('span', { class: 'slotName', text: '' });
    const b = h('button', { class: 'slot', 'data-i': i, title: 'click: A · shift/right-click: B' }, h('i', { text: i + 1 }), cv, label);
    b.addEventListener('click', (e) => setLayer(e.shiftKey ? 'layerB' : 'layerA', i));
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); setLayer('layerB', i); });
    bank.append(b);
    previews.push({ b, cv, g: cv.getContext('2d'), label });
  }
}

function drawCover(g, el, w, hgt) {
  const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, hgt / ih);
  try { g.drawImage(el, (w - iw * s) / 2, (hgt - ih * s) / 2, iw * s, ih * s); } catch { /* ignore */ }
}

function updatePreview(i) {
  const p = previews[i]; if (!p || !synth) return;
  const s = synth.sources[i];
  p.label.textContent = slotNames[i] || (s && s.name) || '—';
  p.b.classList.toggle('live', !!(s && s.live));
  if (s && s.kind === 'self') { synth.afterFrame((c) => drawCover(p.g, c, 128, 72)); return; }
  if (s && s.el) drawCover(p.g, s.el, 128, 72);
}

function markAB() {
  if (!synth) return;
  previews.forEach((p, i) => { p.b.classList.toggle('isA', synth.params.layerA === i); p.b.classList.toggle('isB', synth.params.layerB === i); });
}
function setLayer(which, i) { if (!synth) return; synth.params[which] = i; syncSliders(); markAB(); synth.burst(.6); sound.noise(.08); }

let feedCursor = 2;
function feed(el, name, opts = {}) {
  if (!synth) return -1;
  const i = opts.slot != null ? opts.slot : feedCursor;
  if (opts.slot == null) feedCursor = feedCursor >= SRC_LAYERS - 1 ? 2 : feedCursor + 1;
  const ok = synth.setSource(i, el, { name, live: opts.live, stop: opts.stop, kind: opts.kind });
  if (!ok && !opts.live) { if (!opts.quiet) toast('that image refuses to be remixed (no CORS) — try SHOT instead'); return -1; }
  slotNames[i] = name; updatePreview(i);
  if (opts.toB) { synth.params.layerB = i; syncSliders(); markAB(); }
  synth.burst(opts.quiet ? .3 : .9);
  return i;
}

function respray(q, opts = {}) {
  paintTag(tagCanvas, q, opts);
  if (synth) { synth.setSource(0, tagCanvas, { name: 'TAG WALL' }); slotNames[0] = 'TAG WALL'; updatePreview(0); }
}

function seedSources() {
  respray('GH0ST//SEEK');
  paintSerp(serpCanvas, 'nothing yet', [{ host: 'your.own.mind', title: 'Type anything to begin', snippet: 'Results stream in while you type and get cut up live.' }]);
  feed(serpCanvas, 'SERP SHOT', { slot: 1, quiet: true });
  feed(paintNoise(makeCanvas()), 'NOISE', { slot: 2, quiet: true });
  feed(paintText(makeCanvas(), 'ANTI-SURVEILLANCE', [
    'no cookies. no fingerprint scripts. no analytics.', 'no server. no logs. no account. no history.',
    'the referrer is stripped from every request.', 'your query lives in RAM and dies with the tab.',
    '', 'find the alternative. reroute the link.', 'cut the screenshot. loop the frame.', 'melt the feed.', '',
    'THEY TRACK. WE REMIX.'], '#00f0ff'), 'MANIFESTO', { slot: 3, quiet: true });
  feed(paintTag(makeCanvas(), 'NO MASTERS', { font: 'WetPaint' }), 'NO MASTERS', { slot: 4, quiet: true });
  feed(paintNoise(makeCanvas(), 290), 'NOISE', { slot: 5, quiet: true });
  feed(paintTag(makeCanvas(), 'FORGET ME', { font: 'SprayPaint', bg: '#0a1018' }), 'FORGET ME', { slot: 6, quiet: true });
  feed(paintNoise(makeCanvas(), 120), 'NOISE', { slot: 7, quiet: true });
  feedCursor = 2;
}

// ---------------------------------------------------------------- image loading (logged)
function loadImage(url, purpose = 'image', cors = true) {
  return new Promise((res, rej) => {
    const im = new Image();
    if (cors) im.crossOrigin = 'anonymous';
    im.referrerPolicy = 'no-referrer'; im.decoding = 'async';
    im.onload = () => res(im); im.onerror = () => rej(new Error('image failed'));
    try { S.logRequest(new URL(url).hostname, purpose); } catch { /* data/blob */ }
    im.src = url;
  });
}

function shotConsent() {
  if (state.shotConsent) return true;
  state.shotConsent = confirm('SHOT asks the third-party service image.thum.io to screenshot that URL.\nthum.io will see the URL (not your query history, no cookies, no referrer).\n\nAllow screenshots for this session?');
  return state.shotConsent;
}

async function shoot(url, host) {
  if (!shotConsent()) return;
  toast('📸 shooting ' + host + ' … (can take a few seconds)', 6000);
  try {
    const im = await loadImage(S.shotUrl(url), 'screenshot: ' + host);
    const i = feed(im, 'SHOT ' + host, { toB: true });
    if (i >= 0) toast('SHOT fed into slot ' + (i + 1) + ' · CUT IT UP');
  } catch { toast('screenshot failed — the site may block it'); }
}

// ---------------------------------------------------------------- search
let debounceT;
function onType(e) {
  const q = input.value;
  if (synth) {
    let hsh = 0; for (const ch of q) hsh = (hsh * 31 + ch.charCodeAt(0)) % 9973;
    synth.seed = hsh / 99.73; synth.burst(.35);
  }
  requestAnimationFrame(() => respray(q || 'GH0ST//SEEK'));
  if (e && e.data) sound.key(e.data);
  clearTimeout(debounceT);
  debounceT = setTimeout(() => runSearch(false), 320);
}

function submit() {
  const q = input.value.trim();
  const bang = S.parseBang(q);
  if (bang) { window.open(S.engineUrl(bang.engine, bang.q), '_blank', 'noopener,noreferrer'); toast('escaped to ' + bang.engine.name + ' — no referrer sent'); return; }
  respray(q || 'GH0ST//SEEK', { font: ['Sedgwick', 'WetPaint', 'SprayPaint', 'Marker'][randInt(0, 3)] });
  if (synth) { synth.burst(1.6); synth.reseed(); }
  sound.noise(.25);
  runSearch(true);
}

function section(title, cls = '') {
  const s = h('section', { class: 'sec ' + cls }, title ? h('h2', { class: 'secTitle', text: title }) : null);
  const body = h('div', { class: 'secBody' }); s.append(body); results.append(s);
  return body;
}

function setStatus(parts) { statusEl.replaceChildren(...parts.map(p => h('span', { class: 'st ' + (p[1] || ''), text: p[0] }))); }

async function runSearch(force) {
  const q = input.value.trim();
  if (!force && q === state.q && state.mode === state.lastMode) return;
  state.q = q; state.lastMode = state.mode;
  if (state.ctrl) state.ctrl.abort();
  const ctrl = state.ctrl = new AbortController();
  const gen = ++state.gen;
  results.replaceChildren(); state.items = []; state.images = [];
  renderEngineBar(q);
  setStatus(q ? [['searching…', 'priv']] : []);
  const mode = state.mode;
  if (mode === 'engines') return renderEngines(q);
  if (mode === 'me') return renderFingerprint();
  if (mode === 'alt') return renderAltDirectory(q);
  if (!q) { setStatus([]); return renderHome(); }

  const bang = S.parseBang(q);
  if (bang) { const b = section('', 'hint'); b.append(h('div', { class: 'card hintCard' }, h('b', { text: '!' + bang.engine.bang }), ` → press ENTER to jump to ${bang.engine.name} with “${bang.q}” (opens in a new tab, no referrer)`)); }
  const isUrl = looksLikeUrl(q);
  if (isUrl) renderUrlTools(q);

  const alts = findAlts(q).slice(0, 3);
  if (alts.length) { const b = section('ALTERNATIVES — GET OUT OF THERE', 'altsec'); alts.forEach(e => b.append(altCard(e))); }

  const t0 = performance.now();
  const st = [];
  const track = (name, p) => p.then(r => { st.push([name + ' ✓ ' + Math.round(performance.now() - t0) + 'ms', 'ok']); return r; }, e => { if (e.name !== 'AbortError') st.push([name + ' ✗', 'bad']); throw e; }).finally(() => gen === state.gen && setStatus([...st, ['0 cookies · referrer stripped', 'priv']]));
  const keep = () => gen === state.gen;

  if (mode === 'all') {
    const inst = section('', 'instant');
    const main = section('RESULTS', 'main');
    if (!isUrl) track('DDG', S.ddg(q, ctrl.signal)).then(d => { if (keep()) renderInstant(inst, d, main); }).catch(() => { });
    const take = (items) => { if (!keep()) return; items.forEach(it => main.append(card(it))); state.items.push(...items); scheduleSerp(); autoFeedItems(items, 2); };
    if (!isUrl) track('WIKI', S.wiki(q, ctrl.signal)).then(take).catch(() => { });
    track('LINKS', S.hn(q, ctrl.signal)).then(take).catch(() => { });
  } else if (mode === 'img') {
    const g = section('IMAGES — OPEN LICENSED, CLICK TO FEED THE SYNTH', 'grid');
    const takeImgs = (items) => { if (!keep()) return; items.forEach(it => g.append(imgCard(it))); state.items.push(...items); autoFeedItems(items, 3); scheduleSerp(); };
    track('OPENVERSE', S.openverse(q, ctrl.signal)).then(takeImgs).catch(() => { });
    track('COMMONS', S.commons(q, ctrl.signal)).then(takeImgs).catch(() => { });
  } else if (mode === 'archive') {
    const g = section('THE INTERNET ARCHIVE — NOTHING DIES', 'main');
    track('ARCHIVE', S.archive(q, ctrl.signal)).then(items => { if (!keep()) return; items.forEach(it => g.append(card(it))); state.items.push(...items); scheduleSerp(); }).catch(() => { });
  } else if (mode === 'hn') {
    const g = section('LINKS FROM THE OPEN WEB', 'main');
    track('LINKS', S.hn(q, ctrl.signal)).then(items => { if (!keep()) return; items.forEach(it => g.append(card(it))); state.items.push(...items); scheduleSerp(); }).catch(() => { });
  }
}

let serpT;
function scheduleSerp() {
  clearTimeout(serpT);
  serpT = setTimeout(() => {
    paintSerp(serpCanvas, state.q, state.items, state.images.filter(im => im.complete && im.naturalWidth));
    if (synth && !synth.setSource(1, serpCanvas, { name: 'SERP SHOT' })) { paintSerp(serpCanvas, state.q, state.items, []); synth.setSource(1, serpCanvas, { name: 'SERP SHOT' }); }
    slotNames[1] = 'SERP SHOT'; updatePreview(1);
  }, 500);
}

function autoFeedItems(items, n) {
  if (!state.autoFeed || !synth) return;
  items.filter(it => it.thumb && !it.nocors).slice(0, n).forEach(it =>
    loadImage(it.thumb, 'thumbnail → synth').then(im => { state.images.push(im); feed(im, (it.title || '').slice(0, 14).toUpperCase(), { quiet: true }); scheduleSerp(); }).catch(() => { }));
}

// ---------------------------------------------------------------- renderers
function thumbImg(it) {
  const im = h('img', { alt: '', loading: 'lazy', decoding: 'async' });
  im.referrerPolicy = 'no-referrer';
  if (!it.nocors && it.src !== 'DDG') im.crossOrigin = 'anonymous';
  im.onerror = () => im.remove();
  try { S.logRequest(new URL(it.thumb).hostname, 'thumbnail'); } catch { }
  im.src = it.thumb;
  return im;
}

function card(it) {
  const c = h('article', { class: 'card src-' + it.src.toLowerCase(), style: `--r:${rand(-1.6, 1.6).toFixed(2)}deg` });
  const extra = h('div', { class: 'extra' });
  let thumb = null;
  if (it.thumb) { thumb = thumbImg(it); c.append(h('div', { class: 'thumb' }, thumb)); }
  const acts = h('div', { class: 'acts' },
    h('a', { href: it.url, class: 'act', text: 'OPEN' }),
    h('button', { class: 'act', text: 'ALT', title: 'alternatives & privacy reroutes', onclick: () => toggleAlt(extra, it) }),
    h('button', { class: 'act', text: 'SHOT', title: 'screenshot it into the synth (opt-in thum.io)', onclick: () => shoot(it.url, it.host) }),
    it.thumb && !it.nocors ? h('button', { class: 'act', text: 'FEED', title: 'send the image to the synth', onclick: () => feedThumb(thumb, it) }) : null,
    h('a', { href: 'https://web.archive.org/web/2/' + it.url, class: 'act', text: 'WAYBACK' }),
    it.discuss ? h('a', { href: it.discuss, class: 'act', text: 'TALK' }) : null);
  c.append(
    h('div', { class: 'meta' }, h('span', { class: 'badge', text: it.src }), h('span', { class: 'host', text: it.host })),
    h('h3', {}, h('a', { href: it.url, text: it.title })),
    it.snippet ? h('p', { class: 'snip', text: it.snippet }) : null, acts, extra);
  return c;
}

function feedThumb(img, it) {
  const name = (it.title || '').slice(0, 14).toUpperCase();
  if (img && img.complete && img.naturalWidth && img.crossOrigin) { feed(img, name, { toB: true }); return; }
  loadImage(it.thumb, 'thumbnail → synth').then(im => feed(im, name, { toB: true })).catch(() => toast('could not load image'));
}

function imgCard(it) {
  const im = thumbImg(it);
  return h('figure', { class: 'imgCard', style: `--r:${rand(-3, 3).toFixed(2)}deg` }, h('button', { class: 'imgBtn', title: 'feed to synth', onclick: () => feedThumb(im, it) }, im),
    h('figcaption', {}, h('a', { href: it.url, text: it.title.slice(0, 60) }), h('small', { text: it.snippet })));
}

function altCard(e) {
  return h('article', { class: 'card altCard', style: `--r:${rand(-2, 2).toFixed(2)}deg` },
    h('div', { class: 'meta' }, h('span', { class: 'badge', text: e.cat }), h('span', { class: 'host', text: 'instead of' })),
    h('h3', { class: 'insteadOf', text: e.name }),
    h('ul', { class: 'altList' }, e.alts.map(([n, u, why]) => h('li', {}, h('a', { href: u, text: n }), h('span', { text: ' — ' + why })))));
}

function toggleAlt(extra, it) {
  if (extra.childElementCount) { extra.replaceChildren(); return; }
  let u; try { u = new URL(it.url); } catch { return; }
  const routes = reroute(u), alts = altsForHost(u.hostname);
  extra.append(h('div', { class: 'routes' }, h('b', { text: 'REROUTE → ' }), routes.map(([n, l]) => h('a', { href: l, class: 'chip', text: n }))));
  alts.slice(0, 2).forEach(e => extra.append(altCard(e)));
  if (!alts.length) extra.append(h('p', { class: 'snip', text: 'no known alternative for ' + u.hostname + ' — the archives above keep a copy without the trackers.' }));
}

function renderInstant(box, d, main) {
  if (d.abstract) {
    const im = d.image ? h('img', { alt: '', src: d.image, referrerpolicy: 'no-referrer' }) : null;
    if (im) S.logRequest('duckduckgo.com', 'instant answer image');
    box.append(h('div', { class: 'instantCard' }, im,
      h('div', {}, h('h2', { class: 'drip', text: d.heading || state.q }), h('p', { text: d.abstract }),
        d.abstractUrl ? h('a', { href: d.abstractUrl, class: 'chip', text: 'via ' + (d.abstractSource || 'source') }) : null,
        d.official ? h('a', { href: d.official, class: 'chip hot', text: 'official site' }) : null)));
  }
  d.related.slice(0, 6).forEach(it => main.append(card(it)));
  state.items.push(...d.related.slice(0, 6)); scheduleSerp();
}

function renderUrlTools(q) {
  const c = cleanUrl(q); if (!c) return;
  const b = section('LINK SURGERY', 'urlsec');
  const out = h('code', { class: 'cleanUrl', text: c.url });
  b.append(h('article', { class: 'card urlCard' },
    h('div', { class: 'meta' }, h('span', { class: 'badge', text: 'CLEANED' }), h('span', { class: 'host', text: c.removed.length ? 'removed: ' + c.removed.join(', ') : 'no trackers found in this link' })),
    out,
    h('div', { class: 'acts' },
      h('button', { class: 'act', text: 'COPY CLEAN', onclick: () => navigator.clipboard.writeText(c.url).then(() => toast('clean link copied'), () => toast('copy blocked')) }),
      h('a', { href: c.url, class: 'act', text: 'OPEN CLEAN' }),
      h('button', { class: 'act', text: 'SHOT → SYNTH', onclick: () => shoot(c.url, c.host) })),
    h('div', { class: 'routes' }, h('b', { text: 'REROUTE → ' }), reroute(c.u).map(([n, l]) => h('a', { href: l, class: 'chip', text: n })))));
  altsForHost(c.host).slice(0, 3).forEach(e => b.append(altCard(e)));
}

function renderEngineBar(q) {
  const bar = $('#engineBar'); bar.replaceChildren();
  if (!q) return;
  const clean = (S.parseBang(q) || { q }).q;
  bar.append(h('span', { class: 'esc', text: 'ESCAPE THIS QUERY →' }), ...S.ENGINES.slice(0, 8).map(e => h('a', { href: S.engineUrl(e, clean), class: 'chip', title: e.note + ' · !' + e.bang, text: e.name })));
}

function renderEngines(q) {
  const b = section('ESCAPE ROUTES — SEARCH WITHOUT BEING SEARCHED', 'grid engines');
  S.ENGINES.forEach(e => b.append(h('a', { href: q ? S.engineUrl(e, q) : new URL(e.url.replace('%s', '')).origin, class: 'engineCard', style: `--r:${rand(-3, 3).toFixed(2)}deg` },
    h('b', { text: e.name }), h('small', { text: e.note }), h('code', { text: '!' + e.bang }))));
  b.append(h('p', { class: 'snip wide', text: 'Type “!m your query” (or any !bang above) and press ENTER to jump straight there. Links open in a new tab with no referrer.' }));
}

function renderAltDirectory(q) {
  const list = q ? findAlts(q) : ALTS;
  const b = section(q ? `ALTERNATIVES MATCHING “${q}”` : 'THE ALTERNATIVE INTERNET — DIRECTORY', 'altsec');
  (list.length ? list : ALTS).forEach(e => b.append(altCard(e)));
  if (q && looksLikeUrl(q)) renderUrlTools(q);
}

function renderHome() {
  const b = section('', 'home');
  const tries = ['youtube', 'whatsapp', 'google maps', 'brutalism', 'acid house', 'situationist', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=TRACKME', 'psychedelic art', 'chrome', '!m cyberpunk'];
  b.append(h('div', { class: 'homeCard' },
    h('h2', { class: 'drip', text: 'TYPE. WATCH IT MELT.' }),
    h('p', { text: 'Every keystroke is sprayed onto the wall behind you. Results stream in live, get screenshotted, sliced, mixed, looped and fed back into themselves. Search for a big-tech service and you get the escape route. Paste a link and it gets cleaned of trackers and rerouted to a privacy frontend.' }),
    h('div', { class: 'tries' }, tries.map(t => h('button', { class: 'chip', text: t, onclick: () => { input.value = t; onType(); runSearch(true); } })))));
}

// ---------------------------------------------------------------- fingerprint mirror
function fingerprintLines() {
  const n = navigator, s = screen;
  let gpu = 'n/a';
  try { const g = document.createElement('canvas').getContext('webgl'); const ext = g.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); } catch { }
  let canvasHash = 'n/a';
  try {
    const c = document.createElement('canvas'); c.width = 240; c.height = 40; const g = c.getContext('2d');
    g.textBaseline = 'top'; g.font = '16px Arial'; g.fillStyle = '#f60'; g.fillRect(10, 1, 60, 20); g.fillStyle = '#069'; g.fillText('gh0st😈seek', 2, 15);
    const d = c.toDataURL(); let x = 0; for (let i = 0; i < d.length; i++) x = (x * 33 + d.charCodeAt(i)) >>> 0; canvasHash = x.toString(16);
  } catch { }
  const rows = [
    ['user agent', n.userAgent], ['platform', n.userAgentData ? n.userAgentData.platform : n.platform], ['languages', (n.languages || [n.language]).join(', ')],
    ['timezone', Intl.DateTimeFormat().resolvedOptions().timeZone], ['screen', `${s.width}×${s.height} @${devicePixelRatio}x, ${s.colorDepth}-bit`],
    ['window', `${innerWidth}×${innerHeight}`], ['cpu threads', n.hardwareConcurrency], ['memory (GB, rounded)', n.deviceMemory || 'hidden'],
    ['touch points', n.maxTouchPoints], ['gpu', gpu], ['canvas render hash', canvasHash], ['do-not-track', n.doNotTrack || 'unset'],
    ['global privacy control', n.globalPrivacyControl ? 'ON' : 'off/unsupported'], ['cookies enabled', n.cookieEnabled], ['pdf viewer', n.pdfViewerEnabled],
  ];
  let all = rows.map(r => r[1]).join('|'), fp = 0; for (let i = 0; i < all.length; i++) fp = (fp * 31 + all.charCodeAt(i)) >>> 0;
  return { rows, fp: fp.toString(16).toUpperCase() };
}

function renderFingerprint() {
  const { rows, fp } = fingerprintLines();
  const b = section('WHAT EVERY WEBSITE CAN SEE — WITHOUT ASKING', 'fpsec');
  b.append(h('article', { class: 'card fpCard' },
    h('p', { class: 'snip', text: 'No cookies needed. Any site can read these values with ordinary JavaScript and combine them into an ID that follows you. This page computes them only to show you, and sends them nowhere.' }),
    h('div', { class: 'fpId' }, h('small', { text: 'YOUR FINGERPRINT HASH' }), h('b', { text: fp })),
    h('table', { class: 'fpTable' }, rows.map(([k, v]) => h('tr', {}, h('th', { text: k }), h('td', { text: String(v) })))),
    h('div', { class: 'acts' },
      h('button', { class: 'act', text: 'FEED MY FINGERPRINT TO THE SYNTH', onclick: () => feed(paintText(makeCanvas(), 'YOU ARE ' + fp, rows.map(([k, v]) => `${k}: ${v}`)), 'FINGERPRINT', { toB: true }) }),
      h('a', { class: 'act', href: 'https://coveryourtracks.eff.org', text: 'EFF COVER YOUR TRACKS' }),
      h('a', { class: 'act', href: 'https://mullvad.net/browser', text: 'BLEND IN: MULLVAD BROWSER' }))));
}

// ---------------------------------------------------------------- rack UI
const sliders = {};
function buildRack() {
  const groups = {};
  for (const p of PARAMS) {
    const [g, id, label, min, max, step, , names] = p;
    if (!groups[g]) { groups[g] = h('div', { class: 'block grp' }, h('h3', { text: g })); $('#groups').append(groups[g]); }
    const inp = h('input', { type: 'range', min, max, step, value: synth ? synth.params[id] : p[6], 'aria-label': label });
    const out = h('output', {});
    inp.addEventListener('input', () => { if (!synth) return; synth.params[id] = +inp.value; out.textContent = fmt(p, +inp.value); if (id === 'layerA' || id === 'layerB') markAB(); });
    inp.addEventListener('pointerdown', () => { if (state.midi) { state.learn = id; toast('MIDI LEARN: move a knob for ' + label); } });
    const row = h('label', { class: 'prm' }, h('span', { class: 'pl', text: label }), out, inp);
    groups[g].append(row);
    sliders[id] = { inp, out, p };
  }
  syncSliders();
  const presets = $('#presets');
  for (const name of Object.keys(PRESETS)) presets.append(h('button', { class: 'btn small', text: name, onclick: () => applyPreset(name) }));
}
function fmt(p, v) { if (p[7]) return p[7][Math.round(v)] || v; if (p[1] === 'layerA' || p[1] === 'layerB') return '#' + (Math.round(v) + 1); return (+v).toFixed(p[5] >= 1 ? 0 : p[5] >= 0.01 ? 2 : 3); }
function syncSliders() { if (!synth) return; for (const id in sliders) { const s = sliders[id]; s.inp.value = synth.params[id]; s.out.textContent = fmt(s.p, synth.params[id]); } }

const PRESETS = {
  'CLEAN READ': { feedback: .3, glitch: 0, palette: 0, warp: 0, slices: 1, jitter: 0, chaosSrc: 0, kaleido: 0, loopMix: 0, strobe: 0, xfade: .2, blend: 0, sat: 1, chroma: .002, pixel: 0, posterize: 0, invert: 0, mirror: 0, displace: 0, hueSpeed: 0, grain: .04, scan: .1, fbZoom: 0, fbRot: 0, fbHue: 0 },
  'CUT-UP': { slices: 14, sliceMode: 0, shuffle: 4, jitter: .5, chaosSrc: .85, blend: 0, xfade: .5, feedback: .35, kaleido: 0, glitch: .2 },
  'ACID WASH': { palette: .85, hueSpeed: .6, warp: .05, warpFreq: 4, feedback: .88, fbHue: .03, sat: 2.2, blend: 7, fbZoom: .01 },
  'TUNNEL': { feedback: .94, fbZoom: .03, fbRot: .015, kaleido: 0, blend: 4, slices: 3, sliceMode: 3, jitter: .1 },
  'KALEIDO WALL': { kaleido: 8, kaleRot: .3, mirror: 0, slices: 6, sliceMode: 4, palette: .45, feedback: .6 },
  'SLIT-SCAN': { sliceTime: 1, slices: 48, sliceMode: 0, loopMix: 1, jitter: 0, chaosSrc: 0, kaleido: 0 },
  'DATAMOSH': { glitch: .85, chroma: .02, displace: .35, pixel: .35, posterize: .5, shuffle: 10, sliceMode: 2, slices: 16, feedback: .7 },
  'SHARDS': { sliceMode: 5, slices: 10, jitter: .4, chaosSrc: .6, blend: 3, shuffle: 2 },
  'VOID': { invert: 1, posterize: .8, sat: 0, feedback: .9, grain: .3, scan: .8, palette: 0 },
};
function applyPreset(name) {
  if (!synth) return;
  const pr = { ...PRESETS[name] };
  if (state.calm) { pr.strobe = 0; if (pr.glitch) pr.glitch = Math.min(pr.glitch, .2); if (pr.chroma) pr.chroma = Math.min(pr.chroma, .006); }
  Object.assign(synth.params, pr);
  if (name === 'SLIT-SCAN' && !synth.loopFrames && !synth.recording) startLoop();
  syncSliders(); markAB(); synth.burst(1); sound.noise(.2);
  toast('PRESET · ' + name);
}

function randomValue(p) {
  const [, id, , min, max, step] = p; let v;
  switch (id) {
    case 'strobe': v = state.calm ? 0 : (Math.random() < .2 ? rand(0, .35) : 0); break;
    case 'invert': v = Math.random() < .2 ? Math.random() : 0; break;
    case 'pixel': v = Math.random() < .2 ? rand(0, .7) : 0; break;
    case 'posterize': v = Math.random() < .3 ? rand(0, .8) : 0; break;
    case 'kaleido': v = Math.random() < .4 ? randInt(2, 12) : 0; break;
    case 'mirror': v = Math.random() < .3 ? randInt(1, 3) : 0; break;
    case 'feedback': v = rand(.2, .95); break;
    case 'glitch': v = rand(0, state.calm ? .15 : .6); break;
    case 'grain': v = rand(0, .2); break;
    case 'scan': v = rand(0, .5); break;
    case 'chroma': v = rand(0, state.calm ? .005 : .02); break;
    case 'fbZoom': v = rand(-.02, .03); break;
    case 'fbRot': v = rand(-.02, .02); break;
    case 'sat': v = rand(.6, 2.4); break;
    case 'audioAmt': return synth.params.audioAmt;
    case 'loopMix': return synth.loopFrames ? rand(0, 1) : synth.params.loopMix;
    default: v = rand(min, max);
  }
  return step >= 1 ? Math.round(v) : v;
}
function chaos() {
  if (!synth) return;
  for (const p of PARAMS) synth.params[p[1]] = randomValue(p);
  synth.reseed(); synth.burst(1.5); sound.noise(.3); syncSliders(); markAB();
}

const drift = {};
function autopilot(dt) {
  for (const p of PARAMS) {
    const id = p[1];
    if (p[5] >= 1) { if (Math.random() < dt * .04) synth.params[id] = randomValue(p); continue; }
    if (drift[id] == null || Math.random() < dt * .12) drift[id] = randomValue(p);
    synth.params[id] += (drift[id] - synth.params[id]) * Math.min(1, dt * .35);
  }
}

function startLoop() {
  if (!synth) return;
  synth.recordLoop(+$('#loopLen').value);
  $('#bLoop').classList.add('rec'); $('#bLoop').textContent = '● REC…';
  if (synth.params.loopMix < .3) { synth.params.loopMix = .65; syncSliders(); }
}

// ---------------------------------------------------------------- capture / files
async function captureTab() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return toast('screen capture not supported on this device');
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    const v = await videoFrom(stream);
    const stop = () => stream.getTracks().forEach(t => t.stop());
    const i = feed(v, 'TAB ● LIVE', { live: true, stop, toB: true, kind: 'video' });
    stream.getVideoTracks()[0].addEventListener('ended', () => { if (synth.sources[i]) synth.sources[i].live = false; updatePreview(i); });
    toast('LIVE SCREENSHOT STREAM in slot ' + (i + 1) + ' — open an alternative site in that tab and remix it');
  } catch { toast('capture cancelled'); }
}
async function webcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    const v = await videoFrom(stream);
    feed(v, 'CAM ● LIVE', { live: true, stop: () => stream.getTracks().forEach(t => t.stop()), toB: true, kind: 'video' });
  } catch { toast('no camera (or permission denied)'); }
}
function videoFrom(srcOrStream) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.loop = true;
    if (typeof srcOrStream === 'string') v.src = srcOrStream; else v.srcObject = srcOrStream;
    v.onloadeddata = () => { v.play().catch(() => { }); res(v); }; v.onerror = rej;
  });
}
async function feedFile(f) {
  const url = URL.createObjectURL(f);
  if (f.type.startsWith('video/')) { const v = await videoFrom(url); feed(v, f.name.slice(0, 14).toUpperCase(), { live: true, toB: true, kind: 'video' }); }
  else if (f.type.startsWith('image/')) { const im = await loadImage(url, 'local', false); feed(im, f.name.slice(0, 14).toUpperCase() || 'PASTED', { toB: true }); }
}

// ---------------------------------------------------------------- recording
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
function snap() { if (!synth) return; synth.afterFrame(c => c.toBlob(b => b && download(b, `gh0stseek-${stamp()}.png`), 'image/png')); toast('SNAP!'); }
let rec = null;
function toggleVideo() {
  if (!synth) return;
  const b = $('#bVid');
  if (rec) { rec.stop(); return; }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) return toast('video recording unsupported here');
  const chunks = [];
  rec = new MediaRecorder(synth.canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 });
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => { download(new Blob(chunks, { type: mime }), `gh0stseek-${stamp()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`); rec = null; b.classList.remove('rec'); b.textContent = 'REC VIDEO'; };
  rec.start(500); b.classList.add('rec'); b.textContent = '■ STOP REC';
}

// ---------------------------------------------------------------- dérive (the page searches on its own)
function toggleDerive() {
  const b = $('#bDerive');
  if (state.derive) { clearInterval(state.derive); state.derive = null; b.classList.remove('on'); toast('dérive stopped'); return; }
  const step = async () => {
    try {
      const [t] = await S.randomTitles(1);
      input.value = t; onType(); state.mode === 'all' || setMode('all'); runSearch(true);
      if (synth && Math.random() < .5) { synth.params.sliceMode = randInt(0, 5); synth.params.layerA = randInt(0, 7); syncSliders(); markAB(); }
    } catch { }
  };
  step(); state.derive = setInterval(step, state.calm ? 15000 : 9000);
  b.classList.add('on'); toast('DÉRIVE — drifting through random corners of human knowledge');
}

// ---------------------------------------------------------------- MIDI
async function toggleMidi() {
  if (state.midi) return toast('MIDI already on — click a slider then move a knob to map it');
  if (!navigator.requestMIDIAccess) return toast('Web MIDI not supported in this browser');
  try {
    state.midi = await navigator.requestMIDIAccess();
    const hook = () => state.midi.inputs.forEach(inp => inp.onmidimessage = onMidi);
    hook(); state.midi.onstatechange = hook;
    $('#bMidi').classList.add('on');
    toast('MIDI ON · CC1-' + PARAMS.length + ' map to sliders in order · notes pick source A · click a slider to learn');
  } catch { toast('MIDI permission denied'); }
}
function onMidi(e) {
  if (!synth) return;
  const [st, d1, d2] = e.data, type = st & 0xf0;
  if (type === 0x90 && d2 > 0) { synth.params.layerA = d1 % SRC_LAYERS; synth.burst(d2 / 90); markAB(); syncSliders(); return; }
  if (type !== 0xb0) return;
  if (state.learn) { state.ccMap[d1] = state.learn; toast(`CC${d1} → ${sliders[state.learn].p[2]}`); state.learn = null; }
  const id = state.ccMap[d1] || (PARAMS[d1 - 1] && PARAMS[d1 - 1][1]);
  if (!id) return;
  const p = sliders[id].p, v = p[3] + (p[4] - p[3]) * d2 / 127;
  synth.params[id] = p[5] >= 1 ? Math.round(v) : v; syncSliders(); markAB();
}

// ---------------------------------------------------------------- privacy panel
function refreshFacts() {
  let ls = 0; try { ls = localStorage.length + sessionStorage.length; } catch { }
  const third = [...document.scripts].filter(s => s.src && new URL(s.src).origin !== location.origin).length;
  const hosts = {}; S.requestLog.forEach(r => hosts[r.host] = (hosts[r.host] || 0) + 1);
  $('#facts').replaceChildren(
    fact('COOKIES', document.cookie ? 'some (not ours!)' : 'NONE'), fact('STORAGE', ls ? ls + ' items' : 'NONE'),
    fact('3RD-PARTY SCRIPTS', String(third)), fact('ANALYTICS', 'NONE'), fact('REFERRER', 'STRIPPED'),
    fact('SERVER', 'NONE (static page)'), fact('REQUESTS', String(S.requestLog.length)),
    fact('HOSTS CONTACTED', Object.entries(hosts).map(([k, v]) => `${k} ×${v}`).join(' · ') || 'none yet'));
  $('#logList').replaceChildren(...S.requestLog.slice().reverse().map(r => h('li', {}, h('time', { text: r.t.toTimeString().slice(0, 8) }), h('b', { text: r.host }), h('span', { text: r.purpose + (r.detail ? ' · “' + r.detail + '”' : '') }))));
}
function fact(k, v) { return h('div', { class: 'fact' }, h('small', { text: k }), h('b', { text: v })); }

function panic() {
  if (state.ctrl) state.ctrl.abort();
  if (state.derive) clearInterval(state.derive);
  if (synth) synth.sources.forEach(s => s && s.stop && s.stop());
  if (sound.micStream) sound.micStream.getTracks().forEach(t => t.stop());
  input.value = ''; results.replaceChildren(); S.requestLog.length = 0;
  try { navigator.clipboard && navigator.clipboard.writeText(''); } catch { }
  document.body.classList.add('panic');
  history.replaceState(null, '', location.pathname);
  setTimeout(() => location.replace(location.pathname), 700);
}

// ---------------------------------------------------------------- modes / wiring
function setMode(m) {
  state.mode = m;
  document.querySelectorAll('#modes .mode').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
}

function toggleUI(force) { document.body.classList.toggle('hideui', force); }

function wire() {
  input.addEventListener('input', onType);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') input.blur(); });
  $('#go').addEventListener('click', submit);
  document.querySelectorAll('#modes .mode').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); runSearch(true); if (synth) synth.burst(.5); }));

  $('#rackToggle').addEventListener('click', () => document.body.classList.toggle('rackOpen'));
  $('#bChaos').addEventListener('click', chaos);
  $('#bAuto').addEventListener('click', () => { state.auto = !state.auto; $('#bAuto').classList.toggle('on', state.auto); toast(state.auto ? 'AUTOPILOT — the machine dreams on its own' : 'autopilot off'); });
  $('#bDerive').addEventListener('click', toggleDerive);
  $('#bLoop').addEventListener('click', startLoop);
  $('#bLoopClear').addEventListener('click', () => { synth && synth.clearLoop(); toast('loop cleared'); });
  $('#bBurst').addEventListener('click', () => { synth && synth.burst(1.6); sound.noise(); });
  $('#bSnap').addEventListener('click', snap);
  $('#bVid').addEventListener('click', toggleVideo);
  $('#bSound').addEventListener('click', () => $('#bSound').classList.toggle('on', sound.toggle()));
  $('#bMic').addEventListener('click', async () => { try { $('#bMic').classList.toggle('on', await sound.mic()); } catch { toast('no microphone (or denied)'); } });
  $('#bMidi').addEventListener('click', toggleMidi);
  $('#bHide').addEventListener('click', () => { toggleUI(true); toast('UI hidden — press H or tap to bring it back'); });
  $('#bFull').addEventListener('click', fullscreen);
  $('#fTab').addEventListener('click', captureTab);
  $('#fCam').addEventListener('click', webcam);
  $('#fFile').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', e => [...e.target.files].forEach(feedFile));
  $('#fSelf').addEventListener('click', () => { if (!synth) return; const i = feedCursor; feedCursor = feedCursor >= 7 ? 2 : feedCursor + 1; synth.grabSelf(i); slotNames[i] = 'SELF ∞'; updatePreview(i); synth.params.layerB = i; syncSliders(); markAB(); toast('the output now eats itself (slot ' + (i + 1) + ')'); });
  $('#fTag').addEventListener('click', () => respray(input.value || 'GH0ST//SEEK'));
  $('#fNoise').addEventListener('click', () => feed(paintNoise(makeCanvas()), 'NOISE', { toB: true }));
  document.querySelectorAll('#loopModes button').forEach(b => b.addEventListener('click', () => {
    if (synth) synth.loopMode = b.dataset.lm; document.querySelectorAll('#loopModes button').forEach(x => x.classList.toggle('on', x === b));
  }));
  $('#quality').addEventListener('change', e => synth && synth.setScale(+e.target.value));
  $('#uiAlpha').addEventListener('input', e => document.documentElement.style.setProperty('--ui-alpha', e.target.value));
  $('#autoFeed').addEventListener('change', e => state.autoFeed = e.target.checked);

  $('#shieldBtn').addEventListener('click', () => { refreshFacts(); $('#log').hidden = false; });
  $('#logClose').addEventListener('click', () => $('#log').hidden = true);
  $('#panic').addEventListener('click', panic);
  $('#logToSynth').addEventListener('click', () => feed(paintText(makeCanvas(), 'WHO KNOWS WHAT', S.requestLog.slice(-20).map(r => `${r.t.toTimeString().slice(0, 8)} ${r.host} :: ${r.purpose} ${r.detail}`), '#ffe600'), 'REQUEST LOG', { toB: true }));
  S.onRequest(() => { $('#reqCount').textContent = S.requestLog.length; if (!$('#log').hidden) refreshFacts(); });

  // keyboard
  addEventListener('keydown', e => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|SELECT|TEXTAREA/.test(tag) && document.activeElement.type !== 'range') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (/^[1-8]$/.test(e.key)) setLayer('layerA', +e.key - 1);
    else if (e.shiftKey && /^Digit[1-8]$/.test(e.code)) setLayer('layerB', +e.code.slice(5) - 1);
    else if (k === 'h') toggleUI();
    else if (k === 'c') chaos();
    else if (k === 'r') startLoop();
    else if (k === 'a') $('#bAuto').click();
    else if (k === 'd') toggleDerive();
    else if (k === 's') snap();
    else if (k === 'f') fullscreen();
    else if (k === ' ') { e.preventDefault(); synth && synth.burst(1.6); sound.noise(); }
    else if (k === '/') { e.preventDefault(); toggleUI(false); input.focus(); }
    else if (k === 'escape') { $('#log').hidden = true; toggleUI(false); }
    else if (k === '[' && synth) { synth.params.slices = Math.max(1, synth.params.slices - 1); syncSliders(); }
    else if (k === ']' && synth) { synth.params.slices = Math.min(64, synth.params.slices + 1); syncSliders(); }
  });
  $('#synth').addEventListener('click', () => { if (document.body.classList.contains('hideui')) toggleUI(false); else if (synth) synth.burst(.8); });

  // paste screenshots / drop files
  addEventListener('paste', e => {
    const files = [...(e.clipboardData && e.clipboardData.files || [])].filter(f => /^(image|video)\//.test(f.type));
    if (files.length) { e.preventDefault(); files.forEach(feedFile); toast('pasted screenshot → synth'); }
  });
  addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dropping'); });
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dropping'); [...e.dataTransfer.files].forEach(feedFile); });
}

function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); }

// ---------------------------------------------------------------- main loop
let last = performance.now(), prevT = 0, sliderT = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (synth) {
    if (state.auto) autopilot(dt);
    synth.audio = sound.read();
    synth.frame(dt);
    sound.follow(synth.params, synth.burstV);
    prevT += dt; sliderT += dt;
    if (prevT > .5) { prevT = 0; synth.sources.forEach((s, i) => s && s.live && updatePreview(i)); }
    if (state.auto && sliderT > .25) { sliderT = 0; syncSliders(); markAB(); }
  }
  requestAnimationFrame(loop);
}

function enter(calm) {
  state.calm = calm;
  $('#gate').remove();
  document.body.classList.remove('booting');
  if (synth) {
    if (calm) Object.assign(synth.params, { strobe: 0, glitch: .05, chroma: .002, hueSpeed: .03, shuffle: .5, feedback: .5, jitter: .12 });
    else { Object.assign(synth.params, { glitch: .3, chroma: .008, shuffle: 3, chaosSrc: .5, palette: .5 }); synth.burst(2); }
    syncSliders(); markAB();
  }
  if (!calm) sound.toggle() && $('#bSound').classList.add('on');
  input.focus();
}

async function main() {
  bootSynth();
  buildBank();
  buildRack();
  wire();
  await fontsReady();
  if (synth) { seedSources(); markAB(); }
  requestAnimationFrame(loop);
  const m = location.hash.match(/^#q=(.*)$/);
  if (m) { input.value = decodeURIComponent(m[1]); history.replaceState(null, '', location.pathname); }
  runSearch(true);
  $('#enterCalm').addEventListener('click', () => enter(true));
  $('#enterHard').addEventListener('click', () => enter(false));
  (matchMedia('(prefers-reduced-motion: reduce)').matches ? $('#enterCalm') : $('#enterHard')).focus();
}
main();
