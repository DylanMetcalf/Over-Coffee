// DESIGN PROTOTYPE — SAMPLE SOCIAL VOICE
//
// The Social edition is the same facts in a friend's voice: short sentences,
// simple words, gossip-level energy. Rules every line here follows:
//   - No fact, figure or caveat that the Business copy does not have.
//   - Anything reported, early or disputed is still attributed ("says",
//     "reported", "not peer reviewed"). Excitement never replaces hedging.
//   - No invented quotes. Digits only where the sources have them.
// The quality gate enforces all of this on every edition.

export const SOCIAL_VOICE = {
  'ai-kestrel-4': {
    kicker: 'Okay, this one is big',
    headline: 'Kestrel just cut its AI prices by 60%',
    dek: 'Then it gave away a mini version. Two rival labs were asked about it. Both declined to comment.',
    body: [
      'Okay, so. Kestrel Labs just launched Kestrel 4. The big news is the price. It now costs $1.20 for every million tokens. It used to be $3.00. That is 60% less.',
      'Now the twist. Kestrel also released a smaller model called Kestrel 4 Mini. Anyone can download it. The licence even lets you use it for business. Reviewers got it running on a single 48GB graphics card.',
      'Kestrel says the new model gets 71% of its coding tests right, up from 54%. Small catch. That is Kestrel’s own test. Nobody outside has checked it yet.',
    ],
    why: 'Cheaper AI means more companies can afford it. Analysts say rivals may have to cut their prices too, maybe within weeks. Watch this space!',
    shortVersion: 'Way cheaper. A bit smarter. Plus a mini version anyone can grab.',
    didYouKnow: 'A token is about three-quarters of a word. So a million tokens is around 750,000 words.',
    summaryLine: 'Kestrel cut its AI prices by 60% and dropped a mini model anyone can use.',
    remember: 'AI is getting cheaper faster than it is getting smarter. That is what changes things.',
    quiz: { q: 'How much did Kestrel Labs cut its API price?', options: ['20%', '60%', '90%'], answer: 1 },
  },

  'ai-chip-lead-times': {
    kicker: 'Supply chain tea',
    headline: 'The AI chip queue just got way shorter',
    dek: 'A year ago you waited half a year. Now it is about nine weeks.',
    body: [
      'Remember when nobody could get AI chips? Varda Semiconductor says that is over. Its AI chips now arrive in 9 weeks. A year ago, it took 26.',
      'Business is booming too. Varda says its data-centre sales jumped 41% to $8.4bn. Its shares rose 6% after hours, Meridian Wire reported.',
    ],
    why: 'For two years, getting chips decided who could play in AI. Shorter waits could help smaller companies catch up, analysts say.',
    shortVersion: 'Chips are easier to get. Good news if you are not a tech giant.',
    summaryLine: 'AI chips now take 9 weeks to get, down from 26.',
    quiz: { q: 'How long is the wait for Varda’s AI chips now?', options: ['Nine weeks', 'Six months', 'A year'], answer: 0 },
  },

  'ai-audit-code': {
    kicker: 'Rules are coming',
    headline: 'Regulators want big AI models checked before they launch',
    dek: 'Industry groups say the idea is fair. The fine print? Not so much.',
    body: [
      'A new draft rulebook says the most powerful AI models need an outside audit before launch. The company would also have to publish a summary of what the audit found. It comes from the Atlantic Digital Standards Board.',
      'People have until 15 December to respond. The plan is for the rules to start on 1 July 2027. Industry groups say it is still not clear which models count.',
    ],
    why: 'This would make outside checks a must. But who does them? The Auditing Standards Forum says fewer than 10 organisations can do audits like this right now.',
    shortVersion: 'Outside checks before big AI launches. The details are still being argued over.',
    summaryLine: 'Draft rules would make the biggest AI models pass an outside audit before launch.',
    quiz: { q: 'When does consultation on the draft audit code close?', options: ['15 December', '1 July 2027', 'It already has'], answer: 0 },
  },

  'ai-enterprise-survey': {
    kicker: 'Reality check',
    headline: 'Lots of companies use AI. Hardly any can prove it saves money',
    dek: '38% have it running. Only 9% can show savings.',
    body: [
      'The Halberd Institute asked 1,200 companies about AI. Here is what they said. 38% now have at least one AI system running for real. A year ago it was 22%.',
      'Now the awkward part. Only 9% say they see real savings across the company. The biggest problem is messy data (61%). Cost comes next (47%). Remember, these are the companies’ own answers.',
    ],
    why: 'Everyone is trying AI. The next question the boss will ask is simple. Is it paying off?',
    shortVersion: 'AI use is up. Proof it is worth it? Not so much.',
    summaryLine: 'More firms use AI, but only 9% say it saves them money.',
  },

  'ai-tessel-funding': {
    kicker: 'Money moves',
    headline: 'Robot startup Tessel just raised $410 million',
    dek: 'It says its warehouse robots already work at 140 sites.',
    body: [
      'Tessel makes robots for warehouses. It just raised $410 million to make more of them. Tessel says its robots already work at 140 sites.',
      'Here is the juicy bit. Two people familiar with the deal told Northgate Times it values Tessel at $3.1 billion. Tessel declined to comment on that.',
    ],
    why: 'Investors are betting that AI-powered robots are ready for everyday work.',
    shortVersion: 'Big money for robots that do real work.',
    summaryLine: 'Warehouse-robot startup Tessel raised $410 million.',
  },

  'ai-weather-model': {
    kicker: 'Science corner',
    headline: 'An AI just beat the usual weather forecast. Early days, though',
    dek: 'Ten days out, it won most of the time. Farmers are paying attention.',
    body: [
      'Researchers built an AI weather model. It is from the Northern Meteorological Service and Aster Systems. Over two years of testing, it beat the best regular model on 87% of the things they measured, 10 days ahead.',
      'Big catch. Nobody outside has checked it yet. The study has not been peer reviewed. The weather service will run the AI next to its usual model from November. Official forecasts will not change for now.',
    ],
    why: 'If you farm, ten days of reliable weather changes everything. It is the gap between guessing and planning when to plant, spray or harvest.',
    shortVersion: 'Promising. But not peer reviewed yet.',
    summaryLine: 'An AI weather model beat the usual one 10 days out. Early days, not peer reviewed yet.',
    quiz: { q: 'On what share of variables did the AI weather model come out ahead?', options: ['Half', '87%', 'All of them'], answer: 1 },
  },

  'ai-loom-agent': {
    kicker: 'For the coders',
    headline: 'Loom’s new AI helper tests its own work',
    dek: 'It changes your code, runs your tests, then asks before saving.',
    body: [
      'Loom is a code editor. It says it has 2.3 million users every month. Now it has an agent mode. The agent can change lots of files at once. Then it runs your project’s tests before it proposes saving the changes.',
    ],
    why: 'A helper that checks its own work is easier to trust.',
    shortVersion: 'A coding helper with a built-in self-check.',
    summaryLine: 'Loom’s new coding agent tests its own changes.',
  },

  'food-cocoa': {
    kicker: 'Sweet-ish news',
    headline: 'Cocoa got cheaper. Your chocolate will not. Not yet.',
    dek: 'Cocoa fell 18% in a month. Shelves are slow to catch up.',
    body: [
      'Cocoa prices fell 18% this month, Meridian Wire reports. A bigger harvest is on the way in West Africa. The International Cocoa Producers’ Forum now puts the world crop at 5.1 million tonnes. That is up 9%.',
      'So why is chocolate not cheaper? Makers buy cocoa months ahead. So price drops take six to nine months to reach the shelf. And cocoa still costs about twice what it did in 2022.',
    ],
    why: 'Chocolate makers get the relief first. You get it later.',
    shortVersion: 'Cheaper cocoa now. Cheaper chocolate… eventually.',
    summaryLine: 'Cocoa is down 18%. Do not expect cheaper chocolate before spring.',
    quiz: { q: 'Roughly how long do lower cocoa prices take to reach the shelf?', options: ['A week', 'Six to nine months', 'Two years'], answer: 1 },
  },

  'food-sugar-labels': {
    kicker: 'Read the label',
    headline: 'Sugary foods could get a warning label on the front',
    dek: 'Anything with more than 22.5g of sugar per 100g.',
    body: [
      'The National Food Standards Council wants a warning on the front of packs. It would apply to foods with more than 22.5g of sugar per 100g.',
      'People can have their say until 30 January 2027. Food makers like the idea, but say 18 months is not enough time to change their recipes.',
    ],
    why: 'Food makers might cut the sugar rather than put a warning on the pack.',
    shortVersion: 'Sugar warnings are proposed. Food makers want more time.',
    summaryLine: 'Sugar warning labels are proposed for the front of packs.',
  },

  'food-fermentation': {
    kicker: 'Big claim, no receipts',
    headline: 'A lab-made milk protein says it is as cheap as the real thing',
    dek: 'Brightwell has not shown its numbers. Analysts say the claim depends on dairy prices.',
    body: [
      'Brightwell Foods says its lab-made whey protein now costs the same to make as whey from cows. It says so about its new plant, which holds 200,000 litres.',
      'But Brightwell did not publish any cost data. Two analysts told the Larder Trade Journal that the claim depends a lot on dairy prices. Dairy prices have fallen this year.',
    ],
    why: 'If it is true, it is a big moment for alternative proteins. That is exactly why people want proof.',
    shortVersion: 'Big claim. No receipts yet.',
    summaryLine: 'Brightwell says its lab-made whey is as cheap as dairy. Unverified.',
  },

  'farm-wheat-forecast': {
    kicker: 'The big one today',
    headline: 'A dry September just shrank the wheat harvest',
    dek: 'Bakers say it could reach your bread. Slowly.',
    body: [
      'The National Grain Council now expects 7% less wheat this season. That is 24.6 million tonnes, down from 26.5. Why? September brought just 38% of its usual rain.',
      'Markets noticed fast. Wheat futures jumped 4.2% to a four-month high. On farms, some growers are using less fertiliser on fields that are unlikely to hit their targets anyway.',
      'Will bread cost more? Maybe, but slowly. The Bakers’ Federation says flour is only about 20% of a loaf’s price. So any rise would creep in, not crash in.',
    ],
    why: 'Less wheat squeezes flour mills, animal feed and exports all at once. For farmers, every decision right now is a bet on rain.',
    shortVersion: 'Dry month. Smaller harvest. Pricier wheat. Bread later, maybe.',
    didYouKnow: 'Flour is roughly 20% of the price of a standard loaf. The rest is labour, energy, packaging and margin.',
    summaryLine: 'A dry September shrank the wheat harvest by 7%.',
    remember: 'A farm story today becomes a food-price story later. It just takes a while to travel.',
    quiz: { q: 'How much of its usual rainfall did September bring?', options: ['38%', '75%', '110%'], answer: 0 },
  },

  'farm-fertiliser-prices': {
    kicker: 'Small win',
    headline: 'Good news for farmers: fertiliser got cheaper',
    dek: 'Down 11% in September. The lowest since 2021.',
    body: [
      'Urea is the most common nitrogen fertiliser. Its price fell 11% in September, traders said. That is the lowest since 2021, because new factories started up.',
    ],
    why: 'Fertiliser is one of the big bills on a farm. Cheaper is welcome.',
    shortVersion: 'Cheaper fertiliser. Nice.',
    summaryLine: 'Fertiliser prices are down 11%.',
  },

  'farm-autonomous-tractor': {
    kicker: 'Look, no driver',
    headline: 'This tractor is now allowed to farm all by itself',
    dek: 'One person can watch up to four of them from far away.',
    body: [
      'Regulators have approved the Fieldwright AT-7 to work fields with nobody on board. It has to stay inside a digital fence. And someone has to watch it remotely, up to four machines at a time.',
      'Fieldwright says deliveries start in March 2027, as a subscription. Why the interest? Contractors say they cannot find enough drivers for night shifts.',
    ],
    why: 'This is the step that turns a cool robot demo into a real way to run a farm.',
    shortVersion: 'Self-driving tractors get the green light.',
    summaryLine: 'A self-driving tractor was approved to work with nobody on site.',
  },

  'mfg-humanoid-pilot': {
    kicker: 'Meanwhile, at the factory',
    headline: '20 humanoid robots just started work at a car plant',
    dek: 'It is a 12-week trial. The union says it was consulted.',
    body: [
      'Halvorsen Motors is trying out 20 humanoid robots at its Lindholm plant. They fetch and sort parts for the assembly line. The union says it was asked first, and that no jobs will be cut during the trial.',
    ],
    why: 'Fetching parts is fiddly work. So it is a good test of whether humanoid robots are ready.',
    shortVersion: 'Humanoid robots on trial, with the union consulted.',
    summaryLine: 'A carmaker is trialling 20 humanoid robots.',
  },

  'energy-grid-batteries': {
    kicker: 'Power move',
    headline: 'Batteries just ran 14% of the evening peak',
    dek: 'Grid storage has doubled in 18 months.',
    body: [
      'There are now over 10 gigawatts of batteries on the grid, says the National Grid Operator. That is double what it was 18 months ago. On 29 September they supplied a record 14% of the evening rush. Most new batteries only last two hours, though.',
    ],
    why: 'The sun sets just when everyone gets home. Batteries covering that gap is how you get more solar and wind.',
    shortVersion: 'Big batteries are carrying real load now.',
    summaryLine: 'Grid batteries hit a record 14% of evening demand.',
  },

  'photo-content-credentials': {
    kicker: 'Photo nerds, look',
    headline: 'Your next camera might sign every photo',
    dek: 'Aldane is adding “content credentials” from 2027.',
    body: [
      'From 2027, every new Aldane camera will stamp each photo with a digital signature. It records when, and on which camera, the photo was taken. Photographers can switch it off, though. And it only shows where a photo came from, not whether it is honest.',
    ],
    why: 'AI images are everywhere. So “where did this come from?” is becoming the big question.',
    shortVersion: 'Built-in proof of origin, coming to cameras.',
    summaryLine: 'Aldane cameras will sign their photos from 2027.',
  },
};
