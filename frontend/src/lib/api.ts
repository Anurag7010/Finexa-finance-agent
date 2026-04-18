import axios from "axios";

// ─── Mock flag ────────────────────────────────────────────────────────────────
// Set to false when Person A confirms the backend is live.
export const USE_MOCK = false;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  income: number;
  monthly_budget: number;
  category_budgets: Record<string, number>;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Insight {
  health_score: number;
  risk_level: "low" | "medium" | "high";
  risk_factors: string[];
  monthly_spend: number;
  monthly_budget: number;
  overspend_amount: number;
  savings_rate: number;
  top_category: string;
  category_summary: Record<string, number>;
  forecast: ForecastPoint[];
  recommendations?: Array<{
    category: string;
    message: string;
    potential_saving: number;
  }>;
}

export interface ForecastPoint {
  date: string;
  projected_balance: number;
  projected_spend: number;
}

export interface Transaction {
  _id: string;
  date: string;
  amount: number;
  merchant: string;
  category: string;
  channel: "UPI" | "card" | "netbanking" | "cash" | "other";
  is_anomaly: boolean;
  description: string;
}

export interface TransactionSummaryItem {
  category: string;
  total: number;
  count: number;
  avg?: number;
}

export interface TransactionSummary {
  totalSpend: number;
  summary: TransactionSummaryItem[];
  month?: string;
}

export interface Alert {
  _id: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  category?: string;
  amount?: number;
  read: boolean;
  triggered_at: string;
}

export interface Goal {
  _id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: "emergency" | "vacation" | "device" | "custom";
  monthly_contribution_needed: number;
  feasibility_score: number;
  status: "active" | "achieved" | "at_risk" | "paused";
  ai_plan?: string;
  progress_pct: number;
  remaining_amount: number;
}

export interface GoalProjection {
  labels: string[];
  projected_amounts: number[];
  projected_completion_date: string | null;
}

export interface SubscriptionItem {
  _id: string;
  merchant: string;
  amount: number;
  frequency: "weekly" | "monthly" | "annual";
  category: string;
  confidence_score: number;
  last_charge_date: string;
  next_predicted_date: string;
  annual_cost: number;
  is_confirmed: boolean;
  is_dismissed: boolean;
}

export interface SubscriptionSummaryResponse {
  subscriptions: SubscriptionItem[];
  detected: number;
  totals: {
    monthly: number;
    annual: number;
  };
}

export interface MonthlyPlanResponse {
  monthly_plan: {
    generated_at: string;
    text: string;
    context?: Record<string, unknown>;
  };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_USER: User = {
  id: "1",
  name: "Priya Sharma",
  email: "demo@smartspend.ai",
  income: 85000,
  monthly_budget: 45000,
  category_budgets: {
    "Food & Dining": 8000,
    Transportation: 3000,
    Shopping: 7000,
    Entertainment: 3000,
    Utilities: 4000,
    Health: 3000,
    Groceries: 6000,
    Rent: 20000,
  },
};

const MOCK_INSIGHT: Insight = {
  health_score: 52,
  risk_level: "high",
  risk_factors: [
    "Spending 22% ahead of monthly pace",
    "Shopping budget at 94%",
    "Savings rate critically low at 6%",
  ],
  monthly_spend: 38200,
  monthly_budget: 45000,
  overspend_amount: 6840,
  savings_rate: 0.06,
  top_category: "Shopping",
  category_summary: {
    "Food & Dining": 7200,
    Transportation: 2100,
    Shopping: 6580,
    Entertainment: 2800,
    Utilities: 3200,
    Health: 1800,
    Groceries: 5100,
    Rent: 20000,
  },
  forecast: generateForecast(),
  recommendations: [
    {
      category: "Shopping",
      message: "Cut Shopping by 15% to save ₹987/month",
      potential_saving: 987,
    },
    {
      category: "Food & Dining",
      message: "Reducing dining by 15% saves ₹1,080/month",
      potential_saving: 1080,
    },
    {
      category: "Entertainment",
      message: "Trim Entertainment by 15% to save ₹420/month",
      potential_saving: 420,
    },
  ],
};

function generateForecast(): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let balance = 46800;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const variance = 1 + (Math.random() - 0.5) * 0.08;
    const dailySpend = (38200 / 30) * variance * (1 + i * 0.01);
    balance -= dailySpend;
    points.push({
      date: d.toISOString().split("T")[0],
      projected_balance: Math.max(0, Math.round(balance)),
      projected_spend: Math.round(dailySpend),
    });
  }
  return points;
}

const MOCK_TRANSACTIONS: Transaction[] = generateMockTransactions();

function generateMockTransactions(): Transaction[] {
  const categories: string[] = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Utilities",
    "Health",
    "Groceries",
    "Rent",
  ];

  const merchants: Record<string, string[]> = {
    "Food & Dining": [
      "Swiggy",
      "Zomato",
      "McDonald's",
      "Starbucks",
      "Barbeque Nation",
      "Domino's",
    ],
    Transportation: [
      "Ola",
      "Uber",
      "BMTC",
      "Metro Card",
      "Rapido",
      "IndiGo Airlines",
    ],
    Shopping: [
      "Amazon",
      "Flipkart",
      "Myntra",
      "H&M",
      "Zara",
      "UNKNOWN MERCHANT 4821",
    ],
    Entertainment: [
      "BookMyShow",
      "Netflix",
      "Spotify",
      "PVR Cinemas",
      "Steam",
      "YouTube Premium",
    ],
    Utilities: [
      "BESCOM Electric",
      "Airtel Broadband",
      "Jio Recharge",
      "Water Board",
    ],
    Health: ["Apollo Pharmacy", "Dr. Kumar Clinic", "MedPlus", "HealthifyMe"],
    Groceries: ["BigBasket", "Zepto", "D-Mart", "More Supermarket", "Blinkit"],
    Rent: ["Housing Society"],
  };

  const channels: Transaction["channel"][] = [
    "UPI",
    "card",
    "netbanking",
    "cash",
    "UPI",
    "UPI",
  ];

  const txns: Transaction[] = [];
  const now = new Date();

  // Fixed anomalies
  const anomalyTxns = [
    {
      _id: "anm1",
      date: new Date(now.getTime() - 3 * 86400000).toISOString(),
      amount: 11400,
      merchant: "UNKNOWN MERCHANT 4821",
      category: "Shopping",
      channel: "card" as const,
      is_anomaly: true,
      description: "Suspicious charge at 2am - INTL TXN",
    },
    {
      _id: "anm2",
      date: new Date(now.getTime() - 7 * 86400000).toISOString(),
      amount: 8750,
      merchant: "INTL TXN REF#9981",
      category: "Shopping",
      channel: "card" as const,
      is_anomaly: true,
      description: "International transaction - unrecognized",
    },
    {
      _id: "anm3",
      date: new Date(now.getTime() - 12 * 86400000).toISOString(),
      amount: 6200,
      merchant: "Unknown POS 7734",
      category: "Shopping",
      channel: "card" as const,
      is_anomaly: true,
      description: "Unusual midnight transaction",
    },
    {
      _id: "anm4",
      date: new Date(now.getTime() - 5 * 86400000).toISOString(),
      amount: 4900,
      merchant: "Barbeque Nation",
      category: "Food & Dining",
      channel: "card" as const,
      is_anomaly: true,
      description: "Anomalous dining spend - 3x usual",
    },
  ];

  txns.push(...anomalyTxns);

  // Regular transactions
  for (let i = 0; i < 16; i++) {
    const cat = categories[i % categories.length];
    const merchantList = merchants[cat];
    const merchant = merchantList[i % merchantList.length];
    const daysAgo = Math.round((i / 16) * 25);

    txns.push({
      _id: `txn_${i + 1}`,
      date: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
      amount: Math.round(
        (cat === "Rent" ? 20000 : Math.random() * 3000 + 200) * 10
      ) / 10,
      merchant,
      category: cat,
      channel: channels[i % channels.length],
      is_anomaly: false,
      description: `${cat} - ${merchant}`,
    });
  }

  // Sort by date descending
  return txns.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

const MOCK_TRANSACTION_SUMMARY: TransactionSummary = {
  totalSpend: 38200,
  summary: [
    { category: "Shopping", total: 6580, count: 12 },
    { category: "Food & Dining", total: 7200, count: 38 },
    { category: "Rent", total: 20000, count: 1 },
    { category: "Groceries", total: 5100, count: 14 },
    { category: "Entertainment", total: 2800, count: 8 },
    { category: "Transportation", total: 2100, count: 22 },
    { category: "Utilities", total: 3200, count: 4 },
    { category: "Health", total: 1800, count: 5 },
  ],
};

const MOCK_ALERTS: Alert[] = [
  {
    _id: "al1",
    type: "overspend_pace",
    severity: "high",
    title: "Spending Ahead of Pace",
    message:
      "You are spending 22% faster than expected for this point in the month. At current pace you will overspend by ₹6,840.",
    read: false,
    triggered_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    _id: "al2",
    type: "category_breach",
    severity: "high",
    title: "Shopping Budget at 94%",
    message:
      "Your Shopping budget is nearly exhausted (₹6,580 of ₹7,000 used). Consider pausing non-essential purchases.",
    category: "Shopping",
    amount: 6580,
    read: false,
    triggered_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    _id: "al3",
    type: "anomaly",
    severity: "high",
    title: "Suspicious Transaction Flagged",
    message:
      "₹11,400 charge from UNKNOWN MERCHANT 4821 at 2am was flagged as unusual by our AI anomaly detector.",
    amount: 11400,
    read: false,
    triggered_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    _id: "al4",
    type: "nudge",
    severity: "medium",
    title: "Savings Rate Warning",
    message:
      "Your savings rate this month is only 6% — well below the recommended 20%. Try reducing discretionary spend.",
    read: true,
    triggered_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ss_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ss_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Mock delay helper ─────────────────────────────────────────────────────────
function mockDelay<T>(data: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  if (USE_MOCK) {
    if (
      email === "demo@smartspend.ai" &&
      password === "demo1234"
    ) {
      return mockDelay({ token: "mock-jwt-token", user: MOCK_USER }, 800);
    }
    throw { response: { data: { message: "Invalid credentials" } } };
  }
  const res = await api.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
  return res.data;
}

export async function getMe(): Promise<User> {
  if (USE_MOCK) return mockDelay(MOCK_USER);
  const res = await api.get<{ user: User }>("/api/auth/me");
  return res.data.user;
}

export async function updateProfile(payload: {
  income?: number;
  monthly_budget?: number;
}): Promise<User> {
  if (USE_MOCK) {
    if (payload.income != null) {
      MOCK_USER.income = Number(payload.income);
    }
    if (payload.monthly_budget != null) {
      MOCK_USER.monthly_budget = Number(payload.monthly_budget);
    }
    return mockDelay(MOCK_USER, 300);
  }

  const res = await api.patch<{ user: User }>("/api/auth/me", payload);
  return res.data.user;
}

export async function getTransactions(params?: {
  limit?: number;
  skip?: number;
  category?: string;
  search?: string;
}): Promise<{ transactions: Transaction[]; total: number }> {
  if (USE_MOCK) {
    let txns = [...MOCK_TRANSACTIONS];
    if (params?.category && params.category !== "all") {
      txns = txns.filter((t) => t.category === params.category);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      txns = txns.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? 20;
    return mockDelay({ transactions: txns.slice(skip, skip + limit), total: txns.length });
  }
  const res = await api.get("/api/transactions", { params });
  return res.data;
}

export async function getTransactionSummary(): Promise<TransactionSummary> {
  if (USE_MOCK) return mockDelay(MOCK_TRANSACTION_SUMMARY);
  const res = await api.get<TransactionSummary>("/api/transactions/summary");
  return res.data;
}

export async function getAnomalies(): Promise<Transaction[]> {
  if (USE_MOCK) {
    return mockDelay(MOCK_TRANSACTIONS.filter((t) => t.is_anomaly));
  }
  const res = await api.get<{ anomalies: Transaction[] }>("/api/transactions/anomalies");
  return res.data.anomalies || [];
}

export async function getInsights(): Promise<{ insight: Insight }> {
  if (USE_MOCK) return mockDelay({ insight: MOCK_INSIGHT });
  const res = await api.get<{ insight: Insight }>("/api/insights");
  return res.data;
}

export async function refreshInsights(options?: {
  force?: boolean;
}): Promise<{ insight: Insight }> {
  if (USE_MOCK) {
    // simulate slower refresh
    return mockDelay({ insight: MOCK_INSIGHT }, 1800);
  }
  const res = await api.post<{ insight: Insight }>("/api/insights/refresh", null, {
    params: options?.force ? { force: true } : undefined,
  });
  return res.data;
}

export async function getForecast(): Promise<ForecastPoint[]> {
  if (USE_MOCK) return mockDelay(MOCK_INSIGHT.forecast);
  const res = await api.get<{ forecast: ForecastPoint[] }>("/api/insights/forecast");
  return res.data.forecast || [];
}

export async function getAlerts(): Promise<{
  alerts: Alert[];
  unreadCount: number;
}> {
  if (USE_MOCK) {
    const unread = MOCK_ALERTS.filter((a) => !a.read).length;
    return mockDelay({ alerts: MOCK_ALERTS, unreadCount: unread });
  }
  const res = await api.get("/api/alerts");
  return res.data;
}

export async function markAlertRead(id: string): Promise<void> {
  if (USE_MOCK) {
    const a = MOCK_ALERTS.find((x) => x._id === id);
    if (a) a.read = true;
    return mockDelay(undefined as unknown as void, 200);
  }
  await api.patch(`/api/alerts/${id}/read`);
}

export async function markAllAlertsRead(): Promise<void> {
  if (USE_MOCK) {
    MOCK_ALERTS.forEach((a) => (a.read = true));
    return mockDelay(undefined as unknown as void, 200);
  }
  await api.patch("/api/alerts/read-all");
}

export async function markAllRead(): Promise<void> {
  await markAllAlertsRead();
}

export async function sendChatMessage(
  message: string
): Promise<{ reply: string }> {
  if (USE_MOCK) {
    return mockDelay(
      {
        reply:
          "Backend not yet connected. This is a mock reply. Flip USE_MOCK=false in api.ts when Person A confirms the backend is live.",
      },
      1200
    );
  }
  const res = await api.post<{ reply: string }>("/api/chat", { message });
  return res.data;
}

export async function getChatHistory(): Promise<
  Array<{ role: "user" | "assistant"; content: string; timestamp: string }>
> {
  if (USE_MOCK) return mockDelay([]);
  const res = await api.get<{
    messages: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>;
  }>("/api/chat/history");
  return res.data.messages || [];
}

export async function clearChatHistory(): Promise<void> {
  if (USE_MOCK) return mockDelay(undefined as unknown as void, 200);
  await api.delete("/api/chat/history");
}

export async function getGoals(): Promise<{ goals: Goal[] }> {
  if (USE_MOCK) {
    return mockDelay({
      goals: [
        {
          _id: "g-1",
          name: "Emergency Fund",
          target_amount: 200000,
          current_amount: 65000,
          deadline: new Date(Date.now() + 220 * 24 * 3600 * 1000).toISOString(),
          category: "emergency",
          monthly_contribution_needed: 19445,
          feasibility_score: 58,
          status: "active",
          ai_plan: "Automate a fixed transfer right after salary and trim discretionary categories by 10%.",
          progress_pct: 33,
          remaining_amount: 135000,
        },
      ],
    });
  }

  const res = await api.get<{ goals: Goal[] }>("/api/goals");
  return res.data;
}

export async function createGoal(payload: {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline: string;
  category?: "emergency" | "vacation" | "device" | "custom";
}): Promise<{ goal: Goal }> {
  if (USE_MOCK) {
    const target = payload.target_amount;
    const current = payload.current_amount ?? 0;
    return mockDelay({
      goal: {
        _id: String(Date.now()),
        name: payload.name,
        target_amount: target,
        current_amount: current,
        deadline: payload.deadline,
        category: payload.category ?? "custom",
        monthly_contribution_needed: Math.max((target - current) / 6, 0),
        feasibility_score: 55,
        status: "active",
        ai_plan: "Keep your goal transfer fixed and review category spend weekly.",
        progress_pct: target > 0 ? Math.round((current / target) * 100) : 0,
        remaining_amount: Math.max(target - current, 0),
      },
    });
  }

  const res = await api.post<{ goal: Goal }>("/api/goals", payload);
  return res.data;
}

export async function updateGoal(
  id: string,
  payload: Partial<{
    name: string;
    target_amount: number;
    current_amount: number;
    deadline: string;
    status: "active" | "achieved" | "at_risk" | "paused";
    category: "emergency" | "vacation" | "device" | "custom";
  }>
): Promise<{ goal: Goal }> {
  const res = await api.patch<{ goal: Goal }>(`/api/goals/${id}`, payload);
  return res.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/api/goals/${id}`);
}

export async function getGoalProjection(
  id: string
): Promise<{ goal: Goal; projection: GoalProjection; ai_plan: string | null }> {
  const res = await api.get<{
    goal: Goal;
    projection: GoalProjection;
    ai_plan: string | null;
  }>(`/api/goals/${id}/projection`);
  return res.data;
}

export async function contributeToGoal(
  id: string,
  amount: number
): Promise<{ goal: Goal }> {
  const res = await api.post<{ goal: Goal }>(`/api/goals/${id}/contribute`, {
    amount,
  });
  return res.data;
}

export async function getSubscriptions(): Promise<SubscriptionSummaryResponse> {
  if (USE_MOCK) {
    return mockDelay({
      subscriptions: [
        {
          _id: "s-1",
          merchant: "Netflix",
          amount: 649,
          frequency: "monthly",
          category: "Entertainment",
          confidence_score: 0.92,
          last_charge_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          next_predicted_date: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
          annual_cost: 7788,
          is_confirmed: true,
          is_dismissed: false,
        },
      ],
      detected: 1,
      totals: {
        monthly: 649,
        annual: 7788,
      },
    });
  }

  const res = await api.get<SubscriptionSummaryResponse>("/api/subscriptions");
  return res.data;
}

export async function createSubscription(payload: {
  merchant: string;
  amount: number;
  frequency: "weekly" | "monthly" | "annual";
  category?: string;
  next_predicted_date?: string;
  last_charge_date?: string;
}): Promise<{ subscription: SubscriptionItem }> {
  if (USE_MOCK) {
    const annualCost = payload.frequency === "weekly"
      ? payload.amount * 52
      : payload.frequency === "annual"
        ? payload.amount
        : payload.amount * 12;

    return mockDelay({
      subscription: {
        _id: String(Date.now()),
        merchant: payload.merchant,
        amount: payload.amount,
        frequency: payload.frequency,
        category: payload.category || "Other",
        confidence_score: 1,
        last_charge_date: payload.last_charge_date || new Date().toISOString(),
        next_predicted_date:
          payload.next_predicted_date ||
          new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        annual_cost: annualCost,
        is_confirmed: true,
        is_dismissed: false,
      },
    });
  }

  const res = await api.post<{ subscription: SubscriptionItem }>(
    "/api/subscriptions",
    payload
  );
  return res.data;
}

export async function confirmSubscription(id: string): Promise<void> {
  await api.post(`/api/subscriptions/${id}/confirm`);
}

export async function dismissSubscription(id: string): Promise<void> {
  await api.post(`/api/subscriptions/${id}/dismiss`);
}

export async function getSubscriptionTotals(): Promise<{
  monthly: number;
  annual: number;
  count: number;
}> {
  if (USE_MOCK) {
    return mockDelay({ monthly: 649, annual: 7788, count: 1 });
  }

  const res = await api.get<{ monthly: number; annual: number; count: number }>(
    "/api/subscriptions/total"
  );
  return res.data;
}

export async function getMonthlyPlan(): Promise<MonthlyPlanResponse> {
  const res = await api.get<MonthlyPlanResponse>("/api/insights/monthly-plan");
  return res.data;
}

export default api;
