import { SAMPLE_ARTICLES, SAMPLE_EDITION_DATE } from '../../data/sample-corpus.js';

/**
 * Serves the fictional sample corpus. Matches on topic tags, the way a live
 * adapter would match on feeds, queries and entity watchlists.
 */
export class SampleResearchAdapter {
  name = 'sample';
  sample = true;
  editionDate = SAMPLE_EDITION_DATE;

  async search(topic) {
    return SAMPLE_ARTICLES.filter((a) => a.topics.includes(topic.id)).map((a) => ({ ...a }));
  }

  /** Topic ids with any material today — used by Random / Adventurous. */
  availableTopics() {
    return new Set(SAMPLE_ARTICLES.flatMap((a) => a.topics));
  }
}
