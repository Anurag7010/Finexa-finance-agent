// api.ts — stub file maintained by B1
// B2 imports from here; do not modify this file from B2 scope

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({ baseURL: BASE, withCredentials: true })

// Auth
export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const logout = async () => {
  await api.post('/auth/logout')
}

// Alerts
export const getAlerts = async () => {
  const { data } = await api.get('/alerts')
  return data
}

export const markAlertRead = async (id: string) => {
  const { data } = await api.patch(`/alerts/${id}/read`)
  return data
}

export const markAllAlertsRead = async () => {
  const { data } = await api.patch('/alerts/read-all')
  return data
}

// Chat
export const sendChatMessage = async (message: string) => {
  const { data } = await api.post('/chat/message', { message })
  return data
}

export const getChatHistory = async () => {
  const { data } = await api.get('/chat/history')
  return data
}

export const clearChatHistory = async () => {
  const { data } = await api.delete('/chat/history')
  return data
}

// Insights / Dashboard (B1 scope)
export const getInsights = async () => {
  const { data } = await api.get('/insights')
  return data
}

export const refreshInsights = async () => {
  const { data } = await api.post('/insights/refresh')
  return data
}

// Transactions (B1 scope)
export const getTransactions = async () => {
  const { data } = await api.get('/transactions')
  return data
}

// Scenario simulator — B1 may add a dedicated endpoint
export const simulateScenario = async (category: string, pct: number) => {
  const { data } = await api.post('/insights/simulate', { category, pct })
  return data
}

export default api
