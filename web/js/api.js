// The router bumps this on every navigation. A GET that was started by a screen the
// reader has already left never resolves, so a slow response cannot repaint over the new screen.
export const nav = { id: 0 };

async function request(method, url, body) {
  const started = nav.id;
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (method === 'GET' && started !== nav.id) return new Promise(() => {});
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, auth: !!data.auth });
  return data;
}

const editions = new Map();

export const api = {
  authMe: () => request('GET', '/api/auth/me'),
  signup: (email, password) => request('POST', '/api/auth/signup', { email, password, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  track: (name, props) => request('POST', '/api/track', { name, props }).catch(() => {}),
  me: () => request('GET', '/api/me'),
  saveProfile: (patch) => request('PUT', '/api/profile', patch),
  reset: () => request('POST', '/api/reset'),
  catalog: () => request('GET', '/api/topics/catalog'),
  suggest: (text) => request('POST', '/api/topics/suggest', { text }),
  interpret: (text) => request('POST', '/api/topics/interpret', { text }),
  random: () => request('GET', '/api/topics/random?seed=' + Date.now()),
  adventurous: () => request('GET', '/api/topics/adventurous?seed=' + Date.now()),
  changeToday: (payload) => request('PUT', '/api/today', payload),
  async today() {
    const { edition } = await request('GET', '/api/today');
    editions.set(edition.id, edition);
    return edition;
  },
  async edition(id) {
    if (id === 'today') return api.today();
    if (editions.has(id)) return editions.get(id);
    const { edition } = await request('GET', '/api/editions/' + encodeURIComponent(id));
    editions.set(id, edition);
    return edition;
  },
  list: () => request('GET', '/api/editions'),
  ledger: (id) => request('GET', `/api/editions/${encodeURIComponent(id)}/ledger`),
  audio: (id, mode) => request('GET', `/api/editions/${encodeURIComponent(id)}/audio?mode=${mode}`),
  deliver: (id, channels) => request('POST', `/api/editions/${encodeURIComponent(id)}/deliver`, { channels: channels || [] }),
  hooks: (id, mode) => request('GET', `/api/editions/${encodeURIComponent(id)}/hooks?mode=${mode}`),
  sampleHooks: (mode) => request('GET', `/api/hooks/sample?mode=${mode}`),
  async previews(minutes) {
    const out = await request('GET', '/api/previews?minutes=' + minutes);
    editions.set(out.single.id, out.single);
    editions.set(out.multi.id, out.multi);
    return out;
  },
  forget(id) {
    if (id) editions.delete(id);
    else editions.clear();
  },
};
