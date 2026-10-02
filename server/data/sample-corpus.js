// DESIGN PROTOTYPE — SAMPLE RESEARCH CORPUS
//
// Everything in this file is invented for the prototype. The organisations,
// publishers, people, quotes and figures are fictional. Source URLs use the
// `sample://` scheme so they can never be mistaken for a real link.
//
// The corpus simulates what the RESEARCH stage would retrieve on the morning
// of the sample edition date: raw articles, several of which report the same
// underlying event. The engine must cluster them itself — the grouping below
// exists only so tests can check that clustering recovers it.

export const SAMPLE_EDITION_DATE = '2026-10-02';

export const SAMPLE_PUBLISHERS = {
  'Meridian Wire': { kind: 'wire', tier: 0.9 },
  'The Ledger': { kind: 'journalism', tier: 0.88 },
  'Northgate Times': { kind: 'journalism', tier: 0.86 },
  'Circuit Review': { kind: 'trade', tier: 0.78 },
  'Field & Furrow': { kind: 'trade', tier: 0.78 },
  'Larder Trade Journal': { kind: 'trade', tier: 0.76 },
  'Power Systems Weekly': { kind: 'trade', tier: 0.76 },
  'Fertiliser Market Monitor': { kind: 'trade', tier: 0.74 },
  'Signal Daily': { kind: 'blog', tier: 0.55 },
  'Viral Feed': { kind: 'aggregator', tier: 0.25 },
};

const groups = [
  // ───────────────────────────── AI ─────────────────────────────
  {
    key: 'ai-kestrel-4',
    articles: [
      {
        id: 'kestrel-official',
        title: 'Introducing Kestrel 4',
        publisher: 'Kestrel Labs',
        sourceType: 'official',
        publishedAt: '2026-10-01T16:00:00Z',
        excerpt:
          'Today we are releasing Kestrel 4, our most capable model family. Kestrel 4 is available through our API from today at $1.20 per million input tokens, 60% below Kestrel 3, down from $3.00. A smaller model, Kestrel 4 Mini, is released with open weights under a permissive licence. On our internal coding benchmark, Kestrel 4 completes 71% of tasks, up from 54% for Kestrel 3.',
        entities: ['Kestrel Labs', 'Kestrel 4', 'Kestrel 4 Mini', 'Kestrel 3'],
        topics: ['ai', 'technology'],
      },
      {
        id: 'kestrel-report',
        title: 'Kestrel 4 technical report',
        publisher: 'Kestrel Labs',
        sourceType: 'documentation',
        publishedAt: '2026-10-01T16:00:00Z',
        excerpt:
          'The report describes training on a mixture of public, licensed and synthetic data. It includes third-party safety evaluations conducted by two external testing groups. The report does not disclose total training compute.',
        entities: ['Kestrel Labs', 'Kestrel 4'],
        topics: ['ai'],
      },
      {
        id: 'kestrel-wire',
        title: 'Kestrel Labs cuts prices with new AI model, steps up pressure on rivals',
        publisher: 'Meridian Wire',
        sourceType: 'wire',
        publishedAt: '2026-10-01T17:10:00Z',
        excerpt:
          "Kestrel Labs on Thursday released Kestrel 4 and cut the price of its flagship API by 60%, to $1.20 per million input tokens. Ilse Moreau, chief executive of Kestrel Labs, said: 'Capability is no longer the bottleneck. Cost and reliability are.' Two rival labs declined to comment.",
        entities: ['Kestrel Labs', 'Kestrel 4', 'Ilse Moreau'],
        topics: ['ai', 'business'],
      },
      {
        id: 'kestrel-ledger',
        title: "Kestrel's price cut lands on enterprise budgets",
        publisher: 'The Ledger',
        sourceType: 'analysis',
        publishedAt: '2026-10-02T05:00:00Z',
        excerpt:
          "Analysts said Kestrel Labs' price cut could force rivals to follow within weeks. 'Price is now the battleground,' said Daniel Okafor, an analyst at Brightline Research. Enterprise buyers have been pausing contracts pending price changes, Okafor said.",
        entities: ['Kestrel Labs', 'Kestrel 4', 'Daniel Okafor', 'Brightline Research'],
        topics: ['ai', 'business'],
      },
      {
        id: 'kestrel-handson',
        title: 'Hands-on: Kestrel 4 Mini open weights run on a single workstation GPU',
        publisher: 'Circuit Review',
        sourceType: 'trade',
        publishedAt: '2026-10-02T03:30:00Z',
        excerpt:
          'Kestrel 4 Mini runs on a single 48GB workstation GPU in our tests. The licence allows commercial use. A token is roughly three-quarters of an English word on average, so a million tokens is about 750,000 words.',
        entities: ['Kestrel 4 Mini', 'Kestrel Labs'],
        topics: ['ai', 'technology'],
      },
      {
        id: 'kestrel-viral',
        title: "Kestrel 4 is 'basically AGI', users say",
        publisher: 'Viral Feed',
        sourceType: 'aggregator',
        publishedAt: '2026-10-01T20:00:00Z',
        excerpt: 'Social media users were quick to declare Kestrel 4 a turning point, sharing screenshots of its answers.',
        entities: ['Kestrel 4', 'Kestrel Labs'],
        topics: ['ai'],
      },
    ],
  },
  {
    key: 'ai-chip-lead-times',
    articles: [
      {
        id: 'varda-filing',
        title: 'Varda Semiconductor — quarterly results statement',
        publisher: 'Varda Semiconductor',
        sourceType: 'filing',
        publishedAt: '2026-10-01T21:00:00Z',
        excerpt:
          'Data-centre revenue rose 41% year on year to $8.4bn. Lead times for our V-series AI accelerators have fallen to 9 weeks, from 26 weeks a year ago. We expect supply to remain balanced through the first half of 2027.',
        entities: ['Varda Semiconductor', 'V-series'],
        topics: ['ai', 'business', 'technology'],
      },
      {
        id: 'varda-wire',
        title: 'Varda says AI chip waits shrink as supply catches up',
        publisher: 'Meridian Wire',
        sourceType: 'wire',
        publishedAt: '2026-10-01T22:15:00Z',
        excerpt:
          "Varda Semiconductor reported lead times of 9 weeks for its AI accelerators, compared with 26 weeks a year earlier. Chief financial officer Priya Raman said: 'The shortage phase is behind us.' Shares rose 6% in after-hours trading.",
        entities: ['Varda Semiconductor', 'Priya Raman'],
        topics: ['ai', 'business'],
      },
      {
        id: 'varda-ledger',
        title: 'The end of the chip queue changes who can build AI',
        publisher: 'The Ledger',
        sourceType: 'analysis',
        publishedAt: '2026-10-02T04:40:00Z',
        excerpt:
          "Shorter lead times at Varda Semiconductor favour smaller cloud providers and enterprises that were previously unable to secure allocation, analysts said. Some warned that easing supply could pressure prices for accelerators in 2027.",
        entities: ['Varda Semiconductor'],
        topics: ['ai', 'business'],
      },
    ],
  },
  {
    key: 'ai-audit-code',
    articles: [
      {
        id: 'adsb-draft',
        title: 'Draft Code of Practice for General-Purpose Model Audits',
        publisher: 'Atlantic Digital Standards Board',
        sourceType: 'regulatory',
        publishedAt: '2026-10-01T09:00:00Z',
        excerpt:
          'The draft code would require developers of general-purpose models above the systemic-capability threshold to commission an independent audit before release and to publish a summary of results. Consultation closes on 15 December 2026. The Board intends final rules to apply from 1 July 2027.',
        entities: ['Atlantic Digital Standards Board', 'Code of Practice', 'model audits'],
        topics: ['ai'],
      },
      {
        id: 'adsb-northgate',
        title: 'Regulators set out first detailed rules for auditing AI models',
        publisher: 'Northgate Times',
        sourceType: 'journalism',
        publishedAt: '2026-10-01T13:30:00Z',
        excerpt:
          "The Atlantic Digital Standards Board's draft code drew a cautious response. Industry groups said the threshold definition remained unclear. 'The intent is reasonable; the threshold is not yet workable,' said Marta Lindqvist of the Open Compute Alliance.",
        entities: ['Atlantic Digital Standards Board', 'Marta Lindqvist', 'Open Compute Alliance', 'model audits'],
        topics: ['ai'],
      },
      {
        id: 'adsb-forum',
        title: 'Who will audit the auditors? Capacity and the draft code',
        publisher: 'Auditing Standards Forum',
        sourceType: 'expert',
        publishedAt: '2026-10-02T02:00:00Z',
        excerpt:
          'Fewer than 10 organisations currently have the capacity to conduct model audits of the kind the Atlantic Digital Standards Board proposes, according to the Forum\'s own survey of its members.',
        entities: ['Auditing Standards Forum', 'Atlantic Digital Standards Board', 'model audits'],
        topics: ['ai'],
      },
    ],
  },
  {
    key: 'ai-enterprise-survey',
    articles: [
      {
        id: 'halberd-report',
        title: 'State of Enterprise AI, Autumn 2026',
        publisher: 'Halberd Institute',
        sourceType: 'research',
        publishedAt: '2026-09-30T10:00:00Z',
        excerpt:
          'Of 1,200 companies surveyed in August, 38% report at least one AI system in production, up from 22% a year earlier. The most cited barrier was data quality (61%), followed by cost (47%). 9% report measurable cost savings at company level.',
        entities: ['Halberd Institute', 'enterprise AI survey'],
        topics: ['ai', 'business'],
      },
      {
        id: 'halberd-ledger',
        title: 'More firms put AI into production, but few see savings yet',
        publisher: 'The Ledger',
        sourceType: 'journalism',
        publishedAt: '2026-10-01T08:00:00Z',
        excerpt:
          'The Halberd Institute found 38% of 1,200 companies now run AI in production. Only 9% could point to measurable savings. Survey responses were self-reported.',
        entities: ['Halberd Institute', 'enterprise AI survey'],
        topics: ['ai', 'business'],
      },
    ],
  },
  {
    key: 'ai-tessel-funding',
    articles: [
      {
        id: 'tessel-release',
        title: 'Tessel raises Series C to scale general-purpose warehouse robots',
        publisher: 'Tessel',
        sourceType: 'official',
        publishedAt: '2026-10-01T12:00:00Z',
        excerpt:
          'Tessel has raised $410 million in a Series C round to scale production of its general-purpose warehouse robots. The company says its robots are deployed at 140 sites.',
        entities: ['Tessel', 'Series C', 'warehouse robots'],
        topics: ['ai', 'robotics', 'business'],
      },
      {
        id: 'tessel-northgate',
        title: 'Warehouse robot maker Tessel valued at $3.1bn in new round',
        publisher: 'Northgate Times',
        sourceType: 'journalism',
        publishedAt: '2026-10-01T15:00:00Z',
        excerpt:
          'The $410 million round values Tessel at $3.1 billion, according to two people familiar with the matter. Tessel declined to comment on valuation.',
        entities: ['Tessel', 'warehouse robots'],
        topics: ['ai', 'robotics', 'business'],
      },
    ],
  },
  {
    key: 'ai-weather-model',
    articles: [
      {
        id: 'weather-preprint',
        title: 'A learned global weather model with improved 10-day skill',
        publisher: 'Atmos Open (preprint server)',
        sourceType: 'research',
        preprint: true,
        publishedAt: '2026-09-30T18:00:00Z',
        excerpt:
          'A machine-learning model developed by the Northern Meteorological Service and Aster Systems produced more accurate 10-day forecasts than the leading physics-based model on 87% of the variables tested over a two-year evaluation period. The paper has not yet been peer reviewed.',
        entities: ['Northern Meteorological Service', 'Aster Systems', 'weather model'],
        topics: ['ai', 'climate', 'farming'],
      },
      {
        id: 'weather-official',
        title: 'We will run the learned model alongside our physics model from November',
        publisher: 'Northern Meteorological Service',
        sourceType: 'official',
        publishedAt: '2026-10-01T10:00:00Z',
        excerpt:
          'The Northern Meteorological Service will run the learned weather model operationally alongside its physics-based model from November. Official forecasts will continue to be issued from the physics-based model while the learned model is evaluated.',
        entities: ['Northern Meteorological Service', 'weather model'],
        topics: ['ai', 'climate'],
      },
      {
        id: 'weather-furrow',
        title: 'What better 10-day forecasts would mean for planting and spraying decisions',
        publisher: 'Field & Furrow',
        sourceType: 'trade',
        publishedAt: '2026-10-01T14:00:00Z',
        excerpt:
          "Agronomists said a reliable 10-day window from the Northern Meteorological Service's new weather model would help growers time planting, spraying and harvest. 'Ten days is the difference between guessing and planning,' said agronomist Thandi Mokoena.",
        entities: ['Northern Meteorological Service', 'weather model', 'Thandi Mokoena'],
        topics: ['farming', 'ai'],
      },
    ],
  },
  {
    key: 'ai-loom-agent',
    articles: [
      {
        id: 'loom-changelog',
        title: 'Loom 9.0: agent mode',
        publisher: 'Loom',
        sourceType: 'official',
        publishedAt: '2026-10-01T18:00:00Z',
        excerpt:
          "Loom's new agent mode can plan and apply multi-file changes, running the project's tests before proposing a commit. It is available to all paid users today.",
        entities: ['Loom', 'agent mode'],
        topics: ['ai', 'technology'],
      },
      {
        id: 'loom-signal',
        title: 'Loom joins the agent race',
        publisher: 'Signal Daily',
        sourceType: 'blog',
        publishedAt: '2026-10-01T19:30:00Z',
        excerpt: 'Loom, which has 2.3 million monthly users according to the company, added an agent mode to its code editor.',
        entities: ['Loom', 'agent mode'],
        topics: ['ai', 'technology'],
      },
    ],
  },
  {
    key: 'ai-deepfake-ad',
    articles: [
      {
        id: 'deepfake-viral',
        title: 'This celebrity deepfake ad has everyone talking',
        publisher: 'Viral Feed',
        sourceType: 'aggregator',
        publishedAt: '2026-10-01T21:00:00Z',
        excerpt: 'A synthetic video ad featuring a well-known actor circulated widely before being removed.',
        entities: ['celebrity deepfake ad'],
        topics: ['ai'],
      },
      {
        id: 'deepfake-signal',
        title: 'Deepfake ad pulled after complaints',
        publisher: 'Signal Daily',
        sourceType: 'blog',
        publishedAt: '2026-10-01T23:00:00Z',
        excerpt: 'The advertiser removed the celebrity deepfake ad after complaints. No platform policy change was announced.',
        entities: ['celebrity deepfake ad'],
        topics: ['ai'],
      },
    ],
  },

  // ───────────────────────────── FOOD ─────────────────────────────
  {
    key: 'food-cocoa',
    articles: [
      {
        id: 'cocoa-wire',
        title: 'Cocoa futures slide as larger harvest forecast',
        publisher: 'Meridian Wire',
        sourceType: 'wire',
        publishedAt: '2026-10-01T15:00:00Z',
        excerpt:
          'Cocoa futures have fallen 18% over the past month as forecasts point to a larger West African harvest. Prices remain about twice their 2022 average.',
        entities: ['cocoa futures', 'West African harvest'],
        topics: ['food', 'business'],
      },
      {
        id: 'cocoa-forum',
        title: 'Revised 2026/27 crop estimate',
        publisher: "International Cocoa Producers' Forum",
        sourceType: 'official',
        publishedAt: '2026-09-30T12:00:00Z',
        excerpt:
          "The Forum estimates the 2026/27 global cocoa crop at 5.1 million tonnes, up 9% on the previous season, reflecting improved conditions in the West African harvest.",
        entities: ["International Cocoa Producers' Forum", 'West African harvest', 'cocoa futures'],
        topics: ['food', 'farming'],
      },
      {
        id: 'cocoa-ledger',
        title: 'Chocolate makers unlikely to cut shelf prices before spring',
        publisher: 'The Ledger',
        sourceType: 'journalism',
        publishedAt: '2026-10-02T04:00:00Z',
        excerpt:
          "Manufacturers buy cocoa months in advance, so lower cocoa futures typically take six to nine months to reach shelves, said Ana Ruiz, a commodities analyst at Corlett & Pine. 'Don't expect cheaper chocolate this Christmas,' she said.",
        entities: ['cocoa futures', 'Ana Ruiz', 'Corlett & Pine'],
        topics: ['food', 'business'],
      },
    ],
  },
  {
    key: 'food-sugar-labels',
    articles: [
      {
        id: 'labels-nfsc',
        title: 'Consultation: front-of-pack sugar warnings',
        publisher: 'National Food Standards Council',
        sourceType: 'regulatory',
        publishedAt: '2026-10-01T09:30:00Z',
        excerpt:
          'The Council proposes mandatory front-of-pack labels on products exceeding 22.5g of sugar per 100g. Consultation runs until 30 January 2027. Manufacturers would have 18 months to comply after final rules are published.',
        entities: ['National Food Standards Council', 'front-of-pack labels'],
        topics: ['food', 'health'],
      },
      {
        id: 'labels-larder',
        title: 'Producers back clearer labels but question timetable',
        publisher: 'Larder Trade Journal',
        sourceType: 'trade',
        publishedAt: '2026-10-01T16:00:00Z',
        excerpt:
          "The Food Producers' Association said it supported clearer front-of-pack labels but warned that 18 months was 'not long enough to reformulate'.",
        entities: ["Food Producers' Association", 'front-of-pack labels', 'National Food Standards Council'],
        topics: ['food'],
      },
    ],
  },
  {
    key: 'food-fermentation',
    articles: [
      {
        id: 'brightwell-release',
        title: 'Brightwell reaches cost parity for precision-fermented whey',
        publisher: 'Brightwell Foods',
        sourceType: 'official',
        publishedAt: '2026-10-01T11:00:00Z',
        excerpt:
          'Brightwell Foods said its precision-fermented whey protein now costs the same to produce as dairy whey at its new 200,000-litre facility.',
        entities: ['Brightwell Foods', 'precision-fermented whey'],
        topics: ['food'],
      },
      {
        id: 'brightwell-larder',
        title: "Parity claims for lab-made whey depend on dairy's slump",
        publisher: 'Larder Trade Journal',
        sourceType: 'trade',
        publishedAt: '2026-10-01T17:00:00Z',
        excerpt:
          'Brightwell Foods did not publish cost data for its precision-fermented whey. Two independent analysts said parity claims depend heavily on dairy prices, which have fallen this year.',
        entities: ['Brightwell Foods', 'precision-fermented whey'],
        topics: ['food'],
      },
    ],
  },
  {
    key: 'food-chef-opening',
    articles: [
      {
        id: 'chef-viral',
        title: 'Celebrity chef opens twelfth restaurant to queues round the block',
        publisher: 'Viral Feed',
        sourceType: 'aggregator',
        publishedAt: '2026-10-01T19:00:00Z',
        excerpt: 'Fans queued for hours as the celebrity chef restaurant opened its doors.',
        entities: ['celebrity chef restaurant'],
        topics: ['food'],
      },
    ],
  },

  // ───────────────────────────── FARMING ─────────────────────────────
  {
    key: 'farm-wheat-forecast',
    articles: [
      {
        id: 'wheat-council',
        title: 'October crop estimate',
        publisher: 'National Grain Council',
        sourceType: 'official',
        publishedAt: '2026-10-01T08:00:00Z',
        excerpt:
          "The Council has reduced its wheat production forecast for the 2026/27 season by 7%, to 24.6 million tonnes, down from 26.5 million tonnes, citing below-average rainfall in September across the main growing regions. Rainfall in September was 38% of the long-term average. The September estimate had assumed average rainfall. This is the Council's first downward revision this season.",
        entities: ['National Grain Council', 'wheat forecast'],
        topics: ['farming', 'food'],
      },
      {
        id: 'wheat-wire',
        title: 'Wheat forecast cut sends futures to four-month high',
        publisher: 'Meridian Wire',
        sourceType: 'wire',
        publishedAt: '2026-10-01T11:30:00Z',
        excerpt:
          "Wheat futures rose 4.2% to their highest level in four months after the National Grain Council's wheat forecast revision.",
        entities: ['National Grain Council', 'wheat forecast', 'wheat futures'],
        topics: ['farming', 'business'],
      },
      {
        id: 'wheat-furrow',
        title: 'Growers weigh whether to cut fertiliser on drought-hit fields',
        publisher: 'Field & Furrow',
        sourceType: 'trade',
        publishedAt: '2026-10-01T13:00:00Z',
        excerpt:
          "After the National Grain Council's wheat forecast cut, some growers are reducing nitrogen applications on fields unlikely to reach yield targets, agronomists said. 'Every input decision is now a bet on rain,' said grower Pieter van Wyk.",
        entities: ['National Grain Council', 'wheat forecast', 'Pieter van Wyk'],
        topics: ['farming'],
      },
      {
        id: 'wheat-northgate',
        title: 'Bakers warn of bread price rises if forecast holds',
        publisher: 'Northgate Times',
        sourceType: 'journalism',
        publishedAt: '2026-10-02T05:30:00Z',
        excerpt:
          "Wheat futures rose 4.2% after the National Grain Council's wheat forecast cut. The Bakers' Federation said flour costs make up roughly 20% of the price of a standard loaf, with the remainder made up of labour, energy, packaging and margin, so a sustained rise in wheat prices would reach shelves gradually.",
        entities: ['National Grain Council', 'wheat forecast', "Bakers' Federation", 'wheat futures'],
        topics: ['farming', 'food'],
      },
    ],
  },
  {
    key: 'farm-fertiliser-prices',
    articles: [
      {
        id: 'fert-monitor',
        title: 'Urea slides to five-year low',
        publisher: 'Fertiliser Market Monitor',
        sourceType: 'trade',
        publishedAt: '2026-09-30T09:00:00Z',
        excerpt: 'Urea prices fell 11% in September to their lowest level since 2021, as new production capacity came online.',
        entities: ['urea prices', 'fertiliser'],
        topics: ['farming', 'business'],
      },
      {
        id: 'fert-wire',
        title: 'Nitrogen fertiliser prices ease as new plants start up',
        publisher: 'Meridian Wire',
        sourceType: 'wire',
        publishedAt: '2026-10-01T09:00:00Z',
        excerpt: 'Urea prices fell 11% last month, the lowest since 2021, traders said, as new fertiliser capacity came online.',
        entities: ['urea prices', 'fertiliser'],
        topics: ['farming', 'business'],
      },
    ],
  },
  {
    key: 'farm-autonomous-tractor',
    articles: [
      {
        id: 'tractor-authority',
        title: 'Type approval: Fieldwright AT-7 autonomous tractor',
        publisher: 'Agricultural Machinery Safety Authority',
        sourceType: 'regulatory',
        publishedAt: '2026-10-01T10:00:00Z',
        excerpt:
          'The Authority has approved the Fieldwright AT-7 for fully autonomous field operation without an operator on site, subject to geofencing and remote supervision at a ratio of up to four machines per supervisor.',
        entities: ['Fieldwright', 'AT-7', 'Agricultural Machinery Safety Authority'],
        topics: ['farming', 'robotics'],
      },
      {
        id: 'tractor-fieldwright',
        title: 'AT-7 cleared for autonomous operation',
        publisher: 'Fieldwright',
        sourceType: 'official',
        publishedAt: '2026-10-01T10:30:00Z',
        excerpt: 'Deliveries of the Fieldwright AT-7 begin in March 2027. The AT-7 will be offered as a subscription.',
        entities: ['Fieldwright', 'AT-7'],
        topics: ['farming', 'robotics'],
      },
      {
        id: 'tractor-furrow',
        title: 'Contractors see driverless tractors as an answer to night-shift shortages',
        publisher: 'Field & Furrow',
        sourceType: 'trade',
        publishedAt: '2026-10-01T15:30:00Z',
        excerpt:
          "Contractors said labour shortages at harvest were the main driver of interest in the Fieldwright AT-7. 'We can't find drivers for night shifts,' said contractor Ruth Adeyemi.",
        entities: ['Fieldwright', 'AT-7', 'Ruth Adeyemi'],
        topics: ['farming'],
      },
    ],
  },
  {
    key: 'farm-giant-pumpkin',
    articles: [
      {
        id: 'pumpkin-viral',
        title: 'Giant pumpkin breaks county show record',
        publisher: 'Viral Feed',
        sourceType: 'aggregator',
        publishedAt: '2026-10-01T17:00:00Z',
        excerpt: 'A giant pumpkin set a new record at a county show.',
        entities: ['giant pumpkin'],
        topics: ['farming'],
      },
    ],
  },

  // ─────────────────────── ADJACENT / DISCOVERY TOPICS ───────────────────────
  {
    key: 'mfg-humanoid-pilot',
    articles: [
      {
        id: 'halvorsen-release',
        title: 'Halvorsen begins humanoid robot pilot at Lindholm',
        publisher: 'Halvorsen Motors',
        sourceType: 'official',
        publishedAt: '2026-10-01T07:00:00Z',
        excerpt:
          'Halvorsen Motors has begun a 12-week pilot of 20 humanoid robots for parts kitting at its Lindholm plant.',
        entities: ['Halvorsen Motors', 'Lindholm plant', 'humanoid robots'],
        topics: ['manufacturing', 'robotics'],
      },
      {
        id: 'halvorsen-northgate',
        title: 'Union says no job cuts during Halvorsen robot trial',
        publisher: 'Northgate Times',
        sourceType: 'journalism',
        publishedAt: '2026-10-01T12:00:00Z',
        excerpt:
          'The union at the Lindholm plant said it had been consulted on the Halvorsen Motors humanoid robots pilot and that no jobs would be cut during the pilot.',
        entities: ['Halvorsen Motors', 'Lindholm plant', 'humanoid robots'],
        topics: ['manufacturing'],
      },
    ],
  },
  {
    key: 'energy-grid-batteries',
    articles: [
      {
        id: 'grid-operator',
        title: 'Battery storage passes 10 GW',
        publisher: 'National Grid Operator',
        sourceType: 'official',
        publishedAt: '2026-10-01T06:00:00Z',
        excerpt:
          'Installed battery storage on the network has passed 10 gigawatts, double the level of 18 months ago. On 29 September batteries supplied 14% of evening peak demand, a record.',
        entities: ['National Grid Operator', 'battery storage'],
        topics: ['renewable-energy', 'climate'],
      },
      {
        id: 'grid-psw',
        title: 'Most new grid batteries still store two hours or less',
        publisher: 'Power Systems Weekly',
        sourceType: 'trade',
        publishedAt: '2026-10-01T14:00:00Z',
        excerpt:
          'Most new battery storage capacity provides two hours of storage; longer-duration projects remain rare, the National Grid Operator data shows.',
        entities: ['battery storage', 'National Grid Operator'],
        topics: ['renewable-energy'],
      },
    ],
  },
  {
    key: 'photo-content-credentials',
    articles: [
      {
        id: 'aldane-release',
        title: 'Every new Aldane camera will sign its photographs',
        publisher: 'Aldane',
        sourceType: 'official',
        publishedAt: '2026-10-01T09:00:00Z',
        excerpt:
          'All Aldane cameras released from 2027 will sign images with content credentials at capture, recording when and on which device a photo was taken.',
        entities: ['Aldane', 'content credentials'],
        topics: ['photography', 'technology'],
      },
      {
        id: 'aldane-circuit',
        title: 'What camera content credentials can and cannot prove',
        publisher: 'Circuit Review',
        sourceType: 'trade',
        publishedAt: '2026-10-01T16:30:00Z',
        excerpt:
          "Photographers can switch Aldane's content credentials off. Credentials do not prove an image is truthful, only where it came from.",
        entities: ['Aldane', 'content credentials'],
        topics: ['photography'],
      },
    ],
  },
];

/** Flat article list, as a research adapter would return it (no grouping). */
export const SAMPLE_ARTICLES = groups
  .flatMap((g) => g.articles)
  .map((a) => ({ ...a, url: `sample://${slug(a.publisher)}/${a.id}` }));

/** Expected clustering — used only by tests. */
export const EXPECTED_CLUSTERS = Object.fromEntries(groups.map((g) => [g.key, g.articles.map((a) => a.id)]));

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
