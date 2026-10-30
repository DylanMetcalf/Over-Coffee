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
  save: (editionId, storyId) => request('POST', '/api/saved', { editionId, storyId }),
  unsave: (editionId, storyId) => request('DELETE', '/api/saved', { editionId, storyId }),
  library: () => request('GET', '/api/library'),
  feedback: (editionId, storyId, signal) => request('POST', '/api/feedback', { editionId, storyId, signal }),
  clearPersonalisation: () => request('POST', '/api/personalisation/clear'),
  share: (editionId, storyId) => request('POST', '/api/share', { editionId, storyId }),
  pushSubscribe: (subscription) => request('POST', '/api/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint) => request('DELETE', '/api/push/subscribe', { endpoint }),
  saveProfile: (patch) => request('PUT', '/api/profile', patch),
  reset: () => request('POST', '/api/reset'),
  catalog: () => request('GET', '/api/topics/catalog'),
  suggest: (text) => request('POST', '/api/topics/suggest', { text }),
  interpret: (text) => request('POST', '/api/topics/interpret', { text }),
  random: () => request('GET', '/api/topics/random?seed=' + Date.now()),
  adventurous: () => request('GET', '/api/topics/adventurous?seed=' + Date.now()),
  async changeToday(payload) {
    const r = await request('PUT', '/api/today', payload);
    if (r.pending) return { editionId: (await api.today()).id }; // wait for the rebuilt edition
    return r;
  },
  sponsored: null,
  async today() {
    // The server answers "still preparing" after ~20s instead of holding the connection open.
    // Poll until the edition is ready (first editions on live news take roughly a minute).
    let r;
    for (let i = 0; i < 120; i++) {
      r = await request('GET', '/api/today');
      if (!r.pending) break;
      await new Promise((ok) => setTimeout(ok, 2500));
    }
    if (r.pending) throw new Error('Your edition is taking longer than usual. Give it a minute and try again.');
    const { edition, sponsored } = r;
    editions.set(edition.id, edition);
    api.sponsored = sponsored || null;
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
