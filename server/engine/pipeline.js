// THE EDITORIAL ENGINE
//
// 01 Wake up → 02 Understand → 03 Expand → 04 Research → 05 Detect events →
// 06 Cluster → 07 Verify → 08 Prioritize → 09 Edit → 10 Write →
// 11 Quality check → 12 Generate → 13 Deliver → 14 Done
//
// Output is one presentation-neutral edition object. Business and Social,
// web, PDF and audio are all renderings of it.

import crypto from 'node:crypto';
import { resolveTopic } from './topics.js';
import { createResearchAdapter, researchTopics } from './research/index.js';
import { clusterArticles } from './cluster.js';
import { analyseCluster } from './analyst.js';
import { claudeTriage, triageEnabled } from './live-analyst.js';
import { classify as classifyMemory, fingerprint } from './memory.js';
import { assessSource, claimStatus, eventStatus, SOURCE_TYPE_LABEL } from './verify.js';
import { scoreEvent, primaryTopic } from './prioritize.js';
import { editEdition, composeSections } from './editor.js';
import { createWriter } from './writer.js';
import { runQualityGate } from './quality.js';
import { buildSummary, buildRemember, buildAudioScript, editionWords } from './generate.js';
import { buildHooks } from './hooks.js';
import { EXPECTED_CLUSTERS } from '../data/sample-corpus.js';
import { getTopic } from './topics.js';

export const ENGINE_VERSION = '0.1.0';

export const STAGES = [
  ['wake', '01', 'Wake up'],
  ['understand', '02', 'Understand'],
  ['expand', '03', 'Expand'],
  ['research', '04', 'Research'],
  ['detect', '05', 'Detect events'],
  ['cluster', '06', 'Cluster'],
  ['verify', '07', 'Verify'],
  ['prioritize', '08', 'Prioritize'],
  ['edit', '09', 'Edit'],
  ['write', '10', 'Write'],
  ['quality', '11', 'Quality check'],
  ['generate', '12', 'Generate'],
  ['deliver', '13', 'Deliver'],
  ['done', '14', 'Done'],
];

/**
 * @param {object} opts
 * @param {import('../store.js').Store} opts.store
 * @param {string} opts.userId
 * @param {string[]} opts.topicIds     topics for this edition (profile or today's override)
 * @param {number} opts.budgetMinutes  5 | 10 | 20
 * @param {string} opts.date           editorial date, YYYY-MM-DD
 * @param {string} [opts.kind]         'daily' | 'preview'
 * @param {string} [opts.id]           fixed id (previews)
 * @param {object} [opts.extra]        discovery context to record (random / adventurous)
 * @param {(stage:string)=>void} [opts.onStage]
 */
export async function runPipeline(opts) {
  const { store, userId, topicIds, budgetMinutes, date, kind = 'daily', extra = null, onStage, focus = null } = opts;
  const log = [];
  let t = performance.now();
  const stage = (key, note) => {
    const now = performance.now();
    const meta = STAGES.find((s) => s[0] === key);
    log.push({ stage: key, number: meta[1], label: meta[2], ms: Math.round((now - t) * 10) / 10, note });
    t = now;
    onStage?.(key);
  };

  // 01 — WAKE UP
  const config = { topicIds: [...topicIds], budgetMinutes, date, kind, discovery: extra, focus: focus || {} };
  stage('wake', `${topicIds.length} topic${topicIds.length === 1 ? '' : 's'} · ${budgetMinutes}-minute budget`);

  // 02 — UNDERSTAND
  const topics = topicIds.map(resolveTopic).filter(Boolean).map((t) => (focus?.[t.id]?.length ? { ...t, expansion: focus[t.id], focused: true } : t));
  stage('understand', topics.map((x) => (x.custom ? `${x.label} (new topic)` : x.name)).join(', '));

  // 03 — EXPAND
  stage('expand', `${topics.reduce((n, x) => n + x.expansion.length, 0)} research areas`);

  // 04 — RESEARCH
  const adapter = createResearchAdapter();
  const editionTime = new Date(date + 'T06:00:00Z');
  const research = await researchTopics({ adapter, topics, date, store });
  const retrievedAt = new Date(date + 'T05:40:00Z').toISOString();
  stage('research', `${research.articles.length} articles · cache ${research.cache.hits.length} hit / ${research.cache.misses.length} miss`);

  // 05 — DETECT EVENTS · 06 — CLUSTER
  let clusters;
  let triaged = false;
  if (!adapter.sample && research.articles.length && triageEnabled()) {
    try {
      clusters = await claudeTriage({ articles: research.articles, topics, store });
      triaged = true;
    } catch (err) {
      console.warn('[triage] model triage failed, using heuristic clustering:', err.message);
    }
  }
  clusters = clusters || clusterArticles(research.articles);
  stage('detect', `${clusters.length} candidate events`);
  const analysed = clusters.map((c) => ({ cluster: c, analysis: c.preAnalysis || analyseCluster(c, { corpusIndex: EXPECTED_CLUSTERS, userTopics: topics }) }));
  stage('cluster', `${research.articles.length} articles → ${clusters.length} events`);

  // 07 — VERIFY
  const sources = [];
  const events = analysed.map(({ cluster, analysis }) => {
    const id = 'ev-' + analysis.key;
    const evSources = cluster.articles.map((a) => {
      const note = analysis.desk?.sourceNotes?.[a.id];
      const credibility = assessSource(a);
      const s = {
        id: a.id,
        eventId: id,
        url: a.url,
        title: a.title,
        publisher: a.publisher,
        sourceType: a.sourceType,
        typeLabel: SOURCE_TYPE_LABEL[a.sourceType] || a.sourceType,
        preprint: !!a.preprint,
        publishedAt: a.publishedAt,
        retrievedAt,
        excerpt: a.excerpt,
        credibility,
        heading: note?.heading || a.title,
        role: note?.role || SOURCE_TYPE_LABEL[a.sourceType],
        usedForFacts: credibility.score >= 0.6,
      };
      sources.push(s);
      return s;
    });
    const byId = new Map(evSources.map((s) => [s.id, s]));
    const claims = analysis.claims.map((c) => ({ ...c, ...claimStatus(c, byId) }));
    for (const c of claims) for (const sid of c.sources) byId.get(sid).supports = [...(byId.get(sid).supports || []), c.id];
    return {
      id,
      key: analysis.key,
      title: analysis.desk?.business?.headline || [...cluster.articles].sort((a, b) => assessSource(b).score - assessSource(a).score)[0].title,
      label: cluster.label,
      subtopic: analysis.subtopic,
      topicWeights: analysis.topicWeights,
      signals: analysis.signals,
      rejectReason: analysis.rejectReason,
      claims,
      status: eventStatus(claims),
      sourceIds: evSources.map((s) => s.id),
      sources: evSources,
      publishers: cluster.publishers,
      firstSeen: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      desk: analysis.desk,
    };
  });
  const statusCounts = events.flatMap((e) => e.claims).reduce((m, c) => ((m[c.status] = (m[c.status] || 0) + 1), m), {});
  stage('verify', Object.entries(statusCounts).map(([k, v]) => `${v} ${k}`).join(' · '));

  // 08 — PRIORITIZE
  const userTopicIds = topics.map((x) => x.id);
  for (const e of events) {
    e.score = scoreEvent(e, { userTopicIds, editionTime: editionTime.getTime() });
    e.primaryTopic = primaryTopic(e, userTopicIds);
  }
  // 08b — EDITORIAL MEMORY and relevance feedback (live daily editions only).
  let memoryNote = '';
  if (!adapter.sample && kind === 'daily' && userId) {
    const memory = store.listMemory(userId);
    const aff = store.affinity(userId);
    const counts = { new: 0, duplicate: 0, recurring: 0, development: 0 };
    for (const e of events) {
      const m = classifyMemory(e, memory, { today: date });
      counts[m.kind]++;
      e.memory = m;
      if (m.kind === 'duplicate' || m.kind === 'recurring') e.rejectReason ||= `Already covered on ${m.since} (“${m.previousHeadline}”). No meaningful new reporting.`;
      if (m.kind === 'development') {
        e.development = { since: m.since, previousHeadline: m.previousHeadline, changes: m.changes || [], continuing: !!m.continuing };
        e.score.total = Math.min(1, e.score.total + 0.03);
      }
      const nudge = Math.max(-0.1, Math.min(0.1, 0.03 * ((aff.topics[e.primaryTopic] || 0) + (aff.subtopics[e.subtopic] || 0))));
      if (nudge) e.score.total = Math.max(0, Math.min(1, e.score.total + nudge));
    }
    memoryNote = ` · memory: ${counts.new} new, ${counts.development} developing, ${counts.duplicate + counts.recurring} already covered`;
  }
  stage('prioritize', `top score ${Math.max(0, ...events.map((e) => e.score.total)).toFixed(2)}${memoryNote}`);

  // 09 — EDIT
  // Heuristic live scoring is crude, so it uses a lower bar; model triage and sample desk use the normal one.
  const editorial = editEdition(events, { minutes: budgetMinutes, lenient: !adapter.sample && !triaged });
  for (const e of events) e.decision = editorial.decisions.get(e.id);
  stage('edit', `${editorial.picked.length} of ${events.length} events published · bar ${editorial.bar.toFixed(2)}`);

  // 10 — WRITE
  const writer = createWriter({ store });
  const stories = [];
  for (const e of editorial.picked) {
    const w = await writer.write(e);
    // Desk material can only cite what this edition actually researched.
    w.depth = { ...w.depth, saying: (w.depth?.saying || []).filter((q) => e.sourceIds.includes(q.source)) };
    const topic = topics.find((x) => x.id === e.primaryTopic);
    stories.push({
      id: 'st-' + e.key,
      eventId: e.id,
      tier: e.decision.tier,
      rank: e.decision.rank,
      topicId: e.primaryTopic,
      topicLabel: topic?.label || getTopic(e.primaryTopic)?.label || e.primaryTopic,
      alsoIn: userTopicIds.filter((id) => id !== e.primaryTopic && (e.topicWeights[id] || 0) >= 0.6).map((id) => topics.find((x) => x.id === id).label),
      subtopic: e.subtopic,
      status: e.status,
      writer: w.writer,
      copy: w.copy,
      depth: w.depth,
      figure: w.figure,
      hooks: w.hooks || null,
      development: e.development || null,
    });
  }
  // Related developments: link to stories in this edition, otherwise name the event if we researched it.
  const storyByKey = new Map(stories.map((s) => [s.id.slice(3), s]));
  const eventByKey = new Map(events.map((e) => [e.key, e]));
  for (const s of stories) {
    s.depth.related = (s.depth.related || [])
      .map((k) => (storyByKey.has(k) ? { storyId: storyByKey.get(k).id, title: storyByKey.get(k).copy.business.headline, socialTitle: storyByKey.get(k).copy.social?.headline } : eventByKey.has(k) ? { storyId: null, title: eventByKey.get(k).title } : null))
      .filter(Boolean);
  }
  stage('write', `${stories.length} stories × 2 voices · writer: ${writer.name}`);

  // Assemble the edition object.
  const edition = {
    id: opts.id || 'ed_' + crypto.randomBytes(5).toString('hex'),
    userId,
    kind,
    engineVersion: ENGINE_VERSION,
    sample: adapter.sample,
    editorialDate: date,
    editionTime: editionTime.toISOString(),
    generatedAt: new Date().toISOString(),
    config,
    topics,
    research: {
      adapter: research.adapter,
      cache: research.cache,
      retrievedAt,
      articles: research.articles.length,
      publishers: [...new Set(research.articles.map((a) => a.publisher))].length,
    },
    events: events.map(({ sources: _s, desk: _d, ...e }) => e),
    sources,
    editorial: { bar: editorial.bar, budgetWords: editorial.budgetWords, plannedWords: editorial.plannedWords },
  };

  // Structure, summaries and stats derive from whichever stories survive the gate.
  const assemble = (published) => {
    const picked = published.map((st) => events.find((e) => e.id === st.eventId));
    const { leadEventId, sections } = composeSections(picked, { userTopics: topics, considered: events.filter((e) => !e.rejectReason) });
    edition.leadEventId = leadEventId;
    edition.leadTopicId = events.find((e) => e.id === leadEventId)?.primaryTopic || null;
    edition.sections = sections.map((x) => ({
      topicId: x.topicId,
      label: x.label,
      storyIds: x.storyEventIds.map((eid) => published.find((st) => st.eventId === eid).id),
      quiet: x.quiet,
    }));
    edition.stories = published;
    edition.hooks = null;
    edition.summary = { business: buildSummary(published, 'business'), social: buildSummary(published, 'social') };
    edition.remember = { business: buildRemember(published, 'business'), social: buildRemember(published, 'social') };
    edition.quiz = published.filter((x) => x.copy.social?.quiz).slice(0, 3).map((x) => ({ storyId: x.id, ...x.copy.social.quiz }));
    const wb = editionWords(edition, 'business');
    const ws = editionWords(edition, 'social');
    edition.stats = {
      words: { business: wb.words, social: ws.words },
      readingMinutes: { business: wb.minutes, social: ws.minutes },
      budgetMinutes,
      considered: events.length,
      published: published.length,
      held: events.filter((e) => e.decision.status === 'held').length,
      rejected: events.filter((e) => e.decision.status === 'rejected').length,
      sourcesReviewed: sources.length,
      publishers: edition.research.publishers,
    };
    edition.hooks = buildHooks(edition);
  };
  assemble(stories);

  // 11 — QUALITY CHECK
  edition.quality = runQualityGate(edition);
  // A story that fails is pulled, with the reason on record; the rest of the edition is re-checked.
  // An edition is only held when the failure is not attributable to individual stories.
  const failing = new Map();
  for (const c of edition.quality.checks.filter((c) => c.status === 'fail'))
    for (const item of c.items) {
      const id = item.match(/^(st-[\w-]+)/)?.[1];
      if (id) failing.set(id, [...(failing.get(id) || []), c.label]);
    }
  if (failing.size) {
    const dropped = [];
    for (const [id, labels] of failing) {
      const st = stories.find((x) => x.id === id);
      const ev = edition.events.find((e) => e.id === st.eventId);
      ev.decision = { status: 'rejected', reason: `Pulled by the quality gate: ${[...new Set(labels)].join(', ').toLowerCase()}.` };
      dropped.push({ storyId: id, checks: [...new Set(labels)] });
    }
    for (const e of events) e.decision = edition.events.find((x) => x.id === e.id).decision;
    assemble(stories.filter((x) => !failing.has(x.id)));
    edition.quality = { ...runQualityGate(edition), pulled: dropped };
  }
  stage('quality', `${edition.quality.status} · ${edition.quality.checks.filter((c) => c.status === 'pass').length}/${edition.quality.checks.length} checks passed`);

  // 12 — GENERATE
  edition.audio = { business: buildAudioScript(edition, 'business'), social: buildAudioScript(edition, 'social') };
  stage('generate', `summary · audio ${Math.round(edition.audio.business.seconds / 60 * 10) / 10} min · PDF on demand`);

  // 13 — DELIVER (persist; channels read from the stored edition)
  edition.delivery = { status: edition.quality.status === 'fail' ? 'held' : 'delivered', channels: ['web', 'pdf', 'audio'] };
  edition.pipeline = log;
  stage('deliver', edition.delivery.status);
  stage('done', `${(log.reduce((a, s) => a + s.ms, 0)).toFixed(0)} ms`);
  edition.pipeline = log;
  store.saveEdition(edition);
  // Remember what this reader has now been told (only after the edition is safely saved).
  if (!adapter.sample && kind === 'daily' && userId && edition.delivery.status !== 'held') {
    const published = new Set(edition.stories.map((st) => st.eventId));
    for (const e of events) if (published.has(e.id)) store.upsertMemory(userId, e.memory?.key || 'm-' + e.key, date, e.title, fingerprint(e));
  }
  return edition;
}
