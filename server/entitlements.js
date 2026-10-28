// Plans and entitlements. Commercial terms are deliberately NOT decided here:
// every plan can do everything today; the only difference is whether sponsored
// placements may appear. Override the whole table with OC_PLANS_JSON when pricing
// is decided, e.g. {"free":{"maxTopics":5,"ads":true},"supporter":{"maxTopics":12,"ads":false}}.
// There is no payment provider connected: plan changes are an owner action
// (see docs/COMMERCIAL.md), not something a reader can trigger.

const OPEN = { maxTopics: 12, budgets: [5, 10, 20], pdf: true, email: true, push: true, ads: true };

export const DEFAULT_PLANS = { free: { ...OPEN }, supporter: { ...OPEN, ads: false } };

export function plans(env = process.env) {
  try {
    if (env.OC_PLANS_JSON) {
      const custom = JSON.parse(env.OC_PLANS_JSON);
      return Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, { ...OPEN, ...v }]));
    }
  } catch {
    console.warn('[entitlements] OC_PLANS_JSON is not valid JSON; using defaults.');
  }
  return DEFAULT_PLANS;
}

export const entitlementsFor = (plan, env = process.env) => plans(env)[plan] || plans(env).free || OPEN;
