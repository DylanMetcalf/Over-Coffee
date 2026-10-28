// DELIVERY — channels
//
// Channels only read stored editions (and the hooks built from them). Adding
// one — desktop app, Slack, a partner product — means adding an adapter here,
// never touching the engine.
//
// In this prototype every channel writes to data/outbox so the output can be
// inspected. Production swaps the writers for providers:
//   push      → Web Push (VAPID) / APNs / FCM
//   email     → an ESP (Postmark, SES…)
//   whatsapp  → WhatsApp Business Platform. Outbound messages outside a 24h
//               window must be pre-approved templates sent to opted-in numbers;
//               the hook text here is written to fit a template with one
//               {{link}} variable.

import fs from 'node:fs';
import path from 'node:path';
import { sendPush } from './push.js';
import { withLink } from '../engine/hooks.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const longDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function readLink(baseUrl, edition, mode) {
  return `${baseUrl}/#/read/${edition.id}?mode=${mode}`;
}

/** Inline-styled HTML email: renders in mail clients without web fonts or SVG. */
export function renderEmailHtml({ edition, mode, baseUrl, unsubUrl = '', manageUrl = '' }) {
  const social = mode === 'social';
  const hooks = withLink(edition.hooks, readLink(baseUrl, edition, mode))[mode];
  const e = hooks.email;
  const pdf = `${baseUrl}/api/editions/${edition.id}/pdf?mode=${mode}`;
  const link = readLink(baseUrl, edition, mode);
  const accent = social ? '#ff3d6e' : '#ff4d1f';
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
  const items = e.items
    .map(
      (i, idx) => `<tr><td style="padding:16px 0;border-top:1px solid #eceef2">
        <div style="font:600 11px ${font};letter-spacing:.08em;text-transform:uppercase;color:${accent};padding-bottom:6px">${idx === 0 ? (social ? 'Start here' : 'Lead') : String(idx + 1).padStart(2, '0')}</div>
        <div style="font:${idx === 0 ? '700 22px/1.2' : '650 17px/1.3'} ${font};color:#0a0b10;letter-spacing:-.01em">${esc(i.head)}</div>
        <div style="font:400 15px/1.5 ${font};color:#4a4f5c;padding-top:6px">${esc(i.line)}</div></td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(e.subject)}</title></head>
<body style="margin:0;background:#f4f5f8;padding:24px 12px">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="padding:28px 32px 8px">
  <table role="presentation"><tr>
    <td><img src="${baseUrl}/assets/email-logo.png" height="32" alt="Over Coffee" style="display:block;height:32px;width:auto;border:0"></td>
    <td style="padding-left:14px;font:500 12px ${font};color:#7a7f8c;letter-spacing:0;vertical-align:bottom;padding-bottom:3px">${esc(longDate(edition.editorialDate))}</td>
  </tr></table>
</td></tr>
<tr><td style="padding:12px 32px 0"><div style="font:${social ? '800 30px/1.1' : '700 28px/1.15'} ${font};color:#0a0b10;letter-spacing:-.02em">${social ? 'Morning. Here’s what happened.' : 'Good morning. Here’s what matters.'}</div>
  <div style="font:500 14px ${font};color:#7a7f8c;padding-top:8px">${e.readMinutes}-minute edition${edition.sample ? ' · Design prototype — sample content' : ''}</div></td></tr>
<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%">${items}</table>${e.more ? `<p style="margin:6px 0 0;font:500 13px/1.5 ${font};color:#6b7080">+ ${e.more} more inside the paper.</p>` : ''}</td></tr>
<tr><td style="padding:24px 32px 8px"><a href="${esc(link)}" style="display:inline-block;background:#0a0b10;color:#fff;text-decoration:none;font:650 15px ${font};padding:15px 26px;border-radius:999px">${esc(e.cta)} →</a>
  <a href="${esc(pdf)}" style="font:600 14px ${font};color:#4a4f5c;text-decoration:none;padding-left:18px">Download PDF</a></td></tr>
<tr><td style="padding:20px 32px 30px;font:400 12px/1.6 ${font};color:#8b909c">${edition.stats.sourcesReviewed} sources reviewed · ${edition.stats.considered} developments considered · quality-checked.<br>The full edition is waiting in your paper. When you’ve read it, you’re done.${manageUrl || unsubUrl ? `<br><br>${manageUrl ? `<a href="${esc(manageUrl)}" style="color:#6b7080">Manage delivery preferences</a>` : ''}${manageUrl && unsubUrl ? ' · ' : ''}${unsubUrl ? `<a href="${esc(unsubUrl)}" style="color:#6b7080">Unsubscribe from the daily email</a>` : ''}` : ''}</td></tr>
</table></td></tr></table></body></html>`;
}

export function pushPayload({ edition, mode, baseUrl }) {
  const h = withLink(edition.hooks, readLink(baseUrl, edition, mode))[mode];
  return { title: h.push.title, body: h.push.body, tag: `oc-${edition.editorialDate}`, url: readLink(baseUrl, edition, mode), icon: `${baseUrl}/assets/icon-192.png` };
}

export function whatsappPayload({ edition, mode, baseUrl, number }) {
  const text = withLink(edition.hooks, readLink(baseUrl, edition, mode))[mode].whatsapp.text;
  const digits = String(number || '').replace(/\D/g, '');
  return { text, click_to_chat: `https://wa.me/${digits}?text=${encodeURIComponent(text)}` };
}

/**
 * Deliver an edition to the reader's chosen channels. Writes inspectable
 * files; returns what was prepared for each channel.
 */
export async function deliver({ edition, profile, baseUrl, channels, outDir = path.resolve(process.env.OC_DATA || 'data', 'outbox'), unsubUrl = '', pushSubs = [], pushSender }) {
  const mode = profile.mode || 'business';
  const wanted = channels || profile.delivery?.channels || [];
  fs.mkdirSync(outDir, { recursive: true });
  const result = {};
  const stem = path.join(outDir, `${edition.id}-${mode}`);
  const rel = (f) => path.relative(process.cwd(), f);
  if (wanted.includes('push')) {
    const payload = pushPayload({ edition, mode, baseUrl });
    const r = await sendPush(pushSubs, payload, pushSender ? { sender: pushSender } : undefined);
    result.push = { sent: r.sent, gone: r.gone, ...(r.sent === 0 && r.errors.length ? { error: r.errors[0] } : {}), url: payload.url };
    fs.writeFileSync(`${stem}.push.json`, JSON.stringify(payload, null, 2));
  }
  if (wanted.includes('email')) {
    const html = renderEmailHtml({ edition, mode, baseUrl, unsubUrl, manageUrl: `${baseUrl}/#/settings` });
    const hooks = withLink(edition.hooks, readLink(baseUrl, edition, mode))[mode];
    fs.writeFileSync(`${stem}.email.html`, html);
    const boundary = 'oc-' + edition.id;
    fs.writeFileSync(
      `${stem}.eml`,
      [
        `To: ${profile.email || 'reader@example.com'}`,
        `Subject: ${hooks.email.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        `${hooks.email.preheader}\n\n${hooks.email.items.map((i) => `• ${i.head}\n  ${i.line}`).join('\n')}\n\n${hooks.email.cta}: ${readLink(baseUrl, edition, mode)}`,
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html,
        `--${boundary}--`,
        '',
      ].join('\r\n'),
    );
    result.email = { file: rel(`${stem}.eml`), html: rel(`${stem}.email.html`), subject: hooks.email.subject, status: 'outbox' };
    // Real sending: Resend (https://resend.com) when RESEND_API_KEY is set.
    if (process.env.RESEND_API_KEY && profile.email) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: process.env.OC_EMAIL_FROM || 'Over Coffee <onboarding@resend.dev>', to: [profile.email], subject: hooks.email.subject, html, ...(unsubUrl ? { headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}) }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Email provider ${res.status}`);
        result.email.status = 'sent';
      } catch (err) {
        result.email.error = err.message;
      }
    }
  }
  if (wanted.includes('whatsapp')) {
    const w = whatsappPayload({ edition, mode, baseUrl, number: profile.delivery?.whatsapp });
    fs.writeFileSync(`${stem}.whatsapp.txt`, w.text + '\n');
    result.whatsapp = { file: rel(`${stem}.whatsapp.txt`), text: w.text, click_to_chat: profile.delivery?.whatsapp ? w.click_to_chat : null };
  }
  return result;
}

/**
 * Audio: the script is generated with the edition. Playback uses the
 * reader's device voice; a server-side TTS provider can be plugged in here
 * to produce an MP3 for podcasts and car players.
 */
export function audioPayload(edition, mode) {
  const a = edition.audio[mode];
  return { mode, seconds: a.seconds, words: a.words, segments: a.segments, provider: process.env.OC_TTS || 'device' };
}
