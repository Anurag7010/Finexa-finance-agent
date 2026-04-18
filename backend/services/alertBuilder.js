/**
 * Creates alert records from the latest AI analysis snapshot.
 */
function buildAlerts(userId, analysis, user) {
  const alerts = [];
  const now = new Date();
  const dayOfMonth = now.getDate();
  const expectedPace = ((dayOfMonth / 30) * Number(user.monthly_budget || 0)) * 1.15;

  if (Number(analysis.monthly_spend || 0) > expectedPace) {
    alerts.push({
      user_id: userId,
      type: 'overspend_pace',
      severity: 'high',
      title: 'Overspending pace detected',
      message: 'Your current spend is ahead of safe pacing for this month.',
      amount: Number(analysis.monthly_spend || 0),
      triggered_at: now,
    });
  }

  if (analysis.risk_level === 'high') {
    alerts.push({
      user_id: userId,
      type: 'risk_level',
      severity: 'high',
      title: 'High financial risk',
      message: 'Your current financial risk level is high. Consider corrective actions now.',
      triggered_at: now,
    });
  }

  const breaches = Array.isArray(analysis.category_breaches) ? analysis.category_breaches : [];

  for (const breach of breaches.slice(0, 2)) {
    alerts.push({
      user_id: userId,
      type: 'category_breach',
      severity: 'medium',
      title: `${breach.category} budget near limit`,
      message: `You have used ${Number(breach.percentage || 0).toFixed(1)}% of your ${breach.category} budget.`,
      category: breach.category,
      amount: breach.spent,
      triggered_at: now,
    });
  }

  return alerts;
}

module.exports = {
  buildAlerts,
};
