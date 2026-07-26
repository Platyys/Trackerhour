const crypto = require('crypto');

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(payload, secret, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const data = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const json = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return `${json}.${sig}`;
}

function verify(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [json, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch (e) {
      out[k] = v;
    }
  });
  return out;
}

module.exports = { sign, verify, parseCookies, DEFAULT_MAX_AGE_SECONDS };
