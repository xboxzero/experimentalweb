// Real-time search providers. Every request goes straight from your browser to the source,
// with no cookies, no referrer and no middle-man server. Every single request is logged in the
// transparency panel so you can see exactly who learned what.

const listeners = new Set();
export const requestLog = [];
export function onRequest(fn) { listeners.add(fn); }
export function logRequest(host, purpose, detail = '') {
  const e = { t: new Date(), host, purpose, detail };
  requestLog.push(e);
  if (requestLog.length > 300) requestLog.shift();
  listeners.forEach(f => f(e));
}

async function getJSON(url, purpose, signal) {
  const u = new URL(url);
  logRequest(u.hostname, purpose, u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('gsrsearch') || '');
  const r = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors' });
  if (!r.ok) throw new Error(u.hostname + ' ' + r.status);
  return r.json();
}

const enc = encodeURIComponent;
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

export async function wiki(q, signal, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${enc(q)}&gsrlimit=10&prop=pageimages|extracts|info&inprop=url&exintro=1&explaintext=1&exsentences=2&exlimit=max&piprop=thumbnail&pithumbsize=640&pilimit=max`;
  const d = await getJSON(url, 'wikipedia search', signal);
  const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index);
  return pages.map(p => ({ src: 'WIKI', title: p.title, url: p.fullurl, host: host(p.fullurl), snippet: (p.extract || '').slice(0, 260), thumb: p.thumbnail && p.thumbnail.source }));
}

export async function hn(q, signal) {
  const d = await getJSON(`https://hn.algolia.com/api/v1/search?query=${enc(q)}&tags=story&hitsPerPage=14`, 'web links via HN index', signal);
  return d.hits.filter(h => h.title).map(h => {
    const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
    return { src: 'WEB', title: h.title, url, host: host(url), snippet: `${h.points || 0} pts · ${h.num_comments || 0} comments · ${(h.created_at || '').slice(0, 10)}`, discuss: `https://news.ycombinator.com/item?id=${h.objectID}` };
  });
}

export async function ddg(q, signal) {
  const d = await getJSON(`https://api.duckduckgo.com/?q=${enc(q)}&format=json&no_html=1&skip_disambig=1&t=gh0stseek`, 'instant answer', signal);
  const related = [];
  const walk = (arr) => arr && arr.forEach(r => { if (r.Topics) walk(r.Topics); else if (r.FirstURL && r.Text) related.push({ src: 'DDG', title: r.Text.split(' - ')[0].slice(0, 90), url: r.FirstURL, host: host(r.FirstURL), snippet: r.Text.slice(0, 220), thumb: r.Icon && r.Icon.URL ? 'https://duckduckgo.com' + r.Icon.URL : null }); });
  walk(d.Results); walk(d.RelatedTopics);
  return {
    heading: d.Heading, abstract: d.AbstractText || d.Answer || d.Definition, abstractUrl: d.AbstractURL, abstractSource: d.AbstractSource,
    image: d.Image ? (d.Image.startsWith('http') ? d.Image : 'https://duckduckgo.com' + d.Image) : null,
    official: (d.Results || []).map(r => r.FirstURL)[0], related: related.slice(0, 10),
  };
}

export async function openverse(q, signal, filtered = false) {
  const d = await getJSON(`https://api.openverse.org/v1/images/?q=${enc(q)}&page_size=24&mature=${filtered ? 'false' : 'true'}`, 'open-licensed image search', signal);
  return d.results.map(r => ({ src: 'IMG', title: r.title || 'untitled', url: r.foreign_landing_url, host: host(r.foreign_landing_url), thumb: `https://api.openverse.org/v1/images/${r.id}/thumb/`, snippet: `${r.creator || 'unknown'} · ${String(r.license || '').toUpperCase()} ${r.license_version || ''} · ${r.provider}` }));
}

export async function commons(q, signal) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${enc(q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&iiextmetadatafilter=Artist|LicenseShortName`;
  const d = await getJSON(url, 'wikimedia commons image search', signal);
  return Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).filter(p => p.imageinfo).map(p => {
    const ii = p.imageinfo[0], md = ii.extmetadata || {};
    const artist = md.Artist ? String(md.Artist.value).replace(/<[^>]+>/g, '').trim().slice(0, 40) : 'unknown';
    return { src: 'IMG', title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), url: ii.descriptionurl, host: 'commons.wikimedia.org', thumb: ii.thumburl, snippet: `${artist} · ${md.LicenseShortName ? md.LicenseShortName.value : ''} · wikimedia commons` };
  });
}

// ---- video ----
// Wikimedia Commons videos are served with CORS, so they can go straight into the synth.
export async function commonsVideos(q, signal) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${enc(q + ' filetype:video')}&gsrnamespace=6&gsrlimit=20&prop=videoinfo&viprop=url|derivatives|size&viurlwidth=480`;
  const d = await getJSON(url, 'wikimedia commons video search', signal);
  return Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).filter(p => p.videoinfo).map(p => {
    const vi = p.videoinfo[0];
    const ders = (vi.derivatives || []).filter(x => /^video\/(webm|mp4)/.test(x.type) && (x.height || 0) <= 720).sort((a, b) => (b.height || 0) - (a.height || 0));
    const pick = ders.find(x => (x.height || 0) <= 480) || ders[0];
    const video = pick ? pick.src : vi.url;
    const mins = vi.duration ? Math.floor(vi.duration / 60) + ':' + String(Math.round(vi.duration % 60)).padStart(2, '0') : '';
    return { src: 'VIDEO', title: p.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''), url: vi.descriptionurl, host: 'commons.wikimedia.org', thumb: vi.thumburl, video, cors: true, snippet: `${mins} · ${vi.width || '?'}×${vi.height || '?'} · free license · remixable` };
  });
}

// Internet Archive films: play in the deck; remix them via region capture (their file servers skip CORS).
export async function archiveMovies(q, signal) {
  const d = await getJSON(`https://archive.org/advancedsearch.php?q=${enc('(' + q + ') AND mediatype:movies')}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description&rows=16&output=json`, 'internet archive film search', signal);
  return d.response.docs.map(x => ({ src: 'FILM', title: Array.isArray(x.title) ? x.title[0] : (x.title || x.identifier), url: `https://archive.org/details/${x.identifier}`, host: 'archive.org', ia: x.identifier, thumb: `https://archive.org/services/img/${x.identifier}`, nocors: true, snippet: `${x.year || ''} · ${String(Array.isArray(x.description) ? x.description[0] : (x.description || '')).replace(/<[^>]+>/g, '').slice(0, 140)}` }));
}
export async function archiveVideoFile(id, signal) {
  const d = await getJSON(`https://archive.org/metadata/${enc(id)}`, 'internet archive file list', signal);
  const files = (d.files || []).filter(f => /\.(mp4|webm|ogv|m4v)$/i.test(f.name));
  const f = files.find(f => /512kb|\.ia\.mp4$/i.test(f.name)) || files.find(f => /\.mp4$/i.test(f.name)) || files[0];
  return f ? `https://archive.org/download/${enc(id)}/${f.name.split('/').map(enc).join('/')}` : null;
}

export async function archive(q, signal) {
  const d = await getJSON(`https://archive.org/advancedsearch.php?q=${enc(q)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=year&fl[]=description&rows=18&output=json`, 'internet archive search', signal);
  return d.response.docs.map(x => ({ src: 'ARCHIVE', title: Array.isArray(x.title) ? x.title[0] : (x.title || x.identifier), url: `https://archive.org/details/${x.identifier}`, host: 'archive.org', thumb: `https://archive.org/services/img/${x.identifier}`, snippet: `${x.mediatype || ''} ${x.year || ''} · ${String(Array.isArray(x.description) ? x.description[0] : (x.description || '')).replace(/<[^>]+>/g, '').slice(0, 180)}`, nocors: true }));
}

export async function randomTitles(n = 4, signal) {
  const d = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=random&rnnamespace=0&rnlimit=${n}`, 'dérive: random article', signal);
  return d.query.random.map(r => r.title);
}

// launchers: open the query on another privacy-respecting engine (new tab, no referrer)
export const ENGINES = [
  { bang: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s&kp=-2', note: 'no profile · safe search off' },
  { bang: 'm', name: 'Mojeek', url: 'https://www.mojeek.com/search?q=%s', note: 'own independent index' },
  { bang: 'mg', name: 'Marginalia', url: 'https://marginalia-search.com/search?query=%s', note: 'small & weird web' },
  { bang: 'sx', name: 'SearXNG', url: 'https://farside.link/searxng/search?q=%s', note: 'random public instance' },
  { bang: 'sp', name: 'Startpage', url: 'https://www.startpage.com/do/search?q=%s&qadf=none', note: 'proxied Google · filter off' },
  { bang: 'b', name: 'Brave', url: 'https://search.brave.com/search?q=%s&safesearch=off', note: 'own index · safe search off' },
  { bang: 'wiby', name: 'Wiby', url: 'https://wiby.me/?q=%s', note: 'old-school web' },
  { bang: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s', note: 'encyclopedia' },
  { bang: 'ia', name: 'Internet Archive', url: 'https://archive.org/search?query=%s', note: 'library of everything' },
  { bang: 'wb', name: 'Wayback', url: 'https://web.archive.org/web/*/%s', note: 'dead pages' },
  { bang: 'yt', name: 'Invidious', url: 'https://farside.link/invidious/search?q=%s', note: 'YouTube minus Google' },
  { bang: 'pt', name: 'Sepia (PeerTube)', url: 'https://sepiasearch.org/search?search=%s', note: 'federated video' },
  { bang: 'r', name: 'Redlib', url: 'https://farside.link/redlib/search?q=%s', note: 'Reddit minus tracking' },
  { bang: 'osm', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/search?query=%s', note: 'maps' },
  { bang: 'cb', name: 'Codeberg', url: 'https://codeberg.org/explore/repos?q=%s', note: 'code' },
  { bang: 'ov', name: 'Openverse', url: 'https://openverse.org/search/?q=%s', note: 'free images' },
  { bang: 'ahmia', name: 'Ahmia (Tor)', url: 'https://ahmia.fi/search/?q=%s', note: 'search onion sites · use Tor Browser' },
  { bang: 'v', name: 'Commons video', url: 'https://commons.wikimedia.org/w/index.php?search=%s+filetype%3Avideo&ns6=1', note: 'free video' },
  { bang: 'gut', name: 'Gutenberg', url: 'https://www.gutenberg.org/ebooks/search/?query=%s', note: 'free books' },
];
export const engineUrl = (e, q) => e.url.replace('%s', enc(q));
export function parseBang(q) {
  const m = q.match(/(?:^|\s)!(\w+)(?:\s|$)/);
  if (!m) return null;
  const e = ENGINES.find(x => x.bang === m[1].toLowerCase());
  return e ? { engine: e, q: q.replace(m[0], ' ').trim() } : null;
}

// opt-in third-party screenshot service (only used when you press SHOT and accept)
export function shotUrl(url) { return `https://image.thum.io/get/width/1024/crop/768/noanimate/${url}`; }
