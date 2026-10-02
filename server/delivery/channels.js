// DELIVERY — channels
//
// Channels only read stored editions. Adding one (desktop app, push, a
// partner product such as an industry edition) means adding an adapter
// here, not touching the engine.

import fs from 'node:fs';
import path from 'node:path';

/** Email: writes a ready-to-send message to data/outbox (swap for an ESP adapter in production). */
export function deliverEmail({ edition, profile, baseUrl, outDir = path.resolve('data/outbox') }) {
  const mode = profile.mode || 'business';
  const lines = edition.summary[mode] || [];
  const date = new Date(edition.editorialDate + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const body = [
    `OVER COFFEE — ${date}`,
    edition.sample ? 'DESIGN PROTOTYPE — SAMPLE EDITION' : '',
    '',
    `Your ${edition.stats.readingMinutes[mode]}-minute edition.`,
    '',
    ...lines.map((l) => `· ${l}`),
    '',
    `Read today’s newspaper: ${baseUrl}/#/read/${edition.id}?mode=${mode}`,
    `PDF: ${baseUrl}/api/editions/${edition.id}/pdf?mode=${mode}`,
  ].join('\n');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${edition.id}-${mode}.eml`);
  fs.writeFileSync(file, `To: reader@example.com\nSubject: Over Coffee — ${date}\nContent-Type: text/plain; charset=utf-8\n\n${body}\n`);
  return file;
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
