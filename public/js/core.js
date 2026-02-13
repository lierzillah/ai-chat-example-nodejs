/**
 * Polza Attribution Core v2.2
 * Сквозна аналітика для polza.com
 * Updated: 2025-12-13
 *
 * v2.2 Changes:
 * - fbclid now treated as Organic Social (Meta adds it to ALL links, not just ads)
 * - Cross-subdomain source now uses full URL (kir.polza.com instead of kir)
 * - Improved self-referral and payment gateway handling
 */

// ====================== LOG LEVELS ======================
// false = тільки помилки (production)
// 'info' = ключові події одним рядком (моніторинг)
// 'debug' = повний дебаг (розробка)
const POLZA_LOG_LEVEL = 'info';

const _isDebug = POLZA_LOG_LEVEL === 'debug';
const _isInfo = POLZA_LOG_LEVEL === 'info' || _isDebug;

// INFO: короткі повідомлення про ключові події
function logInfo(...args) {
  if (_isInfo)
    console.log('%c[Polza]', 'color: #4CAF50; font-weight: bold', ...args);
}

// DEBUG: детальні повідомлення для розробки
function log(...args) {
  if (_isDebug) console.log('[Polza]', ...args);
}
function logWarn(...args) {
  if (_isDebug) console.warn('[Polza]', ...args);
}
function logError(...args) {
  console.error('[Polza]', ...args); // Помилки показуємо завжди
}
function logTable(data, label = '') {
  if (_isDebug) {
    if (label) console.log('[Polza]', label);
    console.table(data);
  }
}

log('Core.js loaded, LOG_LEVEL =', POLZA_LOG_LEVEL);

// ====================== COOKIE HELPERS ======================
const COOKIE_DOMAIN = '.polza.com';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Attribution window: 90 days = 7776000 seconds (industry standard)
function setCookie(name, value, maxAge = 7776000) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; domain=${COOKIE_DOMAIN}; max-age=${maxAge}; secure; samesite=lax`;
}

function setCookieJSON(name, obj, maxAge = 7776000) {
  setCookie(name, JSON.stringify(obj), maxAge);
}

function getCookieJSON(name) {
  try {
    const val = getCookie(name);
    return val ? JSON.parse(decodeURIComponent(val)) : null;
  } catch (e) {
    logWarn('getCookieJSON parse error:', name, e);
    return null;
  }
}

// ====================== GA4 INTEGRATION ======================
const GA4_ID = 'G-DM4889FJH8';

// GA4 data will be stored here and sent with session
window.PolzaGA4 = {
  client_id: null,
  session_id: null,
  session_number: null,
  ready: false,
};

function gtagGet(target, field) {
  return new Promise((resolve) => {
    log(`GA4: Requesting ${field}...`);
    // Timeout fallback if gtag doesn't respond (ad blockers, etc.)
    const timeout = setTimeout(() => {
      logWarn(`GA4: Timeout waiting for ${field}`);
      resolve(null);
    }, 3000);
    if (typeof window.gtag === 'function') {
      window.gtag('get', target, field, (value) => {
        clearTimeout(timeout);
        log(`GA4: Got ${field} =`, value);
        resolve(value);
      });
    } else {
      clearTimeout(timeout);
      logWarn('GA4: gtag not available (ad blocker?)');
      resolve(null);
    }
  });
}

// Fetch GA4 data asynchronously
log('GA4: Starting data fetch...');
Promise.all([
  gtagGet(GA4_ID, 'client_id'),
  gtagGet(GA4_ID, 'session_id'),
  gtagGet(GA4_ID, 'session_number'),
]).then(([cid, sid, snum]) => {
  window.PolzaGA4 = {
    client_id: cid || null,
    session_id: sid || null,
    session_number: snum || null,
    ready: true,
  };
  log('GA4: Data ready:', window.PolzaGA4);

  // INFO: GA4 статус
  if (cid) {
    logInfo(`✓ GA4 linked (session #${snum || '?'})`);
  } else {
    logInfo('⚠ GA4 blocked (ad blocker?)');
  }

  // If attribution already sent AND session confirmed in DB, send GA4 data as update
  // This fixes race condition where GA4 data was ready before session was saved to DB
  if (window.PolzaAttribution && window.PolzaAttribution.session_id && cid) {
    if (window.PolzaAttribution.sessionSavedToDb) {
      // Session is confirmed in DB, safe to send GA4 update
      log('GA4: Session confirmed in DB, sending update...');
      window.PolzaGA4.updateSent = true;
      fetch('https://api.polza.com/v1/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ga4_update',
          session_id: window.PolzaAttribution.session_id,
          ga4_client_id: cid,
          ga4_session_id: sid,
          ga4_session_number: snum,
        }),
      })
        .then((r) => r.json())
        .then((data) => log('GA4: Update response:', data))
        .catch((err) => logError('GA4 update error:', err));
    } else {
      // Session not yet saved to DB - GA4 data will be sent after API response
      log(
        'GA4: Session not yet saved to DB, update will be sent after API response',
      );
    }
  } else {
    log('GA4: Skipping update (no attribution or no client_id)');
  }
});

(() => {
  log('Attribution: Starting...');

  // ====================== НАЛАШТУВАННЯ ======================
  const SOCIAL_DOMAINS = {
    // Meta platforms
    instagram: ['instagram.com', 'l.instagram.com'],
    facebook: [
      'facebook.com',
      'm.facebook.com',
      'lm.facebook.com',
      'l.facebook.com',
      'fb.com',
    ],
    threads: ['threads.net', 'threads.com'],
    whatsapp: ['whatsapp.com', 'wa.me', 'web.whatsapp.com'],
    // Video platforms
    youtube: ['youtube.com', 'youtu.be'],
    tiktok: ['tiktok.com'],
    twitch: ['twitch.tv'],
    // Microblogging
    twitter: ['twitter.com', 't.co', 'x.com'],
    bluesky: ['bsky.app', 'bsky.social'],
    // Professional & Community
    linkedin: ['linkedin.com', 'lnkd.in'],
    reddit: ['reddit.com'],
    discord: ['discord.com', 'discord.gg', 'discordapp.com'],
    // Messaging
    telegram: ['t.me', 'telegram.me', 'telegram.org', 'web.telegram.org'],
    // Visual & Lifestyle
    pinterest: ['pinterest.com', 'pin.it'],
    snapchat: ['snapchat.com'],
    xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
    // Other
    quora: ['quora.com'],
    medium: ['medium.com'],
    vk: ['vk.com', 'vk.ru'],
  };

  const SEARCH_ENGINES = {
    // Major search engines
    google: { domains: ['google.', 'googlesyndication.com'], qparams: ['q'] },
    bing: { domains: ['bing.com'], qparams: ['q'] },
    yahoo: { domains: ['search.yahoo.com'], qparams: ['p'] },
    duckduckgo: { domains: ['duckduckgo.com'], qparams: ['q'] },
    yandex: { domains: ['yandex.'], qparams: ['text', 'query'] },
    // Privacy-focused
    brave: { domains: ['search.brave.com'], qparams: ['q'] },
    startpage: { domains: ['startpage.com'], qparams: ['query'] },
    ecosia: { domains: ['ecosia.org'], qparams: ['q'] },
    // Regional
    baidu: { domains: ['baidu.com'], qparams: ['wd', 'word'] },
    naver: { domains: ['search.naver.com'], qparams: ['query'] },
    sogou: { domains: ['sogou.com'], qparams: ['query'] },
  };

  // AI/LLM-джерела (класифікуємо як Referral зі source=<label>)
  const AI_SOURCES = {
    // Major AI assistants
    chatgpt: ['chatgpt.com', 'chat.openai.com', 'openai.com'],
    deepseek: ['deepseek.com', 'chat.deepseek.com', 'api.deepseek.com'],
    claude: ['claude.ai'],
    gemini: ['gemini.google.com', 'bard.google.com'],
    grok: ['grok.com'],
    copilot: ['copilot.microsoft.com', 'bingcopilot.microsoft.com'],
    // AI Search
    perplexity: ['perplexity.ai'],
    you: ['you.com'],
    // Other AI
    meta_ai: ['meta.ai'],
    pi: ['pi.ai', 'inflection.ai'],
    poe: ['poe.com'],
  };

  // Редіректори, що підміняють реферер
  const REDIRECTORS = [
    'l.facebook.com',
    'lm.facebook.com',
    'l.instagram.com',
    't.co',
  ];

  // Self-referrals - IGNORE our own domains (internal navigation)
  // NOTE: kir.polza.com is NOT here - if someone comes from kir.polza.com
  // without attribution, we want to capture it as a referral source
  const SELF_REFERRERS = ['polza.com', 'www.polza.com', 'api.polza.com'];

  // Payment gateways - IGNORE these as referrers (treat as Direct)
  // When user returns from payment page, we don't want to overwrite attribution
  const IGNORED_REFERRERS = [
    ...SELF_REFERRERS,
    'wayforpay.com',
    'secure.wayforpay.com',
    'api.wayforpay.com',
    'liqpay.ua',
    'www.liqpay.ua',
    'fondy.ua',
    'pay.fondy.eu',
    'monobank.ua',
    'api.monobank.ua',
    'privatbank.ua',
    'privat24.ua',
    'portmone.com.ua',
  ];

  // Paid click IDs - these are ALWAYS from paid ads
  const PAID_CLICK_IDS = [
    'gclid', // Google Ads
    'gbraid', // Google Ads (iOS)
    'wbraid', // Google Ads (iOS)
    'dclid', // Google Display & Video 360
    'msclkid', // Microsoft/Bing Ads
    'ttclid', // TikTok Ads
    'twclid', // Twitter/X Ads
    'li_fat_id', // LinkedIn Ads
    'sccid', // Snapchat Ads
    'epik', // Pinterest Ads
    'yclid', // Yandex Ads
  ];

  // Tracking click IDs - added by platforms for ALL outbound links (organic + paid)
  // fbclid is added by Facebook/Instagram/Threads even for organic links from profiles, posts, etc.
  const ORGANIC_CLICK_IDS = [
    'fbclid', // Facebook/Meta - added to ALL external links, not just ads
  ];

  // All click IDs (for cookie storage)
  const CLICK_IDS = [...PAID_CLICK_IDS, ...ORGANIC_CLICK_IDS];

  // Узгодження коротких/нестандартних значень
  const SOURCE_ALIASES = {
    // Social - Meta
    ig: 'instagram',
    insta: 'instagram',
    fb: 'facebook',
    meta: 'facebook',
    threads: 'threads',
    wa: 'whatsapp',
    // Social - Video
    yt: 'youtube',
    tt: 'tiktok',
    tiktok: 'tiktok',
    // Social - Microblogging
    x: 'twitter',
    tw: 'twitter',
    bsky: 'bluesky',
    // Social - Professional & Community
    li: 'linkedin',
    'lnkd.in': 'linkedin',
    // Social - Messaging
    tg: 'telegram',
    telegram: 'telegram',
    // Social - Other
    pin: 'pinterest',
    snap: 'snapchat',
    sc: 'snapchat',
    xhs: 'xiaohongshu',
    rednote: 'xiaohongshu',
    red: 'xiaohongshu',
    // Search engines
    g: 'google',
    google: 'google',
    bing: 'bing',
    yahoo: 'yahoo',
    yandex: 'yandex',
    ddg: 'duckduckgo',
    brave: 'brave',
    // AI assistants
    chatgpt: 'chatgpt',
    'chatgpt.com': 'chatgpt',
    openai: 'chatgpt',
    'openai.com': 'chatgpt',
    'chat.openai.com': 'chatgpt',
    deepseek: 'deepseek',
    'deepseek.com': 'deepseek',
    grok: 'grok',
    xai: 'grok',
    claude: 'claude',
    anthropic: 'claude',
    gemini: 'gemini',
    bard: 'gemini',
    perplexity: 'perplexity',
    copilot: 'copilot',
  };

  // ====================== УТИЛІТИ ======================
  const qs = new URLSearchParams(location.search);
  const norm = (s) => (s || '').toLowerCase().trim();

  function getParam(name) {
    return qs.get(name) || '';
  }

  // Case-insensitive check for PAID click IDs only (gclid, msclkid, etc.)
  // fbclid is NOT included here - it's added by Meta for ALL links, not just ads
  function hasPaidClickId() {
    const searchLower = location.search.toLowerCase();
    return PAID_CLICK_IDS.some((id) => searchLower.includes(id + '='));
  }

  // Check for any click ID (for storage purposes)
  function hasClickId() {
    const searchLower = location.search.toLowerCase();
    return CLICK_IDS.some((id) => searchLower.includes(id + '='));
  }

  // Check if only fbclid is present (organic Meta traffic)
  function hasOnlyFbclid() {
    const searchLower = location.search.toLowerCase();
    return searchLower.includes('fbclid=') && !hasPaidClickId();
  }

  // Get click ID value case-insensitively
  function getClickIdValue(clickIdName) {
    // First try exact match
    const exact = qs.get(clickIdName);
    if (exact) return exact;
    // Then try case-insensitive search
    for (const [key, value] of qs.entries()) {
      if (key.toLowerCase() === clickIdName.toLowerCase()) {
        return value;
      }
    }
    return '';
  }

  function baseDomain(hostname) {
    if (!hostname) return '';
    const parts = hostname.toLowerCase().split('.').filter(Boolean);
    if (parts.length <= 2) return hostname.toLowerCase();
    const tlds3 = ['co.uk', 'com.au', 'com.br', 'com.ua', 'co.nz', 'co.jp'];
    const last2 = parts.slice(-2).join('.');
    const last3 = parts.slice(-3).join('.');
    return tlds3.includes(last3) ? last3 : last2;
  }

  function parseReferrer() {
    const ref = document.referrer || '';
    log('Referrer: raw =', ref || '(empty)');
    if (!ref) return { host: '', domain: '', href: '', ignored: false };
    try {
      const u = new URL(ref);

      // IGNORE payment gateways and self-referrals - treat as Direct (no referrer)
      // Set ignored: true so we know to skip attribution update
      // Use exact match for self-referrers (polza.com), but includes for payment gateways
      const isSelfReferrer = SELF_REFERRERS.some((d) => u.hostname === d);
      const isPaymentGateway = IGNORED_REFERRERS.some(
        (d) => !SELF_REFERRERS.includes(d) && u.hostname.includes(d),
      );
      if (isSelfReferrer || isPaymentGateway) {
        log(
          'Referrer: IGNORED:',
          u.hostname,
          isSelfReferrer ? '(self)' : '(payment gateway)',
        );
        return { host: '', domain: '', href: '', ignored: true };
      }

      if (REDIRECTORS.includes(u.hostname)) {
        log('Referrer: Detected redirector:', u.hostname);
        const uParam = new URLSearchParams(u.search).get('u');
        if (uParam) {
          const real = new URL(uParam);
          log('Referrer: Resolved to:', real.hostname);
          return {
            host: real.hostname,
            domain: baseDomain(real.hostname),
            href: real.href,
            ignored: false,
          };
        }
      }
      return {
        host: u.hostname,
        domain: baseDomain(u.hostname),
        href: u.href,
        ignored: false,
      };
    } catch {
      return { host: '', domain: '', href: '', ignored: false };
    }
  }

  function detectSearchEngineDomain(d) {
    for (const [name, cfg] of Object.entries(SEARCH_ENGINES)) {
      if (cfg.domains.some((x) => d.includes(x))) return name;
    }
    return '';
  }

  function isOrganic(hostOrDomain) {
    return !!detectSearchEngineDomain(hostOrDomain || '');
  }

  function isSocialDomain(host) {
    for (const [name, domains] of Object.entries(SOCIAL_DOMAINS)) {
      if (domains.some((d) => (host || '').includes(d))) return name;
    }
    return '';
  }

  function detectAISourceName(input) {
    const s = norm(input);
    if (!s) return '';
    let candidate = s;
    try {
      if (s.startsWith('http')) candidate = new URL(s).hostname;
    } catch {}
    const d = candidate.includes('.') ? baseDomain(candidate) : candidate;
    for (const [label, domains] of Object.entries(AI_SOURCES)) {
      if (domains.some((x) => d.endsWith(x))) return label;
    }
    if (['chatgpt', 'openai'].includes(d)) return 'chatgpt';
    return '';
  }

  function resolveSourceFromUTM(utm_source) {
    const s = norm(utm_source);
    if (!s) return '';
    try {
      const host = s.startsWith('http') ? new URL(s).hostname : s;
      const d = host.includes('.') ? baseDomain(host) : host;
      const ai = detectAISourceName(d);
      if (ai) return ai;
      const social = isSocialDomain(d);
      if (social) return social;
      return SOURCE_ALIASES[d] || d;
    } catch {}
    return SOURCE_ALIASES[s] || s;
  }

  // ====================== КЛАСИФІКАЦІЯ ======================
  function classifyChannel({
    utm_source,
    utm_medium,
    utm_campaign,
    refHost,
    refDomain,
  }) {
    const src = norm(utm_source);
    const med = norm(utm_medium);
    const hasUtm = !!(src || utm_campaign);

    log('Classification input:', {
      utm_source,
      utm_medium,
      utm_campaign,
      refHost,
      refDomain,
    });

    const srcResolved = resolveSourceFromUTM(src);
    const aiFromUTM = detectAISourceName(srcResolved);
    const aiFromRef =
      detectAISourceName(refHost) || detectAISourceName(refDomain);

    const paidMediums = [
      'cpc',
      'ppc',
      'paid',
      'ads',
      'ad',
      'sem',
      'display',
      'remarketing',
      'retargeting',
      'paid-social',
      'social_paid',
      'paidsocial',
    ];
    const socialMediums = [
      'social',
      'social-network',
      'social-media',
      'sm',
      'organic-social',
    ];
    const emailMediums = ['email', 'e-mail', 'newsletter'];
    const affiliateMediums = [
      'affiliate',
      'partner',
      'revshare',
      'cpa',
      'referral-paid',
    ];
    const smsMediums = [
      'sms',
      'messenger',
      'im',
      'whatsapp',
      'viber',
      'telegram',
    ];

    // 1) Paid: paid click IDs (gclid, msclkid, ttclid, etc.) OR paid medium
    // Note: fbclid alone is NOT paid - Meta adds it to ALL outbound links including organic
    if (hasPaidClickId() || paidMediums.includes(med)) {
      log(
        'Classification: Detected PAID traffic (paid click ID or paid medium)',
      );
      const isSearchSrc = [
        'google',
        'bing',
        'yahoo',
        'yandex',
        'duckduckgo',
        'baidu',
        'naver',
        'ecosia',
        'brave',
        'startpage',
        'sogou',
      ].includes(srcResolved);
      const socialName =
        isSocialDomain(srcResolved) || isSocialDomain(refHost) || '';
      if (socialName) return { channel: 'Paid Social', source: socialName };
      if (isSearchSrc || ['sem', 'cpc', 'ppc'].includes(med)) {
        return {
          channel: 'Paid Search',
          source:
            srcResolved || detectSearchEngineDomain(refDomain) || 'unknown',
        };
      }
      if (med === 'display' || (srcResolved && srcResolved.endsWith('ads'))) {
        return { channel: 'Display', source: srcResolved || 'display' };
      }
      return { channel: 'Paid', source: srcResolved || 'unknown' };
    }

    // 1.5) Organic Social from Meta platforms (fbclid without paid medium)
    // Facebook adds fbclid to ALL external links - from profiles, posts, comments, etc.
    if (hasOnlyFbclid()) {
      const metaSocial = isSocialDomain(refHost) || isSocialDomain(refDomain);
      if (metaSocial) {
        log(
          'Classification: Detected ORGANIC SOCIAL (fbclid from Meta platform)',
        );
        return { channel: 'Organic Social', source: metaSocial };
      }
    }

    // 2) Email
    if (emailMediums.includes(med)) {
      log('Classification: Detected EMAIL traffic');
      return { channel: 'Email', source: resolveSourceFromUTM(src) || 'email' };
    }

    // 3) Affiliate
    if (affiliateMediums.includes(med)) {
      log('Classification: Detected AFFILIATE traffic');
      return {
        channel: 'Affiliate',
        source: resolveSourceFromUTM(src) || baseDomain(refHost) || 'affiliate',
      };
    }

    // 4) SMS/Messenger
    if (smsMediums.includes(med)) {
      log('Classification: Detected SMS/MESSENGER traffic');
      return {
        channel: 'SMS/Messenger',
        source: resolveSourceFromUTM(src) || baseDomain(refHost) || 'messenger',
      };
    }

    // 5) AI-асистенти (за UTM або за реферером)
    if (aiFromUTM || aiFromRef) {
      log('Classification: Detected AI REFERRAL traffic');
      return { channel: 'Referral', source: aiFromUTM || aiFromRef };
    }

    // 6) UTM із social-medium → Organic Social
    if (socialMediums.includes(med)) {
      log('Classification: Detected ORGANIC SOCIAL traffic (via medium)');
      const s =
        resolveSourceFromUTM(src) || isSocialDomain(refHost) || 'social';
      return { channel: 'Organic Social', source: s };
    }

    // 7) Без UTM: беремо реферер
    if (refHost) {
      const socialName = isSocialDomain(refHost);
      if (socialName) {
        log('Classification: Detected ORGANIC SOCIAL traffic (via referrer)');
        return { channel: 'Organic Social', source: socialName };
      }

      if (isOrganic(refHost) || isOrganic(refDomain)) {
        log('Classification: Detected ORGANIC SEARCH traffic');
        const se =
          detectSearchEngineDomain(refHost) ||
          detectSearchEngineDomain(refDomain);
        return { channel: 'Organic Search', source: se || 'search' };
      }
      log('Classification: Detected REFERRAL traffic');
      return { channel: 'Referral', source: baseDomain(refHost) };
    }

    // 8) Є UTM, але без реферера
    if (hasUtm) {
      log('Classification: Has UTM but no referrer');
      if (aiFromUTM) return { channel: 'Referral', source: aiFromUTM };
      const socialName = isSocialDomain(srcResolved);
      if (socialName) return { channel: 'Organic Social', source: socialName };
      if (
        [
          'google',
          'bing',
          'yahoo',
          'yandex',
          'duckduckgo',
          'baidu',
          'naver',
          'ecosia',
          'brave',
          'startpage',
          'sogou',
        ].includes(srcResolved)
      ) {
        return { channel: 'Organic Search', source: srcResolved };
      }
      return { channel: 'Other', source: srcResolved || 'utm' };
    }

    // 9) Direct
    log('Classification: DIRECT traffic (no referrer, no UTM)');
    return { channel: 'Direct', source: '(direct)' };
  }

  // ====================== ЗБІР ДАНИХ ======================
  const utm = {
    source: getParam('utm_source'),
    medium: getParam('utm_medium'),
    campaign: getParam('utm_campaign'),
    term: getParam('utm_term'),
    content: getParam('utm_content'),
  };

  log('UTM params:', utm);

  const click_ids = {};
  CLICK_IDS.forEach((k) => {
    const v = getClickIdValue(k);
    if (v) click_ids[k] = v;
  });
  if (Object.keys(click_ids).length > 0) {
    log('Click IDs found:', click_ids);
  }

  const ref = parseReferrer();
  log('Referrer parsed:', ref);

  // Cross-subdomain referral tracking via _polza_ref parameter
  // (fallback when document.referrer is empty due to Referrer-Policy)
  const polzaRef = getParam('_polza_ref');
  if (polzaRef && !ref.host) {
    ref.host = polzaRef + '.polza.com';
    ref.domain = 'polza.com';
    ref.href = 'https://' + ref.host + '/';
    ref.internalSource = polzaRef; // Keep subdomain name for source (e.g., "kir")
    log('CrossSubdomain: Using _polza_ref as referrer:', ref.host);
  }

  const landing = location.href.split('#')[0];
  log('Landing page:', landing);

  // ====================== ВИЗНАЧЕННЯ КАНАЛУ ======================
  const { channel, source } = classifyChannel({
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    refHost: ref.host,
    refDomain: ref.domain,
  });

  log('Channel classification result:', { channel, source });

  // Нормалізація source
  // For internal subdomain referrals, use full subdomain (e.g., "kir.polza.com")
  let sourceFinal =
    source || resolveSourceFromUTM(utm.source) || ref.domain || '(direct)';

  // Cross-subdomain: use full subdomain URL instead of just "polza.com"
  if (polzaRef && (sourceFinal === 'polza.com' || ref.internalSource)) {
    sourceFinal = polzaRef + '.polza.com'; // e.g., "kir.polza.com"
  }

  if (SOURCE_ALIASES[sourceFinal]) sourceFinal = SOURCE_ALIASES[sourceFinal];
  // Don't apply baseDomain to internal subdomain sources
  if (sourceFinal.includes('.') && !polzaRef)
    sourceFinal = baseDomain(sourceFinal);

  log('Final source:', sourceFinal);

  // ====================== ОБ'ЄКТ АТРИБУЦІЇ ======================
  const attr = {
    channel, // тип трафіку
    source: sourceFinal, // джерело
    medium:
      norm(utm.medium) ||
      (hasClickId() ? 'cpc' : ref.host ? 'referral' : '(none)'),
    campaign: utm.campaign || '',
    term: utm.term || '',
    content: utm.content || '',
    referrer: ref.href || '',
    landing_page: landing,
    click_ids,
    ts: new Date().toISOString(),
    session_id: (() => {
      const key = 'polza_session_id';
      // Check cookie first (cross-subdomain), then sessionStorage (fallback)
      let id = getCookie(key) || sessionStorage.getItem(key);
      if (!id) {
        id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
          (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
          ).toString(16),
        );
        log('Session: Created new session_id:', id);
      } else {
        log('Session: Using existing session_id:', id);
      }
      // Always set cookie for cross-subdomain support (1 hour = session duration)
      setCookie(key, id, 3600);
      sessionStorage.setItem(key, id); // Keep sessionStorage for same-tab consistency
      return id;
    })(),
  };

  // ====================== ЗБЕРЕЖЕННЯ FT/ST ======================
  const FT_KEY = 'polza_ft';
  const ST_KEY = 'polza_st';

  // Compact attribution for cookies (key fields only to stay under 4KB limit)
  const attrCompact = {
    ch: attr.channel, // channel
    src: attr.source, // source
    med: attr.medium, // medium
    cmp: attr.campaign, // campaign
    lp: attr.landing_page, // landing_page
    ts: attr.ts, // timestamp
    sid: attr.session_id, // session_id
  };

  // First Touch: check cookie first, then localStorage (migration)
  let existingFT =
    getCookieJSON(FT_KEY) ||
    (() => {
      try {
        return JSON.parse(
          localStorage.getItem('polza_attribution_ft') || 'null',
        );
      } catch {
        return null;
      }
    })();

  if (!existingFT) {
    setCookieJSON(FT_KEY, attrCompact, 365 * 24 * 3600); // 1 year
    log('First Touch: Saved (new visitor)');
  } else {
    log('First Touch: Already exists (returning visitor)');
    // Migrate from localStorage to cookie if needed
    if (!getCookieJSON(FT_KEY)) {
      const ftCompact = {
        ch: existingFT.channel || existingFT.ch,
        src: existingFT.source || existingFT.src,
        med: existingFT.medium || existingFT.med,
        cmp: existingFT.campaign || existingFT.cmp,
        lp: existingFT.landing_page || existingFT.lp,
        ts: existingFT.ts,
        sid: existingFT.session_id || existingFT.sid,
      };
      setCookieJSON(FT_KEY, ftCompact, 365 * 24 * 3600);
      log('First Touch: Migrated to cookie');
    }
  }

  // Session Touch: always update (1 hour expiry like session)
  setCookieJSON(ST_KEY, attrCompact, 3600);
  log('Session Touch: Saved');

  // ====================== PUSH У dataLayer ======================
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'polza_attribution',
    polza_attribution: attr,
    polza_attribution_ft: getCookieJSON(FT_KEY) || existingFT || {},
  });
  log('DataLayer: Pushed polza_attribution event');

  // Глобально (за потреби використовуй у своїх скриптах/бекенді)
  window.PolzaAttribution = attr;
  window.PolzaAttribution.sessionSavedToDb = false; // Will be set to true after API response

  // INFO: First Touch vs Current Session
  const ft = getCookieJSON(FT_KEY) || existingFT;
  const isNewVisitor = !existingFT;
  const currentStr =
    `${attr.channel} | ${attr.source}/${attr.medium}` +
    (attr.campaign ? ` | ${attr.campaign}` : '');

  if (isNewVisitor) {
    logInfo(`✓ NEW VISITOR: ${currentStr}`);
  } else {
    // Returning visitor - show both FT and current
    const ftChannel = ft.ch || ft.channel || '?';
    const ftSource = ft.src || ft.source || '?';
    const ftMedium = ft.med || ft.medium || '?';
    const ftCampaign = ft.cmp || ft.campaign || '';
    const ftStr =
      `${ftChannel} | ${ftSource}/${ftMedium}` +
      (ftCampaign ? ` | ${ftCampaign}` : '');

    // Format FT date
    const ftDate = ft.ts ? new Date(ft.ts).toLocaleDateString('uk-UA') : '?';

    logInfo(`✓ RETURNING: First Touch (${ftDate}): ${ftStr}`);
    logInfo(`✓ CURRENT:   This Session: ${currentStr}`);
  }

  logTable(attr, 'Attribution Object:');

  // ====================== ВІДПРАВКА В DATABASE ======================
  // If referrer was ignored (payment gateway), skip attribution update
  // isNewVisitor is defined above (line 614)
  const skipAttribution = ref.ignored && !isNewVisitor;

  log(
    'API: Sending session to server...',
    skipAttribution ? '(skip_attribution=true)' : '',
  );
  const requestBody = {
    action: 'session',
    session_id: attr.session_id,
    attribution: attr,
    skip_attribution: skipAttribution,
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    device_type: (() => {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua))
        return 'tablet';
      if (
        /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
          ua,
        )
      )
        return 'mobile';
      return 'desktop';
    })(),
    browser: (() => {
      const ua = navigator.userAgent;
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Edg')) return 'Edge';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari')) return 'Safari';
      return 'Other';
    })(),
    os: (() => {
      const ua = navigator.userAgent;
      if (ua.includes('Win')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Other';
    })(),
  };

  log('API: Request body:', requestBody);

  fetch('https://api.polza.com/v1/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      log('API: Response status:', response.status);
      return response.json();
    })
    .then((data) => {
      log('API: Response data:', data);

      // Save encoded_id from API response for Telegram links
      if (data.success && data.data && data.data.encoded_id) {
        setCookie('polza_session_hash', data.data.encoded_id); // uses default 90 days
        window.PolzaAttribution.encoded_id = data.data.encoded_id;
        window.PolzaAttribution.sessionSavedToDb = true; // Session is now confirmed in DB
        log('Session: encoded_id saved:', data.data.encoded_id);

        // INFO: сесія збережена
        const action =
          data.data.action === 'created' ? '→ new session' : '→ updated';
        logInfo(`✓ API ${action} (db_id: ${data.data.session_db_id || '?'})`);

        // Update Telegram links with session_id
        log('Telegram: Triggering link update...');
        updateTelegramLinks();

        // Send pending GA4 data if available (fixes race condition)
        if (
          window.PolzaGA4 &&
          window.PolzaGA4.ready &&
          window.PolzaGA4.client_id &&
          !window.PolzaGA4.updateSent
        ) {
          log('GA4: Session now saved, sending pending GA4 update...');
          window.PolzaGA4.updateSent = true;
          fetch('https://api.polza.com/v1/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ga4_update',
              session_id: window.PolzaAttribution.session_id,
              ga4_client_id: window.PolzaGA4.client_id,
              ga4_session_id: window.PolzaGA4.session_id,
              ga4_session_number: window.PolzaGA4.session_number,
            }),
          })
            .then((r) => r.json())
            .then((res) => log('GA4: Pending update response:', res))
            .catch((err) => logError('GA4 pending update error:', err));
        }
      } else {
        logWarn('API: No encoded_id in response');
      }
    })
    .catch((err) => logError('API: Error:', err));

  // Cookie for session_id already set above in session_id generator
})();

// ====================== DECODE SESSION ID (FOR TELEGRAM LINKS) ======================
/**
 * Decode encoded session hash to get DB id
 * Uses same algorithm as PHP: XOR with secret key + base64
 */
function decodeSessionId(hash) {
  try {
    // Secret key (same as in PHP)
    const secret = 'polza_attribution_2025';

    // Calculate CRC32 (same as PHP)
    const crc32 = (str) => {
      let crc = 0 ^ -1;
      for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ str.charCodeAt(i)) & 0xff];
      }
      return (crc ^ -1) >>> 0;
    };

    // CRC32 lookup table
    const crc32Table = (() => {
      let c,
        table = [];
      for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    })();

    const key = crc32(secret);

    // Decode base64 (URL-safe)
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);

    if (decoded.length !== 4) {
      logWarn('decodeSessionId: Invalid hash length');
      return null;
    }

    // Convert to uint32
    const bytes = new Uint8Array(decoded.split('').map((c) => c.charCodeAt(0)));
    const dataView = new DataView(bytes.buffer);
    const encoded = dataView.getUint32(0, false); // big-endian

    // XOR to decode
    const id = (encoded ^ key) >>> 0;

    log('decodeSessionId:', hash, '->', id);
    return id;
  } catch (e) {
    logError('decodeSessionId error:', e);
    return null;
  }
}

// ====================== UPDATE TELEGRAM LINKS ======================
/**
 * Add --sid-X to all Telegram bot links
 * Similar to affiliate.js but for session tracking
 */
let _telegramLinksSessionId = null;
let _telegramLinksMutationObserver = null;

function updateTelegramLinks(targetElement = document) {
  log('Telegram: updateTelegramLinks called');

  // Get session ID from cache, PolzaAttribution, or cookie
  if (!_telegramLinksSessionId) {
    const encodedHash =
      window.PolzaAttribution?.encoded_id || getCookie('polza_session_hash');
    log('Telegram: encodedHash =', encodedHash || '(none)');

    if (!encodedHash) {
      log('Telegram: No encoded_id yet, will retry later');
      return 0; // Silently return, will be called again when encoded_id arrives
    }
    _telegramLinksSessionId = decodeSessionId(encodedHash);
    log('Telegram: Decoded session DB id =', _telegramLinksSessionId);
  }

  if (!_telegramLinksSessionId) {
    logWarn('Telegram: Could not decode session ID');
    return 0;
  }

  // Find all Telegram bot links in target element
  const links = targetElement.getElementsByTagName('a');
  let updatedCount = 0;
  let totalTelegramLinks = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    // Check if it's a Telegram bot link
    if (link.href.indexOf('t.me/KirPolzaBot?start=') !== -1) {
      totalTelegramLinks++;
      // Check if already has --sid-
      if (link.href.indexOf('--sid-') === -1) {
        const oldHref = link.href;
        link.href += `--sid-${_telegramLinksSessionId}`;
        log('Telegram: Updated link:', oldHref, '->', link.href);
        updatedCount++;
      }
    }
  }

  log(
    `Telegram: Found ${totalTelegramLinks} bot links, updated ${updatedCount}`,
  );

  // INFO: якщо оновили посилання
  if (updatedCount > 0) {
    logInfo(
      `✓ Telegram links: ${updatedCount} updated (sid: ${_telegramLinksSessionId})`,
    );
  }

  return updatedCount;
}

/**
 * Start observing DOM for new Telegram links (for SPA/dynamic content)
 */
function startTelegramLinksObserver() {
  if (_telegramLinksMutationObserver) {
    log('Telegram: Observer already running');
    return;
  }

  log('Telegram: Starting MutationObserver');

  _telegramLinksMutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node itself is a Telegram link
          if (
            node.tagName === 'A' &&
            node.href &&
            node.href.indexOf('t.me/KirPolzaBot?start=') !== -1
          ) {
            log('Telegram: New link detected via MutationObserver');
            updateTelegramLinks(node.parentElement || document);
          }
          // Check children of added node
          else if (node.getElementsByTagName) {
            const links = node.getElementsByTagName('a');
            for (let i = 0; i < links.length; i++) {
              if (links[i].href.indexOf('t.me/KirPolzaBot?start=') !== -1) {
                log('Telegram: New link detected in added subtree');
                updateTelegramLinks(node);
                break;
              }
            }
          }
        }
      }
    }
  });

  _telegramLinksMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  log('Telegram: MutationObserver started');
}

// Initialize Telegram links tracking when DOM is ready
function initTelegramLinksTracking() {
  log('Telegram: Initializing...');

  // Try to update existing links
  const updated = updateTelegramLinks();
  log('Telegram: Initial update done, updated', updated, 'links');

  // Start observer for dynamic links (SPA support)
  if (document.body) {
    startTelegramLinksObserver();
  } else {
    logWarn('Telegram: document.body not ready');
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  log('DOM: Still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initTelegramLinksTracking);
} else {
  log('DOM: Already loaded');
  initTelegramLinksTracking();
}

// ====================== CROSS-SUBDOMAIN LINK TRACKING ======================
/**
 * Update links to polza.com from subdomains (kir.polza.com, etc.)
 * Adds _polza_ref parameter so we know where traffic came from
 * (since document.referrer may be empty due to Referrer-Policy)
 */
const MAIN_DOMAINS = ['polza.com', 'www.polza.com'];

function isOnSubdomain() {
  const host = location.hostname;
  // Check if we're on a subdomain (not main domain)
  return host.endsWith('.polza.com') && !MAIN_DOMAINS.includes(host);
}

function getCurrentSubdomain() {
  const host = location.hostname;
  if (host.endsWith('.polza.com')) {
    return host.replace('.polza.com', '');
  }
  return null;
}

function updateCrossSubdomainLinks(targetElement = document) {
  // Only run on subdomains
  if (!isOnSubdomain()) {
    log('CrossSubdomain: Not on subdomain, skipping');
    return 0;
  }

  const subdomain = getCurrentSubdomain();
  if (!subdomain) return 0;

  log('CrossSubdomain: Running on subdomain:', subdomain);

  const links = targetElement.getElementsByTagName('a');
  let updatedCount = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    try {
      const url = new URL(link.href, location.origin);

      // Check if link points to main polza.com domain
      if (MAIN_DOMAINS.includes(url.hostname)) {
        // Skip if already has _polza_ref
        if (url.searchParams.has('_polza_ref')) continue;
        // Skip if already has utm_source (don't override explicit UTM)
        if (url.searchParams.has('utm_source')) continue;

        // Add _polza_ref parameter
        url.searchParams.set('_polza_ref', subdomain);
        link.href = url.toString();
        log('CrossSubdomain: Updated link:', link.href);
        updatedCount++;
      }
    } catch (e) {
      // Skip invalid URLs
    }
  }

  if (updatedCount > 0) {
    logInfo(
      `✓ Cross-subdomain links: ${updatedCount} updated (_polza_ref=${subdomain})`,
    );
  }

  return updatedCount;
}

function initCrossSubdomainTracking() {
  if (!isOnSubdomain()) return;

  log('CrossSubdomain: Initializing...');

  // Update existing links
  updateCrossSubdomainLinks();

  // Observer for dynamic content
  if (document.body) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.getElementsByTagName
          ) {
            updateCrossSubdomainLinks(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    log('CrossSubdomain: MutationObserver started');
  }
}

// Initialize cross-subdomain tracking
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCrossSubdomainTracking);
} else {
  initCrossSubdomainTracking();
}

// ====================== ГЛОБАЛЬНА ФУНКЦІЯ ТРЕКІНГУ ПОДІЙ ======================
/**
 * Глобальна функція для трекінгу подій користувача
 * @param {string} eventType - Тип події: 'pageview', 'button_click', 'form_submit', 'video_play', etc.
 * @param {string} eventName - Назва події: 'CTA Invest Club', 'Form Step 1', etc.
 * @param {object} eventData - Додаткові дані події (опціонально)
 *
 * Використання:
 * trackEvent('button_click', 'CTA Invest Club', {button_id: 'invest-cta', section: 'hero'});
 * trackEvent('form_submit', 'Subscribe Form', {form_name: 'newsletter', step: 1});
 */
window.trackEvent = function (eventType, eventName, eventData = {}) {
  if (!window.PolzaAttribution || !window.PolzaAttribution.session_id) {
    logWarn('trackEvent: PolzaAttribution not initialized yet');
    return;
  }

  const payload = {
    action: 'event',
    session_id: window.PolzaAttribution.session_id,
    event_type: eventType,
    event_name: eventName,
    event_data: eventData,
    page_url: location.href,
    page_title: document.title,
  };

  log('trackEvent:', eventType, eventName, eventData);
  logInfo(`✓ Event: ${eventType} | ${eventName}`);

  fetch('https://api.polza.com/v1/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((data) => log('trackEvent response:', data))
    .catch((err) => logError('trackEvent error:', err));
};

logInfo('✓ Core.js v2.2 loaded');
