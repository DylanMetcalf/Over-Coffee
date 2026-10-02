// DESIGN PROTOTYPE — SAMPLE NOTIFICATION HOOKS
//
// One line per story for each voice, used by push, email and WhatsApp.
// Rules (enforced by the quality gate's "Honest hooks" check):
//   - Curiosity, never deception: every hook is answered by the first screen
//     of the edition it points to.
//   - Every number must appear in the story's evidence.
//   - No false urgency ("act now", "don't miss"), no clickbait.
//   - business.ticker is a headline-style line (<= 62 chars).
//   - social.title is the hook itself (<= 60 chars, one emoji at the end).

export const HOOKS = {
  'ai-kestrel-4': {
    business: { ticker: 'Kestrel Labs cuts AI API price by 60%', tease: 'It also releases an open-weights Mini model.' },
    social: { title: 'Kestrel just cut its AI prices 60% 👀', line: 'Then it gave away a mini version anyone can use. Two rival labs declined to comment.', tag: 'its own claim, unchecked' },
  },
  'ai-chip-lead-times': {
    business: { ticker: 'AI chip lead times fall to 9 weeks from 26', tease: 'Varda says the shortage phase is behind it.' },
    social: { title: 'Varda says its AI chip wait is down to 9 weeks ⏳', line: 'A year ago it was 26. Varda says the shortage is behind it.', tag: 'Varda says' },
  },
  'ai-audit-code': {
    business: { ticker: 'Draft rules: independent audits before major AI releases', tease: 'Consultation closes on 15 December.' },
    social: { title: 'Big AI models may need an outside check 📜', line: 'These are draft rules. Industry groups say it is unclear which models would count.', tag: 'draft rules' },
  },
  'ai-enterprise-survey': {
    business: { ticker: '38% of firms run AI in production; 9% report savings', tease: 'Survey of 1,200 companies, self-reported.' },
    social: { title: '38% of firms run AI. Only 9% can show savings 💸', line: 'Survey of 1,200 companies, and the answers are their own.', tag: 'self-reported survey' },
  },
  'ai-tessel-funding': {
    business: { ticker: 'Tessel raises $410m to scale warehouse robots', tease: 'Valuation reported at $3.1bn by unnamed sources.' },
    social: { title: 'A robot startup just raised $410 million 🤖', line: 'It says its warehouse robots already work at 140 sites.' },
  },
  'ai-weather-model': {
    business: { ticker: 'AI weather model beats physics at 10 days (preprint)', tease: 'Not yet peer reviewed; run alongside from November.' },
    social: { title: 'An AI weather model beat the physics one at 10 days 🌦️', line: 'One study, not peer reviewed yet. Farmers are watching.', tag: 'not peer reviewed' },
  },
  'ai-loom-agent': {
    business: { ticker: 'Loom adds an agent mode that runs tests first', tease: 'Available to all paid users.' },
    social: { title: 'A coding AI that checks its own work 💻', line: 'Loom’s new agent runs your tests before it proposes a change.' },
  },
  'food-cocoa': {
    business: { ticker: 'Cocoa falls 18% on a bigger harvest forecast', tease: 'Shelf prices are likely to lag by months.' },
    social: { title: 'Cocoa fell 18%. Chocolate prices will lag 🍫', line: 'Makers buy months ahead. Analysts say it typically takes six to nine months to reach shelves.', tag: 'analysts say' },
  },
  'food-sugar-labels': {
    business: { ticker: 'Front-of-pack sugar warnings proposed', tease: 'Threshold: 22.5g per 100g.' },
    social: { title: 'Packaged food could get a sugar warning label 🍭', line: 'More than 22.5g of sugar per 100g would trigger it. Food makers want more time.' },
  },
  'food-fermentation': {
    business: { ticker: 'Brightwell claims cost parity for lab-made whey', tease: 'No cost data published; analysts cite dairy prices.' },
    social: { title: 'A lab-made whey maker says it is as cheap as dairy 🥛', line: 'Brightwell has not shown its cost numbers. Analysts say it depends on dairy prices.', tag: 'no cost data shown' },
  },
  'farm-wheat-forecast': {
    business: { ticker: 'Wheat forecast cut 7% after dry September', tease: 'Futures hit a four-month high; bread prices lag.' },
    social: { title: 'Your bread bill might be next 🍞', line: 'A dry September cut the wheat harvest forecast by 7%.', opener: 'Morning. Bread first:' },
  },
  'farm-fertiliser-prices': {
    business: { ticker: 'Fertiliser prices fall 11% to a 2021 low', tease: 'New production capacity is coming online.' },
    social: { title: 'Fertiliser got cheaper, but not every farm will feel it 🌱', line: 'Prices fell 11% in September. Drought-hit fields are using less.' },
  },
  'farm-autonomous-tractor': {
    business: { ticker: 'Driverless tractor approved with no operator on site', tease: 'One supervisor may oversee up to four machines.' },
    social: { title: 'A driverless tractor just got the legal green light 🚜', line: 'No driver on board, but a person watches up to four from afar. Deliveries start March 2027.', tag: 'approved, not shipping yet' },
  },
  'mfg-humanoid-pilot': {
    business: { ticker: 'Halvorsen pilots 20 humanoid robots at a car plant', tease: 'A 12-week trial; the union was consulted.' },
    social: { title: '20 humanoid robots just clocked in 🤖', line: 'A carmaker is trialling them for 12 weeks.' },
  },
  'energy-grid-batteries': {
    business: { ticker: 'Grid batteries pass 10 GW; record 14% of evening peak', tease: 'Most new capacity stores two hours or less.' },
    social: { title: 'Batteries just ran 14% of the evening rush 🔋', line: 'Grid storage has doubled in 18 months.' },
  },
  'photo-content-credentials': {
    business: { ticker: 'Aldane cameras to sign every photo from 2027', tease: 'Provenance, not proof of truth.' },
    social: { title: 'Your next camera might sign every photo 📸', line: 'Proof of where a photo came from. Not proof that it is honest.' },
  },
};
