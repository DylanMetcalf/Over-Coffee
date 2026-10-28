// Web Push (standards-based, VAPID). Only offered when keys are configured:
//   npx web-push generate-vapid-keys   →  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain)
// Subscriptions that the push service reports as gone (404/410) are removed.

export const pushConfigured = (env = process.env) => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

let lib;
async function defaultSender(sub, body, env) {
  lib ||= (await import('web-push')).default;
  lib.setVapidDetails(env.VAPID_SUBJECT || 'mailto:hello@overcoffee.app', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  return lib.sendNotification(sub, body, { TTL: 6 * 3600, urgency: 'normal' });
}

/** @returns {{sent:number, gone:string[], errors:string[]}} */
export async function sendPush(subs, payload, { sender = defaultSender, env = process.env } = {}) {
  const out = { sent: 0, gone: [], errors: [] };
  if (!pushConfigured(env) && sender === defaultSender) return { ...out, errors: ['push not configured'] };
  for (const s of subs) {
    try {
      await sender({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), env);
      out.sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) out.gone.push(s.endpoint);
      else out.errors.push(`${err.statusCode || ''} ${err.message}`.trim());
    }
  }
  return out;
}
