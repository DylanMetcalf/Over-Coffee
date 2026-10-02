export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function longDate(iso) {
  return new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function shortDate(iso) {
  return new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function stamp(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${time} UTC`;
}

export function hm(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);

/** Topic accent colours, used sparingly in Business and generously in Social. */
export const TOPIC_TONE = {
  ai: 'violet',
  technology: 'violet',
  robotics: 'sky',
  manufacturing: 'sky',
  food: 'tomato',
  health: 'tomato',
  farming: 'sage',
  climate: 'sage',
  'renewable-energy': 'butter',
  business: 'ink',
  finance: 'ink',
  photography: 'sky',
};
export const toneFor = (topicId) => TOPIC_TONE[topicId] || 'ink';
