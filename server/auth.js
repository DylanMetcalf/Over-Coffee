// Accounts: email + password (scrypt), opaque session tokens in an HttpOnly
// cookie. Only a hash of the token is stored, so a leaked database cannot be
// replayed as sessions.

import crypto from 'node:crypto';

const COOKIE = 'oc_session';
const DAYS = 60;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const want = Buffer.from(keyHex, 'hex');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function normaliseEmail(e) {
  return String(e || '').trim().toLowerCase();
}
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

export function startSession(store, userId, res, { secure }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = new Date(Date.now() + DAYS * 864e5);
  store.createSession(sha(token), userId, exp.toISOString());
  appendCookie(res, `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${secure ? '; Secure' : ''}`);
}

export function endSession(store, req, res) {
  const t = readCookie(req);
  if (t) store.deleteSession(sha(t));
  appendCookie(res, `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function userFromRequest(store, req) {
  const t = readCookie(req);
  return t ? store.sessionUser(sha(t)) : null;
}

function readCookie(req) {
  const m = /(?:^|;\s*)oc_session=([^;]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}

function appendCookie(res, value) {
  const prev = res.getHeader('set-cookie');
  res.setHeader('set-cookie', prev ? [].concat(prev, value) : value);
}

/** Short-lived signed token so headless Chromium can fetch /print/:id for PDFs without a cookie. */
let SECRET = process.env.OC_SECRET || crypto.randomBytes(32).toString('hex');
/** Signed links (unsubscribe, PDF render) must survive restarts: persist a generated secret when none is configured. */
export function initSecret(store) {
  if (process.env.OC_SECRET) return;
  let s = store.getSetting('secret');
  if (!s) {
    s = crypto.randomBytes(32).toString('hex');
    store.setSetting('secret', s);
  }
  SECRET = s;
}
export function sign(purpose, value) {
  return crypto.createHmac('sha256', SECRET).update(purpose + ':' + value).digest('base64url').slice(0, 32);
}
export function verifySigned(purpose, value, token) {
  const want = sign(purpose, value);
  return typeof token === 'string' && token.length === want.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(want));
}
export const printToken = (editionId) => sign('print', editionId);
export const checkPrintToken = (editionId, token) => verifySigned('print', editionId, token);
export const unsubToken = (userId) => sign('unsub', userId);

/** Tiny in-memory rate limit for auth endpoints. */
const hits = new Map();
export function rateLimited(key, max = 10, windowMs = 10 * 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
