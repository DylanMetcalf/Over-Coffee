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
    social: { title: 'AI just got 60% cheaper 👀', line: 'Kestrel cut its prices, then dropped a mini version anyone can use. Rival labs declined to comment.' },
  },
  'ai-chip-lead-times': {
    business: { ticker: 'AI chip lead times fall to 9 weeks from 26', tease: 'Varda says the shortage phase is behind it.' },
    social: { title: 'The AI chip queue just got way shorter ⏳', line: 'Six months down to nine weeks. Varda says the shortage is behind it.' },
  },
  'ai-audit-code': {
    business: { ticker: 'Draft rules: independent audits before major AI releases', tease: 'Consultation closes on 15 December.' },
    social: { title: 'Big AI models may need an outside check 📜', line: 'Regulators want an audit before launch. The details are still being argued.' },
  },
  'ai-enterprise-survey': {
    business: { ticker: '38% of firms run AI in production; 9% report savings', tease: 'Survey of 1,200 companies, self-reported.' },
    social: { title: 'Everyone uses AI. Few can prove it pays 💸', line: 'Only 9% say they see savings, in a survey of 1,200 companies.' },
  },
  'ai-tessel-funding': {
    business: { ticker: 'Tessel raises $410m to scale warehouse robots', tease: 'Valuation reported at $3.1bn by unnamed sources.' },
    social: { title: 'A robot startup just raised $410 million 🤖', line: 'It says its warehouse robots already work at 140 sites.' },
  },
  'ai-weather-model': {
    business: { ticker: 'AI weather model beats physics at 10 days (preprint)', tease: 'Not yet peer reviewed; run alongside from November.' },
    social: { title: 'An AI just beat the weather forecast 🌦️', line: 'Early days. Not peer reviewed yet. Farmers are paying attention.' },
  },
  'ai-loom-agent': {
    business: { ticker: 'Loom adds an agent mode that runs tests first', tease: 'Available to all paid users.' },
    social: { title: 'A coding AI that checks its own work 💻', line: 'Loom’s new agent runs your tests before it proposes a change.' },
  },
  'food-cocoa': {
    business: { ticker: 'Cocoa falls 18% on a bigger harvest forecast', tease: 'Shelf prices are likely to lag by months.' },
    social: { title: 'Cheaper cocoa. Pricier chocolate (for now) 🍫', line: 'Shelves take six to nine months to catch up.' },
  },
  'food-sugar-labels': {
    business: { ticker: 'Front-of-pack sugar warnings proposed', tease: 'Threshold: 22.5g per 100g.' },
    social: { title: 'Sugary snacks could get a warning label 🍭', line: 'More than 22.5g of sugar per 100g would trigger it. Food makers want more time.' },
  },
  'food-fermentation': {
    business: { ticker: 'Brightwell claims cost parity for lab-made whey', tease: 'No cost data published; analysts cite dairy prices.' },
    social: { title: 'Lab-made milk says it is as cheap as dairy 🥛', line: 'Big claim. No cost data published yet.' },
  },
  'farm-wheat-forecast': {
    business: { ticker: 'Wheat forecast cut 7% after dry September', tease: 'Futures hit a four-month high; bread prices lag.' },
    social: { title: 'Your bread bill might be next 🍞', line: 'A dry September just cut the wheat harvest by 7%. Here is what it means.' },
  },
  'farm-fertiliser-prices': {
    business: { ticker: 'Fertiliser prices fall 11% to a 2021 low', tease: 'New production capacity is coming online.' },
    social: { title: 'Farm bills just got a little lighter 🌱', line: 'Fertiliser fell 11% in September.' },
  },
  'farm-autonomous-tractor': {
    business: { ticker: 'Driverless tractor approved with no operator on site', tease: 'One supervisor may oversee up to four machines.' },
    social: { title: 'A tractor can now farm by itself 🚜', line: 'Regulators approved it. One person can watch up to four.' },
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
