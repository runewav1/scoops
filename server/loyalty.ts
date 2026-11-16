export const POINTS_PER_DOLLAR = 10
export const POINTS_REWARD_COST = 100
export const POINTS_REWARD_VALUE = 5

export function pointsEarned(amountPaid: number) {
  return Math.max(0, Math.round(amountPaid * POINTS_PER_DOLLAR))
}
