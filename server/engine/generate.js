// 12 — GENERATE
//
// Derived outputs built from the stored edition, never from fresh research:
// the short summary, the one thing to remember, and the audio script.
// PDF rendering happens at delivery time from the same edition object.

import { tierCopy, textOf, countWords, minutesFor } from '../../web/js/shared/format.js';

export function buildSummary(stories, mode) {
  return stories.slice(0, 5).map((s) => s.copy[mode].summaryLine || s.copy[mode].headline);
}

export function buildRemember(stories, mode) {
  const withLine = stories.find((s) => s.copy[mode].remember);
  if (withLine) return { text: withLine.copy[mode].remember, storyId: withLine.id };
  const lead = stories[0];
  return lead ? { text: lead.copy[mode].why || lead.copy[mode].dek, storyId: lead.id } : null;
}

const SPOKEN_WPM = 155;

/**
 * Audio is a short spoken summary for the car, the walk or the kitchen —
 * not the whole paper read aloud. Lead gets two sentences of context; the
 * rest get one line each.
 */
export function buildAudioScript(edition, mode) {
  const social = mode === 'social';
  const date = new Date(edition.editorialDate + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const stories = edition.stories;
  const segments = [];
  segments.push({
    kind: 'intro',
    text: social
      ? `Morning. It’s ${date}, and this is Over Coffee. ${stories.length ? `${stories.length} things worth knowing today.` : 'It’s a quiet one today.'}`
      : `Good morning. This is Over Coffee for ${date}. ${stories.length ? `${spell(stories.length)} developments worth your attention.` : 'A quiet morning: nothing cleared the bar.'}`,
  });
  stories.forEach((s, i) => {
    const c = s.copy[mode];
    const line = c.summaryLine || c.headline;
    if (i === 0) segments.push({ kind: 'lead', storyId: s.id, text: `${social ? 'The big one.' : 'First.'} ${line} ${c.why || ''}`.trim() });
    else segments.push({ kind: 'story', storyId: s.id, text: `${i === stories.length - 1 && i > 1 ? (social ? 'And finally:' : 'Finally:') : social ? 'Also:' : 'Next:'} ${line}` });
  });
  const remember = edition.remember?.[mode]?.text;
  if (remember) segments.push({ kind: 'remember', text: `${social ? 'If you remember one thing:' : 'One thing to remember.'} ${remember}` });
  segments.push({ kind: 'outro', text: social ? 'That’s it. You’re all caught up. Enjoy your coffee.' : 'That’s today’s edition. You’re up to date.' });
  const words = countWords(segments.map((s) => s.text).join(' '));
  return { segments, words, seconds: Math.round((words / SPOKEN_WPM) * 60) };
}

export function editionWords(edition, mode) {
  let words = 0;
  for (const s of edition.stories) words += countWords(textOf(tierCopy(s.copy[mode], s.tier)));
  words += countWords((edition.summary[mode] || []).join(' '));
  words += countWords(edition.remember?.[mode]?.text || '');
  return { words, minutes: minutesFor(words) };
}

const spell = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);
