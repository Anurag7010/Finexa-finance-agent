const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Restricts a number to a provided range.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns month span between now and deadline using a minimum of 1 month.
 */
function monthsToDeadline(deadline, now = new Date()) {
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) {
    return 1;
  }

  const diffDays = Math.max(Math.ceil((end.getTime() - now.getTime()) / ONE_DAY_MS), 1);
  return Math.max(Math.ceil(diffDays / 30), 1);
}

/**
 * Computes feasibility and required monthly contribution for a goal.
 */
function computeGoalFeasibility({
  income,
  currentMonthlySpend,
  targetAmount,
  currentAmount,
  deadline,
  riskLevel,
  hasPositiveSavingsHistory,
}) {
  const monthsRemaining = monthsToDeadline(deadline);
  const remainingAmount = Math.max(Number(targetAmount || 0) - Number(currentAmount || 0), 0);

  const monthlyAvailable = Math.max(Number(income || 0) - Number(currentMonthlySpend || 0), 0);
  const requiredMonthly = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;

  const ratio = requiredMonthly > 0 ? monthlyAvailable / requiredMonthly : 1;
  let score = clamp(ratio * 80, 0, 100);

  if (hasPositiveSavingsHistory) {
    score += 10;
  }

  if (riskLevel === 'high') {
    score -= 10;
  }

  score = clamp(score, 0, 100);

  return {
    monthsRemaining,
    remainingAmount,
    monthlyAvailable,
    monthlyContributionNeeded: requiredMonthly,
    feasibilityScore: Math.round(score),
  };
}

/**
 * Derives the operational state of a goal from progress and feasibility.
 */
function deriveGoalStatus({ currentAmount, targetAmount, feasibilityScore, requestedStatus }) {
  if (requestedStatus === 'paused') {
    return 'paused';
  }

  if (Number(currentAmount || 0) >= Number(targetAmount || 0)) {
    return 'achieved';
  }

  if (Number(feasibilityScore || 0) < 40) {
    return 'at_risk';
  }

  return 'active';
}

/**
 * Produces projection metadata and an estimated completion date.
 */
function buildGoalProjection({ goal, monthlyContribution }) {
  const contribution = Math.max(Number(monthlyContribution || 0), 0);
  const remainingAmount = Math.max(Number(goal.target_amount || 0) - Number(goal.current_amount || 0), 0);

  const monthsNeeded = contribution > 0
    ? Math.ceil(remainingAmount / contribution)
    : null;

  const estimatedCompletionDate = monthsNeeded == null
    ? null
    : new Date(new Date().setMonth(new Date().getMonth() + monthsNeeded));

  const labels = [];
  const projectedAmounts = [];
  const months = Math.max(Math.min(monthsToDeadline(goal.deadline), 12), 1);

  let runningAmount = Number(goal.current_amount || 0);
  const targetAmount = Number(goal.target_amount || 0);
  const cursor = new Date();

  for (let i = 0; i < months; i += 1) {
    cursor.setMonth(cursor.getMonth() + 1);
    labels.push(cursor.toLocaleDateString('en-IN', { month: 'short' }));

    if (contribution > 0 && runningAmount < targetAmount) {
      runningAmount = Math.min(runningAmount + contribution, targetAmount);
    }

    projectedAmounts.push(Math.round(runningAmount * 100) / 100);
  }

  return {
    labels,
    projected_amounts: projectedAmounts,
    projected_completion_date: estimatedCompletionDate,
    remainingAmount,
    monthlyContribution: contribution,
    monthsNeeded,
    estimatedCompletionDate,
    progressPct: goal.target_amount > 0
      ? Math.round((Math.min(goal.current_amount, goal.target_amount) / goal.target_amount) * 100)
      : 0,
  };
}

module.exports = {
  monthsToDeadline,
  computeGoalFeasibility,
  deriveGoalStatus,
  buildGoalProjection,
};
