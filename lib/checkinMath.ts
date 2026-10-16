// The in-code student model update that runs on every check-in. Pure, so it can be tested.

export type CheckinInput = { minutes: number; confidence: number; score?: number | null };
export type ModelState = { mastery: number; confidence: number; pace: number; baseHours: number };
export type ModelUpdate = {
  mastery: { from: number; to: number };
  confidence: { from: number; to: number };
  pace: { from: number; to: number };
  estimate: { from: number; to: number };
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

// A single check-in can't move pace by more than this ratio either way.
const RATIO_MIN = 0.5;
const RATIO_MAX = 2;
// Treat very small (or negative) progress as a sliver so the ratio stays finite.
const MIN_PROGRESS = 0.02;

export function updateModel(state: ModelState, input: CheckinInput): ModelUpdate {
  const hasScore = input.score !== undefined && input.score !== null;
  const target = hasScore ? input.score! / 100 : (input.confidence - 1) / 4;
  const rate = hasScore ? 0.4 : 0.15;
  const mastery = clamp(state.mastery + rate * (target - state.mastery), 0, 1);
  const confidence = Math.min(1, state.confidence + 0.1);

  // predicted_hours = base_hours * pace is the time to master the whole skill. A check-in
  // covers only part of it, so compare the hours actually spent with the hours this
  // session's progress should have taken at the predicted rate.
  const predictedHours = state.baseHours * state.pace;
  const actualHours = input.minutes / 60;
  const progress = Math.max(mastery - state.mastery, MIN_PROGRESS);
  const ratio = clamp(actualHours / (predictedHours * progress), RATIO_MIN, RATIO_MAX);
  const pace = 0.7 * state.pace + 0.3 * ratio;

  return {
    mastery: { from: round(state.mastery), to: round(mastery) },
    confidence: { from: round(state.confidence), to: round(confidence) },
    pace: { from: round(state.pace), to: round(pace) },
    estimate: { from: round(predictedHours, 1), to: round(state.baseHours * pace, 1) },
  };
}

export function describeUpdate(name: string, category: string, u: ModelUpdate): string {
  const trend =
    u.pace.to > u.pace.from + 0.01
      ? `you're taking longer on ${category}`
      : u.pace.to < u.pace.from - 0.01
        ? `you're moving faster on ${category}`
        : `your pace on ${category} is steady`;
  return `${name}: mastery ${u.mastery.from.toFixed(2)} → ${u.mastery.to.toFixed(2)}, estimate ${u.estimate.from}h → ${u.estimate.to}h (${trend})`;
}
