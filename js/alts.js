// Alternative-site finder: a local, offline database. Nothing here phones home.
// match = words that summon the entry; alts = [name, url, why]

export const ALTS = [
  { name: 'Google Search', cat: 'search', match: ['google', 'google search', 'bing', 'yahoo', 'search engine', 'google.com', 'bing.com'],
    alts: [['DuckDuckGo', 'https://duckduckgo.com', 'no search history profile'], ['Mojeek', 'https://www.mojeek.com', 'own crawler, independent index, no tracking'], ['Startpage', 'https://www.startpage.com', 'Google results through a privacy proxy'], ['Brave Search', 'https://search.brave.com', 'independent index'], ['SearXNG', 'https://searx.space', 'self-hostable metasearch, pick an instance'], ['Marginalia', 'https://marginalia-search.com', 'finds the small, weird, non-commercial web']] },
  { name: 'Chrome / Edge', cat: 'browser', match: ['chrome', 'edge', 'browser', 'google chrome', 'opera', 'safari'],
    alts: [['Firefox', 'https://www.mozilla.org/firefox/', 'independent engine, strong tracking protection'], ['LibreWolf', 'https://librewolf.net', 'hardened Firefox, no telemetry'], ['Mullvad Browser', 'https://mullvad.net/browser', 'Tor-grade anti-fingerprinting without Tor'], ['Tor Browser', 'https://www.torproject.org', 'onion routing, the real deal'], ['Brave', 'https://brave.com', 'Chromium with blocking built in']] },
  { name: 'YouTube', cat: 'video', match: ['youtube', 'yt', 'youtu.be', 'video', 'youtube.com'],
    alts: [['Invidious', 'https://invidious.io', 'YouTube frontend, no Google JS, no account'], ['PeerTube', 'https://joinpeertube.org', 'federated, peer-to-peer video'], ['FreeTube', 'https://freetubeapp.io', 'desktop app, local subscriptions'], ['NewPipe', 'https://newpipe.net', 'Android, no Google services'], ['Sepia Search', 'https://sepiasearch.org', 'search across PeerTube']] },
  { name: 'Gmail / Outlook', cat: 'email', match: ['gmail', 'email', 'mail', 'outlook', 'hotmail', 'yahoo mail'],
    alts: [['Proton Mail', 'https://proton.me/mail', 'end-to-end encrypted, Swiss'], ['Tuta', 'https://tuta.com', 'encrypted mail + calendar, German'], ['Disroot', 'https://disroot.org', 'community-run, donation based'], ['mailbox.org', 'https://mailbox.org', 'paid, ad-free, PGP support']] },
  { name: 'Google Drive / Dropbox / iCloud', cat: 'cloud', match: ['drive', 'google drive', 'dropbox', 'icloud', 'onedrive', 'cloud storage', 'cloud'],
    alts: [['Nextcloud', 'https://nextcloud.com', 'self-host your own cloud'], ['Proton Drive', 'https://proton.me/drive', 'end-to-end encrypted storage'], ['Syncthing', 'https://syncthing.net', 'device-to-device sync, no server'], ['CryptPad', 'https://cryptpad.org', 'encrypted drive + docs']] },
  { name: 'Google Docs / Office 365', cat: 'office', match: ['docs', 'google docs', 'sheets', 'office', 'word', 'excel', 'office 365', 'microsoft 365', 'notion'],
    alts: [['CryptPad', 'https://cryptpad.org', 'zero-knowledge collaborative docs'], ['LibreOffice', 'https://www.libreoffice.org', 'offline office suite'], ['ONLYOFFICE', 'https://www.onlyoffice.com', 'self-hostable suite'], ['Etherpad', 'https://etherpad.org', 'real-time collaborative text']] },
  { name: 'Google Maps', cat: 'maps', match: ['maps', 'google maps', 'apple maps', 'waze', 'navigation', 'map'],
    alts: [['OpenStreetMap', 'https://www.openstreetmap.org', 'the free wiki map of the world'], ['Organic Maps', 'https://organicmaps.app', 'offline maps, no tracking'], ['OsmAnd', 'https://osmand.net', 'offline navigation, power-user']] },
  { name: 'WhatsApp / Messenger / Telegram', cat: 'chat', match: ['whatsapp', 'messenger', 'telegram', 'imessage', 'sms', 'chat', 'messaging', 'wechat'],
    alts: [['Signal', 'https://signal.org', 'end-to-end encrypted by default, minimal metadata'], ['SimpleX Chat', 'https://simplex.chat', 'no user identifiers at all'], ['Element / Matrix', 'https://element.io', 'federated encrypted chat'], ['Briar', 'https://briarproject.org', 'peer-to-peer, works without internet']] },
  { name: 'Twitter / X', cat: 'social', match: ['twitter', 'x.com', 'tweet', 'x', 'threads'],
    alts: [['Mastodon', 'https://joinmastodon.org', 'federated microblogging'], ['Bluesky', 'https://bsky.app', 'open protocol social'], ['xcancel', 'https://xcancel.com', 'read X without an account (Nitter frontend)']] },
  { name: 'Facebook', cat: 'social', match: ['facebook', 'fb', 'meta', 'facebook groups', 'facebook events'],
    alts: [['Friendica', 'https://friendi.ca', 'federated Facebook-style network'], ['Mastodon', 'https://joinmastodon.org', 'federated social'], ['Mobilizon', 'https://mobilizon.org', 'federated events & groups']] },
  { name: 'Instagram', cat: 'social', match: ['instagram', 'insta', 'ig', 'photo sharing'],
    alts: [['Pixelfed', 'https://pixelfed.org', 'federated photo sharing, no ads, chronological']] },
  { name: 'Reddit', cat: 'social', match: ['reddit', 'subreddit', 'forum', 'r/'],
    alts: [['Lemmy', 'https://join-lemmy.org', 'federated link aggregator'], ['Mbin', 'https://joinmbin.org', 'federated threads + microblogs'], ['Tildes', 'https://tildes.net', 'non-profit, thoughtful discussion'], ['Redlib', 'https://farside.link/redlib/', 'read Reddit without tracking (frontend)']] },
  { name: 'TikTok / Reels', cat: 'video', match: ['tiktok', 'reels', 'shorts', 'short video'],
    alts: [['Loops', 'https://joinloops.org', 'federated short video'], ['PeerTube', 'https://joinpeertube.org', 'federated video'], ['ProxiTok', 'https://farside.link/proxitok/', 'watch TikTok without the app (frontend)']] },
  { name: 'Spotify / Apple Music', cat: 'music', match: ['spotify', 'apple music', 'music', 'streaming music', 'soundcloud'],
    alts: [['Funkwhale', 'https://www.funkwhale.audio', 'federated music + podcasts'], ['Navidrome', 'https://www.navidrome.org', 'self-hosted music streaming'], ['Jellyfin', 'https://jellyfin.org', 'self-hosted media server'], ['Radio Browser', 'https://www.radio-browser.info', 'thousands of free internet radios']] },
  { name: 'Google Translate', cat: 'tools', match: ['translate', 'google translate', 'translation', 'deepl'],
    alts: [['LibreTranslate', 'https://libretranslate.com', 'open-source, self-hostable MT'], ['Lingva', 'https://farside.link/lingva/', 'frontend for Google Translate'], ['Firefox Translations', 'https://www.mozilla.org/firefox/features/translate/', 'translation runs locally in your browser']] },
  { name: 'Google Photos', cat: 'cloud', match: ['photos', 'google photos', 'icloud photos', 'photo backup', 'gallery'],
    alts: [['Immich', 'https://immich.app', 'self-hosted Google Photos replacement'], ['Ente', 'https://ente.io', 'end-to-end encrypted photo backup'], ['PhotoPrism', 'https://www.photoprism.app', 'self-hosted AI photo library']] },
  { name: 'Zoom / Google Meet / Teams', cat: 'meet', match: ['zoom', 'meet', 'google meet', 'teams', 'skype', 'video call', 'webex'],
    alts: [['Jitsi Meet', 'https://meet.jit.si', 'no account, open source'], ['BigBlueButton', 'https://bigbluebutton.org', 'self-hosted classrooms'], ['Signal calls', 'https://signal.org', 'encrypted group calls']] },
  { name: 'Slack / Discord', cat: 'chat', match: ['slack', 'discord', 'team chat', 'community chat'],
    alts: [['Element / Matrix', 'https://element.io', 'federated, encrypted rooms'], ['Zulip', 'https://zulip.com', 'threaded open-source team chat'], ['Mattermost', 'https://mattermost.com', 'self-hosted Slack-style']] },
  { name: 'GitHub', cat: 'code', match: ['github', 'git', 'code hosting', 'repository', 'repo', 'gitlab'],
    alts: [['Codeberg', 'https://codeberg.org', 'non-profit, community-run forge'], ['Forgejo', 'https://forgejo.org', 'self-host your own forge'], ['SourceHut', 'https://sourcehut.org', 'minimal, no-JS hacker forge']] },
  { name: 'Medium / Substack', cat: 'blog', match: ['medium', 'substack', 'blog', 'blogging', 'newsletter'],
    alts: [['Scribe', 'https://scribe.rip', 'read Medium without the junk (frontend)'], ['WriteFreely', 'https://writefreely.org', 'federated minimalist blogging'], ['Bear Blog', 'https://bearblog.dev', 'tiny, fast, no trackers']] },
  { name: 'Amazon Kindle / Audible', cat: 'books', match: ['kindle', 'amazon', 'ebook', 'books', 'audible', 'goodreads'],
    alts: [['Project Gutenberg', 'https://www.gutenberg.org', '70,000+ free public domain books'], ['Standard Ebooks', 'https://standardebooks.org', 'beautiful free ebooks'], ['Open Library', 'https://openlibrary.org', 'borrow books, Internet Archive'], ['Calibre', 'https://calibre-ebook.com', 'manage your own library']] },
  { name: 'Windows / macOS', cat: 'os', match: ['windows', 'macos', 'mac', 'windows 11', 'operating system', 'os'],
    alts: [['Linux Mint', 'https://linuxmint.com', 'friendly Linux desktop'], ['Fedora', 'https://fedoraproject.org', 'modern, upstream Linux'], ['Tails', 'https://tails.net', 'amnesic OS, everything over Tor'], ['Qubes OS', 'https://www.qubes-os.org', 'security by compartmentalisation']] },
  { name: 'Android (Google) / iOS', cat: 'os', match: ['android', 'ios', 'iphone', 'phone', 'google play', 'play store', 'app store'],
    alts: [['GrapheneOS', 'https://grapheneos.org', 'hardened, de-Googled Android'], ['LineageOS', 'https://lineageos.org', 'free Android distribution'], ['/e/OS', 'https://e.foundation', 'de-Googled Android + cloud'], ['F-Droid', 'https://f-droid.org', 'free & open-source app store']] },
  { name: 'Google Analytics', cat: 'webmaster', match: ['analytics', 'google analytics', 'tracking pixel', 'web stats'],
    alts: [['GoatCounter', 'https://www.goatcounter.com', 'tiny, no cookies'], ['Plausible', 'https://plausible.io', 'cookieless, EU hosted'], ['Umami', 'https://umami.is', 'self-hostable, cookieless'], ['Matomo', 'https://matomo.org', 'self-hosted, full-featured']] },
  { name: 'reCAPTCHA', cat: 'webmaster', match: ['captcha', 'recaptcha', 'bot check'],
    alts: [['ALTCHA', 'https://altcha.org', 'proof-of-work, no tracking'], ['Friendly Captcha', 'https://friendlycaptcha.com', 'privacy-first, no puzzles'], ['mCaptcha', 'https://mcaptcha.org', 'open-source proof-of-work']] },
  { name: 'Google Fonts / CDNs', cat: 'webmaster', match: ['google fonts', 'fonts', 'cdn', 'font'],
    alts: [['Self-host your fonts', 'https://gwfh.mranftl.com/fonts', 'download, serve from your own domain (like this site does)'], ['Bunny Fonts', 'https://fonts.bunny.net', 'drop-in, no logging']] },
  { name: 'Google Calendar', cat: 'office', match: ['calendar', 'google calendar', 'outlook calendar'],
    alts: [['Proton Calendar', 'https://proton.me/calendar', 'encrypted calendar'], ['Tuta Calendar', 'https://tuta.com', 'encrypted calendar'], ['Nextcloud Calendar', 'https://nextcloud.com', 'self-hosted CalDAV']] },
  { name: 'LastPass / 1Password / Chrome passwords', cat: 'security', match: ['password', 'lastpass', '1password', 'password manager', 'passwords'],
    alts: [['Bitwarden', 'https://bitwarden.com', 'open-source, audited, self-hostable'], ['KeePassXC', 'https://keepassxc.org', 'offline encrypted vault'], ['Proton Pass', 'https://proton.me/pass', 'encrypted, with email aliases']] },
  { name: 'Shady VPNs', cat: 'security', match: ['vpn', 'nordvpn', 'expressvpn', 'proxy', 'anonymous'],
    alts: [['Mullvad VPN', 'https://mullvad.net', 'no email, cash accepted, audited'], ['Proton VPN', 'https://protonvpn.com', 'free tier, open source'], ['IVPN', 'https://www.ivpn.net', 'no-logs, audited'], ['Tor', 'https://www.torproject.org', 'free onion routing']] },
  { name: 'Google / ISP DNS', cat: 'security', match: ['dns', '8.8.8.8', 'google dns', 'cloudflare dns', '1.1.1.1'],
    alts: [['Quad9', 'https://quad9.net', 'non-profit, blocks malware, no IP logging'], ['Mullvad DNS', 'https://mullvad.net/help/dns-over-https-and-dns-over-tls', 'free encrypted DNS with ad blocking'], ['NextDNS', 'https://nextdns.io', 'configurable blocking']] },
  { name: 'Fandom wikis', cat: 'wiki', match: ['fandom', 'wikia', 'fan wiki'],
    alts: [['BreezeWiki', 'https://breezewiki.com', 'Fandom without ads and trackers'], ['Indie Wiki Buddy', 'https://getindie.wiki', 'redirects to independent wikis']] },
  { name: 'Stack Overflow', cat: 'code', match: ['stackoverflow', 'stack overflow', 'stackexchange'],
    alts: [['AnonymousOverflow', 'https://farside.link/anonymousoverflow/', 'read Stack Overflow without tracking (frontend)']] },
  { name: 'Imgur / Pinterest', cat: 'images', match: ['imgur', 'pinterest', 'moodboard'],
    alts: [['rimgo', 'https://farside.link/rimgo/', 'Imgur frontend'], ['Are.na', 'https://www.are.na', 'ad-free, slow, human curation'], ['Openverse', 'https://openverse.org', 'search openly-licensed images']] },
  { name: 'Evernote / Google Keep', cat: 'office', match: ['notes', 'evernote', 'keep', 'google keep', 'onenote'],
    alts: [['Joplin', 'https://joplinapp.org', 'open-source, E2E sync'], ['Standard Notes', 'https://standardnotes.com', 'encrypted notes'], ['Obsidian', 'https://obsidian.md', 'local markdown files'], ['Logseq', 'https://logseq.com', 'local-first outliner']] },
  { name: 'Cloud AI chatbots', cat: 'ai', match: ['chatgpt', 'ai', 'gemini', 'copilot', 'llm', 'chatbot', 'ai chat'],
    alts: [['Ollama', 'https://ollama.com', 'run open models on your own machine'], ['Jan', 'https://jan.ai', 'offline desktop AI app'], ['llama.cpp', 'https://github.com/ggml-org/llama.cpp', 'local inference engine'], ['GPT4All', 'https://www.nomic.ai/gpt4all', 'local, private chat']] },
  { name: 'Google News / algorithmic feeds', cat: 'news', match: ['news', 'google news', 'feed', 'rss', 'apple news'],
    alts: [['FreshRSS', 'https://freshrss.org', 'self-hosted RSS reader'], ['Miniflux', 'https://miniflux.app', 'minimalist RSS'], ['NetNewsWire', 'https://netnewswire.com', 'Mac/iOS RSS, free']] },
  { name: 'Spotify podcasts', cat: 'music', match: ['podcast', 'podcasts', 'google podcasts', 'apple podcasts'],
    alts: [['AntennaPod', 'https://antennapod.org', 'open-source Android podcast app'], ['Podcast Index', 'https://podcastindex.org', 'open podcast directory']] },
];

export function findAlts(q) {
  q = (q || '').toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/[\s,./:?&=]+/).filter(Boolean);
  const scored = [];
  for (const e of ALTS) {
    let s = 0;
    for (const k of e.match) {
      if (q === k) s += 10;
      else if (k.length > 2 && q.includes(k)) s += 5;
      else if (k.length > 1 && words.includes(k)) s += 4;
      else if (q.length >= 3 && k.startsWith(q)) s += 2;
    }
    if (s) scored.push([s, e]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]);
}

// ---- URL tools ----
const TRACK = /^(utm_.*|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|igsh|si|ref|ref_src|ref_url|_hsenc|_hsmi|yclid|twclid|ttclid|li_fat_id|spm|scid|vero_id|oly_.*|wickedid|mkt_tok|trk|trkCampaign|_ga|_gl|ncid|cmpid|sr_share|feature|share_id|s_cid|icid|campaign_id|ad_id|adgroupid|hsa_.*|pk_.*|mtm_.*|epik|rdt|__s|ss_source|ss_campaign_id)$/i;

export function looksLikeUrl(q) {
  q = q.trim();
  if (/\s/.test(q)) return false;
  return /^https?:\/\//i.test(q) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(q);
}

export function cleanUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return null; }
  // unwrap redirect wrappers
  const wrap = { 'www.google.com': 'q', 'google.com': 'q', 'l.facebook.com': 'u', 'lm.facebook.com': 'u', 'out.reddit.com': 'url', 'l.instagram.com': 'u', 'www.youtube.com': 'q', 'href.li': null };
  const removed = [];
  if (wrap[u.hostname] && (u.pathname === '/url' || u.pathname === '/l.php' || u.pathname === '/redirect' || u.hostname === 'out.reddit.com' || u.hostname === 'l.instagram.com')) {
    const inner = u.searchParams.get(wrap[u.hostname]);
    if (inner && /^https?:/.test(inner)) { removed.push('redirect wrapper ' + u.hostname); u = new URL(inner); }
  }
  for (const k of [...u.searchParams.keys()]) if (TRACK.test(k)) { removed.push(k); u.searchParams.delete(k); }
  if (u.hash && /^#?(:~:|xtor=|utm_)/.test(u.hash)) { removed.push('hash tracker'); u.hash = ''; }
  return { url: u.toString(), host: u.hostname.replace(/^www\./, ''), removed, u };
}

// rewrite a URL to privacy frontends. farside.link bounces to a random live instance.
export function reroute(u) {
  const h = u.hostname.replace(/^(www|m|mobile|old|new)\./, '');
  const path = u.pathname + u.search;
  const out = [];
  if (h === 'youtube.com' || h === 'youtu.be' || h === 'music.youtube.com') {
    const id = h === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
    const p = id ? '/watch?v=' + encodeURIComponent(id) : path;
    out.push(['Invidious (random instance)', 'https://farside.link/invidious' + p], ['Piped', 'https://farside.link/piped' + p]);
  } else if (h === 'twitter.com' || h === 'x.com') {
    out.push(['xcancel', 'https://xcancel.com' + path], ['Nitter (random)', 'https://farside.link/nitter' + path]);
  } else if (h === 'reddit.com') {
    out.push(['Redlib (random)', 'https://farside.link/redlib' + path]);
  } else if (h === 'medium.com' || h.endsWith('.medium.com')) {
    out.push(['Scribe', 'https://scribe.rip' + path]);
  } else if (h === 'imgur.com' || h === 'i.imgur.com') {
    out.push(['rimgo (random)', 'https://farside.link/rimgo' + path]);
  } else if (h.endsWith('.fandom.com')) {
    out.push(['BreezeWiki', 'https://breezewiki.com/' + h.split('.')[0] + u.pathname]);
  } else if (h === 'stackoverflow.com') {
    out.push(['AnonymousOverflow (random)', 'https://farside.link/anonymousoverflow' + path]);
  } else if (h === 'quora.com') {
    out.push(['Quetre (random)', 'https://farside.link/quetre' + path]);
  } else if (h === 'genius.com') {
    out.push(['Dumb (random)', 'https://farside.link/dumb' + path]);
  } else if (h === 'tiktok.com') {
    out.push(['ProxiTok (random)', 'https://farside.link/proxitok' + path]);
  } else if (h === 'imdb.com') {
    out.push(['libremdb (random)', 'https://farside.link/libremdb' + path]);
  } else if (h === 'google.com' && u.pathname.startsWith('/search')) {
    const q = u.searchParams.get('q') || '';
    out.push(['DuckDuckGo', 'https://duckduckgo.com/?q=' + encodeURIComponent(q)], ['Mojeek', 'https://www.mojeek.com/search?q=' + encodeURIComponent(q)]);
  } else if (h === 'google.com' && u.pathname.startsWith('/maps') || h === 'maps.google.com') {
    out.push(['OpenStreetMap', 'https://www.openstreetmap.org']);
  }
  const full = u.toString();
  out.push(['Wayback Machine', 'https://web.archive.org/web/2/' + full], ['archive.today', 'https://archive.ph/newest/' + full]);
  return out;
}

export function altsForHost(host) {
  host = (host || '').replace(/^www\./, '');
  const base = host.split('.').slice(-2, -1)[0] || host;
  return findAlts(host).concat(findAlts(base)).filter((e, i, a) => a.indexOf(e) === i);
}
