// DESIGN PROTOTYPE — SAMPLE DESK
//
// Social copy and notification hooks live in sample-social.js and sample-hooks.js.
//
// In a live deployment, three model-backed steps produce this material from
// the research snapshot: ASSESS (editorial signals), EXTRACT (claims with the
// sources that support them) and WRITE (copy in both presentation voices).
// For the prototype, their outputs are fixed here so the editions are
// reproducible and the editorial engine (clustering, verification, scoring,
// budgeting, quality gate) can be exercised deterministically.
//
// Every figure and quotation below must be traceable to an excerpt in
// sample-corpus.js; the quality gate enforces this.

export const SAMPLE_DESK = {
  // ───────────────────────────── AI ─────────────────────────────
  'ai-kestrel-4': {
    topicWeights: { ai: 1, technology: 0.8, business: 0.6 },
    subtopic: 'Model releases',
    signals: { impact: 0.86, breadth: 0.8, novelty: 0.82 },
    claims: [
      { id: 'released', kind: 'fact', text: 'Kestrel Labs released Kestrel 4 on 1 October 2026.', sources: ['kestrel-official', 'kestrel-wire'] },
      { id: 'price', kind: 'figure', text: 'The Kestrel 4 API costs $1.20 per million input tokens, 60% below Kestrel 3 ($3.00).', sources: ['kestrel-official', 'kestrel-wire'] },
      { id: 'open', kind: 'fact', text: 'Kestrel 4 Mini is released with open weights under a licence that allows commercial use.', sources: ['kestrel-official', 'kestrel-handson'] },
      { id: 'bench', kind: 'self-reported', text: 'Kestrel 4 completes 71% of tasks on Kestrel’s internal coding benchmark, up from 54%.', sources: ['kestrel-official'] },
      { id: 'gpu', kind: 'fact', text: 'Kestrel 4 Mini runs on a single 48GB workstation GPU.', sources: ['kestrel-handson'] },
      { id: 'compute', kind: 'fact', text: 'The technical report does not disclose total training compute.', sources: ['kestrel-report'] },
      { id: 'rivals', kind: 'interpretation', text: 'Analysts expect rivals to follow on price within weeks.', sources: ['kestrel-ledger'] },
    ],
    business: {
      kicker: 'Model releases',
      headline: 'Kestrel Labs cuts prices 60% with Kestrel 4 — and gives a smaller model away',
      dek: 'The new model family is cheaper to run and, on the company’s own tests, better at code. The price, not the benchmark, is the story.',
      body: [
        'Kestrel Labs released Kestrel 4 on Thursday, pricing its flagship API at $1.20 per million input tokens, 60% below Kestrel 3. It also published Kestrel 4 Mini with open weights under a licence that permits commercial use.',
        'The company says Kestrel 4 completes 71% of tasks on its internal coding benchmark, up from 54%. That figure has not been independently tested. The technical report includes outside safety evaluations but does not disclose training compute.',
        'Hands-on testing by Circuit Review found the Mini model runs on a single 48GB workstation GPU, putting a capable model within reach of teams that cannot or will not send data to a cloud provider.',
      ],
      why: 'For most companies, AI spending is limited by cost per task rather than by raw capability. A cut of this size changes which projects survive a budget review.',
      changed: 'A frontier lab releasing open weights alongside a 60% price cut resets the floor for what buyers expect to pay.',
      next: 'Analysts expect rivals to respond on price within weeks. Independent benchmark results should follow.',
      summaryLine: 'Kestrel Labs cut its API price 60% with Kestrel 4 and released a smaller open-weights model.',
      remember: 'Capable AI is getting cheaper faster than it is getting smarter. Budgets, not breakthroughs, will set the pace of adoption.',
    },
    depth: {
      timeline: [
        { when: '1 Oct · 16:00 UTC', what: 'Kestrel Labs publishes the Kestrel 4 announcement and technical report.' },
        { when: '1 Oct · 17:10 UTC', what: 'Meridian Wire reports the 60% price cut. Two rival labs decline to comment.' },
        { when: '2 Oct · 03:30 UTC', what: 'Circuit Review confirms Kestrel 4 Mini runs on a single 48GB workstation GPU.' },
        { when: '2 Oct · 05:00 UTC', what: 'The Ledger reports analysts expect rivals to follow on price.' },
      ],
      saying: [
        { who: 'Ilse Moreau', role: 'Chief executive, Kestrel Labs', quote: 'Capability is no longer the bottleneck. Cost and reliability are.', source: 'kestrel-wire' },
        { who: 'Daniel Okafor', role: 'Analyst, Brightline Research', quote: 'Price is now the battleground.', source: 'kestrel-ledger' },
      ],
      related: ['ai-chip-lead-times', 'ai-enterprise-survey'],
    },
    sourceNotes: {
      'kestrel-official': { heading: 'Kestrel Labs announces Kestrel 4', role: 'Official announcement' },
      'kestrel-report': { heading: 'What the technical report does — and doesn’t — disclose', role: 'Technical documentation' },
      'kestrel-wire': { heading: 'The price cut, as reported', role: 'Independent reporting' },
      'kestrel-ledger': { heading: 'What it means for enterprise budgets', role: 'Market analysis' },
      'kestrel-handson': { heading: 'Running the open model yourself', role: 'Hands-on testing' },
      'kestrel-viral': { heading: 'The online reaction', role: 'Social reaction — not used for facts' },
    },
    figure: {
      title: 'API price per million input tokens',
      short: 'Kestrel 4 API price',
      suffix: 'per M tokens',
      unit: '$',
      decimals: 2,
      data: [
        { label: 'Kestrel 3', value: 3.0 },
        { label: 'Kestrel 4', value: 1.2 },
      ],
      source: 'kestrel-official',
    },
  },

  'ai-chip-lead-times': {
    topicWeights: { ai: 0.9, business: 0.9, technology: 0.8 },
    subtopic: 'Hardware',
    signals: { impact: 0.72, breadth: 0.62, novelty: 0.6 },
    claims: [
      { id: 'lead', kind: 'figure', text: 'Lead times for Varda’s V-series AI accelerators have fallen to 9 weeks, from 26 weeks a year ago.', sources: ['varda-filing', 'varda-wire'] },
      { id: 'revenue', kind: 'figure', text: 'Varda’s data-centre revenue rose 41% year on year to $8.4bn.', sources: ['varda-filing'] },
      { id: 'shares', kind: 'figure', text: 'Varda shares rose 6% in after-hours trading.', sources: ['varda-wire'] },
      { id: 'outlook', kind: 'self-reported', text: 'Varda expects supply to remain balanced through the first half of 2027.', sources: ['varda-filing'] },
      { id: 'smaller', kind: 'interpretation', text: 'Shorter lead times favour smaller cloud providers and enterprises.', sources: ['varda-ledger'] },
    ],
    business: {
      kicker: 'Hardware',
      headline: 'Varda says AI chip lead times have fallen to nine weeks, from 26',
      dek: 'The shortage that shaped two years of AI spending is easing. Smaller buyers stand to gain most.',
      body: [
        'Varda Semiconductor said lead times for its V-series AI accelerators have fallen to nine weeks, from 26 weeks a year ago. Data-centre revenue rose 41% year on year to $8.4bn.',
        'The company expects supply to stay balanced through the first half of 2027. Shares rose 6% in after-hours trading, Meridian Wire reported.',
      ],
      why: 'Access to chips, more than money or talent, has decided who could build and run large AI systems. Shorter queues open the door to smaller cloud providers and enterprises that could not secure allocation.',
      next: 'Watch whether other suppliers report the same easing, and whether accelerator prices begin to soften next year, as some analysts expect.',
      summaryLine: 'Varda says waits for AI chips are down to nine weeks from 26 — the shortage is easing.',
    },
    depth: {
      timeline: [
        { when: '1 Oct · 21:00 UTC', what: 'Varda Semiconductor publishes quarterly results.' },
        { when: '1 Oct · 22:15 UTC', what: 'Meridian Wire reports shares up 6% after hours.' },
        { when: '2 Oct · 04:40 UTC', what: 'The Ledger: analysts say smaller buyers benefit most.' },
      ],
      saying: [{ who: 'Priya Raman', role: 'Chief financial officer, Varda Semiconductor', quote: 'The shortage phase is behind us.', source: 'varda-wire' }],
      related: ['ai-kestrel-4'],
    },
    sourceNotes: {
      'varda-filing': { heading: 'Varda’s quarterly results', role: 'Company filing' },
      'varda-wire': { heading: 'The market reaction', role: 'Independent reporting' },
      'varda-ledger': { heading: 'Who gains when the chip queue ends', role: 'Analysis' },
    },
    figure: {
      title: 'Lead time for V-series accelerators, weeks',
      short: 'AI chip lead time',
      suffix: 'weeks',
      unit: '',
      decimals: 0,
      data: [
        { label: 'A year ago', value: 26 },
        { label: 'Now', value: 9 },
      ],
      source: 'varda-filing',
    },
  },

  'ai-audit-code': {
    topicWeights: { ai: 1, technology: 0.6 },
    subtopic: 'Regulation',
    signals: { impact: 0.74, breadth: 0.68, novelty: 0.72 },
    claims: [
      { id: 'require', kind: 'fact', text: 'The draft code would require developers of the most capable general-purpose models to commission an independent audit before release and publish a summary.', sources: ['adsb-draft', 'adsb-northgate'] },
      { id: 'dates', kind: 'fact', text: 'Consultation closes on 15 December 2026; the Board intends final rules to apply from 1 July 2027.', sources: ['adsb-draft'] },
      { id: 'threshold', kind: 'interpretation', text: 'Industry groups say the threshold definition remains unclear.', sources: ['adsb-northgate'] },
      { id: 'capacity', kind: 'self-reported', text: 'Fewer than 10 organisations can currently conduct audits of this kind, according to the Auditing Standards Forum’s survey.', sources: ['adsb-forum'] },
    ],
    business: {
      kicker: 'Regulation',
      headline: 'Draft rules would require independent audits before major AI model releases',
      dek: 'The Atlantic Digital Standards Board has published its first detailed code. The open question is who it covers.',
      body: [
        'The Atlantic Digital Standards Board published a draft code on Thursday that would require developers of the most capable general-purpose models to commission an independent audit before release and to publish a summary of the results.',
        'Consultation closes on 15 December. The Board intends final rules to apply from 1 July 2027. Industry groups say the threshold that decides which models are covered is not yet clear enough to apply.',
        'Capacity is a practical constraint: the Auditing Standards Forum says fewer than 10 organisations can currently conduct audits of this kind.',
      ],
      why: 'Pre-release audits would add time and cost to every major launch, and create a market for auditors that barely exists today.',
      next: 'Expect detailed industry submissions before the December deadline, most of them focused on the threshold.',
      summaryLine: 'A draft code would require independent audits before the most capable AI models are released.',
    },
    depth: {
      timeline: [
        { when: '1 Oct · 09:00 UTC', what: 'The Board publishes the draft Code of Practice.' },
        { when: '1 Oct · 13:30 UTC', what: 'Industry groups respond, citing an unclear threshold.' },
        { when: '2 Oct · 02:00 UTC', what: 'The Auditing Standards Forum publishes its capacity estimate.' },
        { when: '15 Dec 2026', what: 'Consultation closes.' },
        { when: '1 Jul 2027', what: 'Intended start date for final rules.' },
      ],
      saying: [{ who: 'Marta Lindqvist', role: 'Open Compute Alliance', quote: 'The intent is reasonable; the threshold is not yet workable.', source: 'adsb-northgate' }],
      related: ['ai-kestrel-4'],
    },
    sourceNotes: {
      'adsb-draft': { heading: 'The draft code itself', role: 'Regulatory document' },
      'adsb-northgate': { heading: 'How industry responded', role: 'Independent reporting' },
      'adsb-forum': { heading: 'Are there enough auditors?', role: 'Expert commentary' },
    },
  },

  'ai-enterprise-survey': {
    topicWeights: { ai: 1, business: 0.9 },
    subtopic: 'Enterprise adoption',
    signals: { impact: 0.56, breadth: 0.62, novelty: 0.5 },
    claims: [
      { id: 'prod', kind: 'figure', text: '38% of 1,200 surveyed companies have at least one AI system in production, up from 22% a year earlier.', sources: ['halberd-report', 'halberd-ledger'] },
      { id: 'savings', kind: 'figure', text: 'Only 9% report measurable cost savings at company level.', sources: ['halberd-report', 'halberd-ledger'] },
      { id: 'barriers', kind: 'figure', text: 'Data quality (61%) and cost (47%) are the most cited barriers.', sources: ['halberd-report'] },
      { id: 'method', kind: 'fact', text: 'Survey responses were self-reported.', sources: ['halberd-ledger'] },
    ],
    business: {
      kicker: 'Enterprise adoption',
      headline: '38% of companies now run AI in production. Only 9% can show savings',
      dek: 'Adoption is accelerating. Proof of return is not.',
      body: [
        'A Halberd Institute survey of 1,200 companies found 38% have at least one AI system in production, up from 22% a year earlier. Only 9% report measurable cost savings at company level.',
        'Data quality was the most cited barrier (61%), ahead of cost (47%). The results are self-reported.',
      ],
      why: 'The gap between deployment and measurable savings is where AI budgets will be tested in next year’s planning rounds.',
      summaryLine: 'AI in production rose to 38% of surveyed firms, but only 9% report savings.',
    },
    depth: {
      timeline: [
        { when: 'August 2026', what: 'Halberd Institute surveys 1,200 companies.' },
        { when: '30 Sep', what: 'Report published.' },
        { when: '1 Oct', what: 'The Ledger reports the findings, noting responses were self-reported.' },
      ],
      saying: [],
      related: ['ai-kestrel-4'],
    },
    sourceNotes: {
      'halberd-report': { heading: 'The full survey', role: 'Research report' },
      'halberd-ledger': { heading: 'Why savings lag adoption', role: 'Independent reporting' },
    },
    figure: {
      title: 'Companies with AI in production, %',
      short: 'Firms running AI in production',
      unit: '%',
      decimals: 0,
      data: [
        { label: 'A year ago', value: 22 },
        { label: 'Now', value: 38 },
      ],
      source: 'halberd-report',
    },
  },

  'ai-tessel-funding': {
    topicWeights: { robotics: 1, ai: 0.75, business: 0.75, manufacturing: 0.6 },
    subtopic: 'Investment',
    signals: { impact: 0.5, breadth: 0.5, novelty: 0.55 },
    claims: [
      { id: 'raise', kind: 'figure', text: 'Tessel raised $410 million in a Series C round.', sources: ['tessel-release', 'tessel-northgate'] },
      { id: 'sites', kind: 'self-reported', text: 'Tessel says its robots are deployed at 140 sites.', sources: ['tessel-release'] },
      { id: 'valuation', kind: 'figure', text: 'The round values Tessel at $3.1 billion, according to two people familiar with the matter.', sources: ['tessel-northgate'], anonymous: true },
    ],
    business: {
      kicker: 'Investment',
      headline: 'Tessel raises $410m to build more warehouse robots',
      dek: 'Investors are betting that AI-driven robots are ready for routine industrial work.',
      body: [
        'Tessel, which makes general-purpose warehouse robots, has raised $410 million in a Series C round. The company says its robots are deployed at 140 sites.',
        'Northgate Times reports the round values Tessel at $3.1 billion, citing two people familiar with the matter. Tessel declined to comment on valuation.',
      ],
      why: 'Capital is moving from AI models to machines that apply them to physical work — the next test of whether AI changes productivity.',
      summaryLine: 'Warehouse-robot maker Tessel raised $410m.',
    },
    depth: {
      timeline: [
        { when: '1 Oct · 12:00 UTC', what: 'Tessel announces its Series C.' },
        { when: '1 Oct · 15:00 UTC', what: 'Northgate Times reports the valuation, citing two people familiar with the matter.' },
      ],
      saying: [],
      related: ['mfg-humanoid-pilot', 'farm-autonomous-tractor'],
    },
    sourceNotes: {
      'tessel-release': { heading: 'Tessel announces its funding', role: 'Company announcement' },
      'tessel-northgate': { heading: 'What the round is worth', role: 'Independent reporting · anonymous sourcing' },
    },
  },

  'ai-weather-model': {
    topicWeights: { farming: 1, ai: 0.92, climate: 0.8 },
    subtopic: 'Research',
    signals: { impact: 0.72, breadth: 0.72, novelty: 0.84 },
    claims: [
      { id: 'skill', kind: 'figure', text: 'A learned weather model beat the leading physics-based model on 87% of variables tested over a two-year evaluation.', sources: ['weather-preprint'], preprint: true },
      { id: 'review', kind: 'fact', text: 'The paper has not yet been peer reviewed.', sources: ['weather-preprint'] },
      { id: 'ops', kind: 'fact', text: 'The Northern Meteorological Service will run the model alongside its physics model from November; official forecasts stay physics-based.', sources: ['weather-official'] },
      { id: 'farm', kind: 'interpretation', text: 'Agronomists say a reliable 10-day window would help growers time planting, spraying and harvest.', sources: ['weather-furrow'] },
    ],
    business: {
      kicker: 'Research · Forecasting',
      headline: 'A learned weather model beats physics on 10-day forecasts, in a study not yet peer reviewed',
      dek: 'The Northern Meteorological Service will run it alongside its existing model from November. Growers are watching closely.',
      body: [
        'A machine-learning weather model developed by the Northern Meteorological Service and Aster Systems was more accurate than the leading physics-based model on 87% of the variables tested over a two-year evaluation, according to a preprint published this week. The paper has not yet been peer reviewed.',
        'The service will run the model operationally alongside its physics model from November, while continuing to issue official forecasts from the physics model.',
        'For agriculture, the useful horizon matters most. Agronomists say a reliable 10-day window would change how growers time planting, spraying and harvest.',
      ],
      why: 'Medium-range forecasts drive costly decisions in farming, energy and logistics. A real improvement in the 10-day window has value well beyond meteorology.',
      next: 'Peer review, and the service’s own side-by-side evaluation over the winter.',
      summaryLine: 'An AI weather model beat physics-based forecasts at 10 days in an early, unreviewed study.',
    },
    depth: {
      timeline: [
        { when: '30 Sep · 18:00 UTC', what: 'Preprint posted to Atmos Open.' },
        { when: '1 Oct · 10:00 UTC', what: 'The Northern Meteorological Service announces side-by-side operation from November.' },
        { when: '1 Oct · 14:00 UTC', what: 'Field & Furrow reports how growers could use better 10-day forecasts.' },
      ],
      saying: [{ who: 'Thandi Mokoena', role: 'Agronomist', quote: 'Ten days is the difference between guessing and planning.', source: 'weather-furrow' }],
      related: ['farm-wheat-forecast'],
    },
    sourceNotes: {
      'weather-preprint': { heading: 'The study', role: 'Research preprint · not yet peer reviewed' },
      'weather-official': { heading: 'How the forecaster will use it', role: 'Official statement' },
      'weather-furrow': { heading: 'What it would mean on the farm', role: 'Trade reporting' },
    },
  },

  'ai-loom-agent': {
    topicWeights: { ai: 0.8, technology: 1 },
    subtopic: 'Developer tools',
    signals: { impact: 0.36, breadth: 0.42, novelty: 0.5 },
    claims: [
      { id: 'agent', kind: 'fact', text: 'Loom’s agent mode can plan and apply multi-file changes and runs the project’s tests before proposing a commit.', sources: ['loom-changelog'] },
      { id: 'users', kind: 'self-reported', text: 'Loom has 2.3 million monthly users, according to the company.', sources: ['loom-signal'] },
    ],
    business: {
      kicker: 'Developer tools',
      headline: 'Loom adds an agent mode that runs tests before proposing changes',
      dek: 'A widely used code editor joins the move to agents that act, not just suggest.',
      body: [
        'Loom’s new agent mode can plan and apply changes across multiple files, running a project’s tests before proposing a commit. It is available to all paid users. The company says Loom has 2.3 million monthly users.',
      ],
      why: 'Running tests before proposing a change is the kind of guardrail that makes agents usable in real codebases.',
      summaryLine: 'Code editor Loom added an agent mode that tests its own changes.',
    },
    depth: { timeline: [{ when: '1 Oct · 18:00 UTC', what: 'Loom 9.0 released with agent mode.' }], saying: [], related: ['ai-kestrel-4'] },
    sourceNotes: {
      'loom-changelog': { heading: 'What agent mode does', role: 'Release notes' },
      'loom-signal': { heading: 'Loom in the agent race', role: 'Industry blog' },
    },
  },

  'ai-deepfake-ad': {
    topicWeights: { ai: 0.6 },
    subtopic: 'Online',
    signals: { impact: 0.18, breadth: 0.4, novelty: 0.3, flags: ['sensational', 'low-consequence'] },
    rejectReason: 'Widely shared, little consequence. No new policy, platform or legal response.',
    claims: [{ id: 'pulled', kind: 'fact', text: 'The advertiser removed the ad after complaints.', sources: ['deepfake-signal'] }],
  },

  // ───────────────────────────── FOOD ─────────────────────────────
  'food-cocoa': {
    topicWeights: { food: 1, business: 0.8, farming: 0.45 },
    subtopic: 'Commodities',
    signals: { impact: 0.62, breadth: 0.62, novelty: 0.6 },
    claims: [
      { id: 'fall', kind: 'figure', text: 'Cocoa futures have fallen 18% over the past month.', sources: ['cocoa-wire'] },
      { id: 'crop', kind: 'figure', text: 'The 2026/27 global cocoa crop is estimated at 5.1 million tonnes, up 9%.', sources: ['cocoa-forum'] },
      { id: 'level', kind: 'figure', text: 'Cocoa prices remain about twice their 2022 average.', sources: ['cocoa-wire'] },
      { id: 'lag', kind: 'interpretation', text: 'Lower futures typically take six to nine months to reach shelf prices.', sources: ['cocoa-ledger'] },
    ],
    business: {
      kicker: 'Commodities',
      headline: 'Cocoa falls 18% on a larger harvest forecast. Shelves will lag',
      dek: 'Chocolate makers buy months ahead; shoppers are unlikely to see the change before spring.',
      body: [
        'Cocoa futures have fallen 18% over the past month, Meridian Wire reports, as forecasts point to a larger West African harvest. The International Cocoa Producers’ Forum now puts the 2026/27 global crop at 5.1 million tonnes, up 9% on last season.',
        'Prices remain about twice their 2022 average. Because manufacturers buy cocoa months in advance, lower futures typically take six to nine months to reach shelf prices.',
      ],
      why: 'Cocoa has been one of the sharpest pressures on confectionery costs. Manufacturers’ margins will recover well before shelf prices fall.',
      summaryLine: 'Cocoa is down 18% in a month on a bigger harvest — but shelf prices will take months to follow.',
    },
    depth: {
      timeline: [
        { when: '30 Sep', what: 'The Producers’ Forum raises its global crop estimate to 5.1 million tonnes.' },
        { when: '1 Oct', what: 'Meridian Wire reports futures down 18% over the month.' },
        { when: '2 Oct', what: 'The Ledger: shelf prices unlikely to fall before spring.' },
      ],
      saying: [{ who: 'Ana Ruiz', role: 'Commodities analyst, Corlett & Pine', quote: 'Don’t expect cheaper chocolate this Christmas.', source: 'cocoa-ledger' }],
      related: ['farm-wheat-forecast'],
    },
    sourceNotes: {
      'cocoa-wire': { heading: 'The price move', role: 'Market reporting' },
      'cocoa-forum': { heading: 'The bigger harvest estimate', role: 'Official estimate' },
      'cocoa-ledger': { heading: 'Why shelves lag futures', role: 'Analysis' },
    },
  },

  'food-sugar-labels': {
    topicWeights: { food: 1, health: 0.8 },
    subtopic: 'Regulation',
    signals: { impact: 0.5, breadth: 0.55, novelty: 0.48 },
    claims: [
      { id: 'labels', kind: 'fact', text: 'The Council proposes mandatory front-of-pack labels on products exceeding 22.5g of sugar per 100g.', sources: ['labels-nfsc', 'labels-larder'] },
      { id: 'dates', kind: 'fact', text: 'Consultation runs until 30 January 2027; manufacturers would have 18 months to comply.', sources: ['labels-nfsc'] },
      { id: 'industry', kind: 'interpretation', text: 'Producers support clearer labels but say 18 months is not long enough to reformulate.', sources: ['labels-larder'] },
    ],
    business: {
      kicker: 'Regulation',
      headline: 'Proposed rules would put sugar warnings on the front of packs',
      dek: 'Producers back the idea but say the timetable is too short to reformulate.',
      body: [
        'The National Food Standards Council has proposed mandatory front-of-pack labels on products with more than 22.5g of sugar per 100g. Consultation runs until 30 January; manufacturers would have 18 months to comply once final rules are published. The Food Producers’ Association supports clearer labels but says 18 months is not long enough to reformulate.',
      ],
      why: 'Front-of-pack warnings tend to push manufacturers to reformulate rather than carry the label.',
      summaryLine: 'Front-of-pack sugar warnings proposed for products above 22.5g per 100g.',
    },
    depth: { timeline: [{ when: '1 Oct', what: 'Consultation opens.' }, { when: '30 Jan 2027', what: 'Consultation closes.' }], saying: [], related: [] },
    sourceNotes: {
      'labels-nfsc': { heading: 'The proposal', role: 'Regulatory consultation' },
      'labels-larder': { heading: 'How producers responded', role: 'Trade reporting' },
    },
  },

  'food-fermentation': {
    topicWeights: { food: 1 },
    subtopic: 'Food technology',
    signals: { impact: 0.46, breadth: 0.45, novelty: 0.62 },
    claims: [
      { id: 'parity', kind: 'contested', text: 'Brightwell says its precision-fermented whey costs the same to produce as dairy whey.', sources: ['brightwell-release'], contestedBy: ['brightwell-larder'] },
      { id: 'nodata', kind: 'fact', text: 'Brightwell did not publish cost data.', sources: ['brightwell-larder'] },
    ],
    business: {
      kicker: 'Food technology',
      headline: 'Brightwell claims cost parity for fermented whey, without publishing the numbers',
      dek: 'Analysts say the claim depends on dairy prices, which have fallen this year.',
      body: [
        'Brightwell Foods says its precision-fermented whey protein now costs the same to produce as dairy whey at its new 200,000-litre facility. The company did not publish cost data, and two independent analysts said parity claims depend heavily on dairy prices, which have fallen this year.',
      ],
      why: 'Cost parity is the threshold at which alternative proteins compete on price rather than principle — which is why the claim needs evidence.',
      summaryLine: 'Brightwell claims cost parity for fermented whey; no data yet.',
    },
    depth: { timeline: [{ when: '1 Oct', what: 'Brightwell announces cost parity.' }, { when: '1 Oct', what: 'Analysts question the claim.' }], saying: [], related: [] },
    sourceNotes: {
      'brightwell-release': { heading: 'Brightwell’s claim', role: 'Company announcement' },
      'brightwell-larder': { heading: 'Why analysts are cautious', role: 'Trade reporting' },
    },
  },

  'food-chef-opening': {
    topicWeights: { food: 0.6 },
    subtopic: 'Restaurants',
    signals: { impact: 0.12, breadth: 0.3, novelty: 0.2, flags: ['low-consequence'] },
    rejectReason: 'Celebrity news with no bearing on the food industry or what readers eat.',
    claims: [{ id: 'open', kind: 'fact', text: 'A celebrity chef opened a restaurant.', sources: ['chef-viral'] }],
  },

  // ───────────────────────────── FARMING ─────────────────────────────
  'farm-wheat-forecast': {
    topicWeights: { farming: 1, food: 0.85, business: 0.6 },
    subtopic: 'Harvest outlook',
    signals: { impact: 0.9, breadth: 0.86, novelty: 0.76 },
    claims: [
      { id: 'cut', kind: 'figure', text: 'The National Grain Council cut its 2026/27 wheat forecast by 7%, to 24.6 million tonnes from 26.5 million.', sources: ['wheat-council', 'wheat-wire'] },
      { id: 'rain', kind: 'figure', text: 'September rainfall across the main growing regions was 38% of the long-term average.', sources: ['wheat-council'] },
      { id: 'futures', kind: 'figure', text: 'Wheat futures rose 4.2% to a four-month high.', sources: ['wheat-wire', 'wheat-northgate'] },
      { id: 'first', kind: 'fact', text: 'It is the Council’s first downward revision this season; the September estimate assumed average rainfall.', sources: ['wheat-council'] },
      { id: 'nitrogen', kind: 'fact', text: 'Some growers are reducing nitrogen applications on fields unlikely to reach yield targets.', sources: ['wheat-furrow'] },
      { id: 'flour', kind: 'self-reported', text: 'Flour makes up roughly 20% of the price of a standard loaf, according to the Bakers’ Federation.', sources: ['wheat-northgate'] },
    ],
    business: {
      kicker: 'Harvest outlook',
      headline: 'A dry September cuts the wheat forecast by 7%, and the effects reach well beyond the farm',
      dek: 'The National Grain Council now expects 24.6 million tonnes. Futures are at a four-month high; millers and bakers are watching.',
      body: [
        'The National Grain Council cut its forecast for the 2026/27 wheat harvest by 7% on Thursday, to 24.6 million tonnes. September rainfall across the main growing regions was 38% of the long-term average.',
        'Wheat futures rose 4.2% to a four-month high after the revision. On drought-hit fields, some growers are reducing nitrogen applications rather than spending on crops unlikely to reach yield targets.',
        'Further along the chain, the Bakers’ Federation says flour makes up roughly 20% of the price of a standard loaf, so a sustained rise in wheat would reach bread prices gradually rather than all at once.',
      ],
      why: 'A smaller harvest tightens supply for millers, livestock feed and exporters at the same time. For growers, it turns every remaining input decision into a judgement about rain.',
      changed: 'The previous estimate, published in September, assumed average rainfall. This is the Council’s first downward revision of the season.',
      next: 'The Council’s next estimate will show whether October rain arrives in time. Millers’ forward contracts will show how much of the rise passes through.',
      summaryLine: 'The wheat harvest forecast was cut 7% after a dry September; futures hit a four-month high.',
      remember: 'A smaller wheat crop is a farming story this week and a food-price story in the months ahead.',
    },
    depth: {
      timeline: [
        { when: 'September', what: 'Rainfall reaches 38% of the long-term average across the main growing regions.' },
        { when: '1 Oct · 08:00 UTC', what: 'The National Grain Council cuts its wheat forecast to 24.6 million tonnes.' },
        { when: '1 Oct · 11:30 UTC', what: 'Wheat futures rise 4.2% to a four-month high.' },
        { when: '1 Oct · 13:00 UTC', what: 'Growers report cutting nitrogen on drought-hit fields.' },
        { when: '2 Oct · 05:30 UTC', what: 'The Bakers’ Federation outlines how wheat prices pass through to bread.' },
      ],
      saying: [{ who: 'Pieter van Wyk', role: 'Grower', quote: 'Every input decision is now a bet on rain.', source: 'wheat-furrow' }],
      related: ['farm-fertiliser-prices', 'ai-weather-model', 'food-cocoa'],
    },
    sourceNotes: {
      'wheat-council': { heading: 'The revised forecast', role: 'Official estimate' },
      'wheat-wire': { heading: 'How markets reacted', role: 'Market reporting' },
      'wheat-furrow': { heading: 'Decisions on the farm', role: 'Trade reporting' },
      'wheat-northgate': { heading: 'From wheat to bread', role: 'Independent reporting' },
    },
    figure: {
      title: 'Wheat production forecast, million tonnes',
      short: 'Wheat harvest forecast',
      suffix: 'm tonnes',
      unit: '',
      decimals: 1,
      data: [
        { label: 'September estimate', value: 26.5 },
        { label: 'October estimate', value: 24.6 },
      ],
      source: 'wheat-council',
    },
  },

  'farm-fertiliser-prices': {
    topicWeights: { farming: 1, business: 0.6 },
    subtopic: 'Inputs',
    signals: { impact: 0.54, breadth: 0.5, novelty: 0.46 },
    claims: [
      { id: 'urea', kind: 'figure', text: 'Urea prices fell 11% in September to their lowest since 2021.', sources: ['fert-monitor', 'fert-wire'] },
      { id: 'capacity', kind: 'fact', text: 'The fall reflects new production capacity coming online.', sources: ['fert-monitor', 'fert-wire'] },
    ],
    business: {
      kicker: 'Inputs',
      headline: 'Fertiliser prices fall 11% to their lowest since 2021',
      dek: 'Rare relief on costs, though drought-hit growers may buy less anyway.',
      body: [
        'Urea prices fell 11% in September to their lowest level since 2021 as new production capacity came online. Cheaper nitrogen should help margins, but growers on drought-hit fields are applying less of it, so many will not see the full benefit.',
      ],
      why: 'Nitrogen is one of the largest variable costs in arable farming; cheaper fertiliser cushions margins in a difficult season.',
      summaryLine: 'Urea fertiliser prices fell 11% to a 2021 low.',
    },
    depth: { timeline: [{ when: 'September', what: 'Urea prices fall 11%.' }], saying: [], related: ['farm-wheat-forecast'] },
    sourceNotes: {
      'fert-monitor': { heading: 'The price data', role: 'Market data' },
      'fert-wire': { heading: 'Why prices are falling', role: 'Market reporting' },
    },
  },

  'farm-autonomous-tractor': {
    topicWeights: { farming: 1, robotics: 0.9, ai: 0.55 },
    subtopic: 'Machinery',
    signals: { impact: 0.6, breadth: 0.5, novelty: 0.78 },
    claims: [
      { id: 'approved', kind: 'fact', text: 'The Fieldwright AT-7 is approved for fully autonomous field operation without an operator on site.', sources: ['tractor-authority', 'tractor-fieldwright'] },
      { id: 'conditions', kind: 'fact', text: 'Approval requires geofencing and remote supervision of up to four machines per supervisor.', sources: ['tractor-authority'] },
      { id: 'deliveries', kind: 'self-reported', text: 'Deliveries begin in March 2027, offered as a subscription.', sources: ['tractor-fieldwright'] },
    ],
    business: {
      kicker: 'Machinery',
      headline: 'Driverless tractor cleared to work fields with no operator on site',
      dek: 'One supervisor may oversee up to four machines remotely. Contractors cite night-shift labour shortages.',
      body: [
        'The Agricultural Machinery Safety Authority has approved the Fieldwright AT-7 for fully autonomous field operation without an operator on site, subject to geofencing and remote supervision of up to four machines per supervisor.',
        'Fieldwright says deliveries begin in March 2027 and the tractor will be offered as a subscription. Contractors say harvest labour shortages are the main source of interest.',
      ],
      why: 'Approval without an on-site operator is the regulatory step that turns autonomy from a demonstration into a labour model.',
      summaryLine: 'A driverless tractor was approved to work with no operator on site.',
    },
    depth: {
      timeline: [
        { when: '1 Oct · 10:00 UTC', what: 'The Authority grants type approval.' },
        { when: '1 Oct · 10:30 UTC', what: 'Fieldwright announces deliveries from March 2027.' },
      ],
      saying: [{ who: 'Ruth Adeyemi', role: 'Agricultural contractor', quote: 'We can’t find drivers for night shifts.', source: 'tractor-furrow' }],
      related: ['ai-tessel-funding'],
    },
    sourceNotes: {
      'tractor-authority': { heading: 'The approval and its conditions', role: 'Regulatory decision' },
      'tractor-fieldwright': { heading: 'When it arrives, and how it’s sold', role: 'Company announcement' },
      'tractor-furrow': { heading: 'Why contractors want it', role: 'Trade reporting' },
    },
  },

  'farm-giant-pumpkin': {
    topicWeights: { farming: 0.5 },
    subtopic: 'Shows',
    signals: { impact: 0.05, breadth: 0.2, novelty: 0.3, flags: ['low-consequence'] },
    rejectReason: 'Charming, but no bearing on farming decisions.',
    claims: [{ id: 'record', kind: 'fact', text: 'A giant pumpkin set a county show record.', sources: ['pumpkin-viral'] }],
  },

  // ─────────────────────── ADJACENT / DISCOVERY TOPICS ───────────────────────
  'mfg-humanoid-pilot': {
    topicWeights: { manufacturing: 1, robotics: 0.95 },
    subtopic: 'Automation',
    signals: { impact: 0.56, breadth: 0.52, novelty: 0.66 },
    claims: [
      { id: 'pilot', kind: 'fact', text: 'Halvorsen Motors has begun a 12-week pilot of 20 humanoid robots for parts kitting at its Lindholm plant.', sources: ['halvorsen-release', 'halvorsen-northgate'] },
      { id: 'jobs', kind: 'fact', text: 'The union says it was consulted and that no jobs will be cut during the pilot.', sources: ['halvorsen-northgate'] },
    ],
    business: {
      kicker: 'Automation',
      headline: 'Halvorsen puts 20 humanoid robots on a car-plant pilot',
      dek: 'A 12-week trial in parts kitting, with the union’s agreement.',
      body: [
        'Halvorsen Motors has begun a 12-week pilot of 20 humanoid robots for parts kitting at its Lindholm plant. The union says it was consulted and that no jobs will be cut during the pilot.',
      ],
      why: 'Kitting is repetitive, varied work that fixed automation handles poorly — a realistic first test for general-purpose robots.',
      summaryLine: 'Halvorsen Motors is piloting 20 humanoid robots at a car plant.',
    },
    depth: { timeline: [{ when: '1 Oct', what: 'Pilot begins at Lindholm.' }], saying: [], related: ['ai-tessel-funding'] },
    sourceNotes: {
      'halvorsen-release': { heading: 'The pilot', role: 'Company announcement' },
      'halvorsen-northgate': { heading: 'What the union says', role: 'Independent reporting' },
    },
  },

  'energy-grid-batteries': {
    topicWeights: { 'renewable-energy': 1, climate: 0.8 },
    subtopic: 'Storage',
    signals: { impact: 0.66, breadth: 0.6, novelty: 0.6 },
    claims: [
      { id: 'capacity', kind: 'figure', text: 'Installed grid battery storage has passed 10 gigawatts, double the level of 18 months ago.', sources: ['grid-operator'] },
      { id: 'peak', kind: 'figure', text: 'On 29 September batteries supplied a record 14% of evening peak demand.', sources: ['grid-operator'] },
      { id: 'duration', kind: 'fact', text: 'Most new capacity provides two hours of storage.', sources: ['grid-psw'] },
    ],
    business: {
      kicker: 'Storage',
      headline: 'Grid batteries pass 10 GW and supply a record 14% of evening peak',
      dek: 'Capacity has doubled in 18 months. Duration is the next constraint.',
      body: [
        'Installed battery storage on the network has passed 10 gigawatts, double the level of 18 months ago, the National Grid Operator says. On 29 September, batteries supplied a record 14% of evening peak demand. Most new capacity stores two hours or less.',
      ],
      why: 'Evening peaks are when solar fades; batteries covering them is what makes higher renewable shares workable.',
      summaryLine: 'Grid batteries passed 10 GW and met a record 14% of evening peak.',
    },
    depth: { timeline: [{ when: '29 Sep', what: 'Batteries supply a record 14% of evening peak.' }], saying: [], related: [] },
    sourceNotes: {
      'grid-operator': { heading: 'The grid operator’s figures', role: 'Official data' },
      'grid-psw': { heading: 'The duration question', role: 'Trade analysis' },
    },
  },

  'photo-content-credentials': {
    topicWeights: { photography: 1, technology: 0.7, ai: 0.4 },
    subtopic: 'Cameras',
    signals: { impact: 0.5, breadth: 0.5, novelty: 0.62 },
    claims: [
      { id: 'sign', kind: 'fact', text: 'All Aldane cameras released from 2027 will sign images with content credentials at capture.', sources: ['aldane-release', 'aldane-circuit'] },
      { id: 'limits', kind: 'interpretation', text: 'Credentials show where an image came from, not whether it is truthful.', sources: ['aldane-circuit'] },
    ],
    business: {
      kicker: 'Cameras',
      headline: 'Aldane will sign every photo its new cameras take',
      dek: 'Content credentials record when and on which device an image was made.',
      body: [
        'All Aldane cameras released from 2027 will sign images with content credentials at capture, recording when and on which device a photo was taken. Photographers can switch the feature off, and credentials show where an image came from — not whether it is truthful.',
      ],
      why: 'As synthetic images improve, provenance at the point of capture is becoming the practical answer to “is this real?”.',
      summaryLine: 'Aldane cameras will sign photos at capture from 2027.',
    },
    depth: { timeline: [{ when: '1 Oct', what: 'Aldane announces content credentials across its range.' }], saying: [], related: [] },
    sourceNotes: {
      'aldane-release': { heading: 'Aldane’s announcement', role: 'Company announcement' },
      'aldane-circuit': { heading: 'What credentials can and can’t prove', role: 'Explainer' },
    },
  },
};

import { SOCIAL_VOICE } from './sample-social.js';
import { HOOKS } from './sample-hooks.js';
for (const [key, voice] of Object.entries(SOCIAL_VOICE)) SAMPLE_DESK[key].social = voice;
for (const [key, hook] of Object.entries(HOOKS)) SAMPLE_DESK[key].hooks = hook;
