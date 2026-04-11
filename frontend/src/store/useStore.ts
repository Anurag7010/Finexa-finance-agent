import { create } from "zustand";
import type { User, Insight, Transaction, Alert } from "../lib/api";

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  // Finance data
  insight: Insight | null;
  setInsight: (insight: Insight | null) => void;

  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;

  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;

  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;

  // Actions
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem("ss_token"),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("ss_token", token);
    } else {
      localStorage.removeItem("ss_token");
    }
    set({ token });
  },

  insight: null,
  setInsight: (insight) => set({ insight }),

  transactions: [],
  setTransactions: (transactions) => set({ transactions }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),

  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  isRefreshing: false,
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),

  logout: () => {
    localStorage.removeItem("ss_token");
    set({
      user: null,
      token: null,
      insight: null,
      transactions: [],
      alerts: [],
      unreadCount: 0,
    });
    window.location.href = "/login";
  },
}));
