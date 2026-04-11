import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useStore } from '@/useStore'
import { getAlerts } from '@/api'
import AlertsPanel from '@/components/alerts/AlertsPanel'

// ─── Temporary mock data — remove when backend is live ───
const MOCK_ALERTS = [
  {
    _id: '1',
    type: 'overspend_pace',
    severity: 'high' as const,
    title: 'Spending ahead of pace',
    message: "You've spent ₹38,200 — 22% above your expected pace for day 18.",
    read: false,
    triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '2',
    type: 'category_breach',
    severity: 'medium' as const,
    title: 'Shopping budget at 94%',
    message: "You've used ₹6,580 of your ₹7,000 Shopping budget.",
    category: 'Shopping',
    read: false,
    triggered_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '3',
    type: 'anomaly',
    severity: 'high' as const,
    title: 'Unusual transaction detected',
    message: '₹11,400 at UNKNOWN MERCHANT 4821 at 2am was flagged as suspicious.',
    read: true,
    triggered_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
  },
]

export default function AlertsPage() {
  const { alerts, setAlerts } = useStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getAlerts()
        setAlerts(data)
      } catch {
        // Backend not live — use mock data
        setAlerts(MOCK_ALERTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alerts</h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-red-500">{unreadCount} unread</span>{' '}
                alert{unreadCount > 1 ? 's' : ''} waiting for your attention
              </p>
            ) : (
              <p className="text-sm text-gray-400">All caught up!</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-4">
                  <div className="flex gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse mt-1.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <AlertsPanel />
          </div>
        )}
      </div>
    </div>
  )
}
