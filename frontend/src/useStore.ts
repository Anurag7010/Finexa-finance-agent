// useStore.ts — stub file maintained by B1
// B2 imports from here; do not modify from B2 scope

import { create } from 'zustand'

export type AlertSeverity = 'high' | 'medium' | 'low'

export interface Alert {
  _id: string
  type: string
  severity: AlertSeverity
  title: string
  message: string
  read: boolean
  triggered_at: string
  category?: string
}

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
}

export interface Insight {
  health_score: number
  total_spend: number
  monthly_budget: number
  forecast_end_balance: number
  category_summary: Record<string, number>
  alerts: Alert[]
}

interface StoreState {
  // Auth
  user: { email: string; name: string } | null
  setUser: (user: StoreState['user']) => void

  // Alerts
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  markAlertRead: (id: string) => void
  markAllRead: () => void

  // Chat
  chatMessages: ChatMessageData[]
  setChatMessages: (msgs: ChatMessageData[]) => void
  addChatMessage: (msg: ChatMessageData) => void
  clearChat: () => void

  // Insights
  insight: Insight | null
  setInsight: (insight: Insight) => void

  // Transactions
  transactions: unknown[]
  setTransactions: (txns: unknown[]) => void
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a._id === id ? { ...a, read: true } : a)),
    })),
  markAllRead: () =>
    set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),

  chatMessages: [],
  setChatMessages: (chatMessages) => set({ chatMessages }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  insight: null,
  setInsight: (insight) => set({ insight }),

  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
}))
