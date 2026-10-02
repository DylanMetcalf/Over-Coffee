async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

const editions = new Map();

export const api = {
  me: () => request('GET', '/api/me'),
  saveProfile: (patch) => request('PUT', '/api/profile', patch),
  reset: () => request('POST', '/api/reset'),
  catalog: () => request('GET', '/api/topics/catalog'),
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
  email: (id) => request('POST', `/api/editions/${encodeURIComponent(id)}/email`),
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
