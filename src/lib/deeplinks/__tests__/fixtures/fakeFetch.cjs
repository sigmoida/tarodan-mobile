// check-deeplinks.mjs testi için ağ yerine geçer (`node -r fakeFetch.cjs script`).
// STUB_DIR: üretilmiş dosyaların dizini. STUB_BREAK_PROD=1: production assetlinks 404.
// Her istek stderr'e "FETCH <url>" olarak yazılır (hangi URL'ler sorulmadı, test eder).
const fs = require('fs');
const path = require('path');

const STAGING = 'staging.tarodan.com.tr';
const read = (name) => {
  const f = path.join(process.env.STUB_DIR, name);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};
const res = (status, body = '', type = 'application/json') => ({
  status,
  headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
  text: async () => body,
});

globalThis.fetch = async (url) => {
  process.stderr.write(`FETCH ${url}\n`);
  const u = new URL(url);
  if (u.hostname === 'app-site-association.cdn-apple.com') return res(200, '{}');
  if (u.hostname === 'digitalassetlinks.googleapis.com') {
    return res(200, JSON.stringify({ statements: [{}] }));
  }
  if (u.pathname.endsWith('apple-app-site-association')) {
    const body = read('apple-app-site-association');
    return body ? res(200, body) : res(404);
  }
  if (u.pathname.endsWith('assetlinks.json')) {
    if (u.hostname !== STAGING && process.env.STUB_BREAK_PROD === '1') return res(404);
    const body = read(u.hostname === STAGING ? 'assetlinks.staging.json' : 'assetlinks.json');
    return body ? res(200, body) : res(404);
  }
  return res(404);
};
