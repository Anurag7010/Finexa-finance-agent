import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/useStore'
import { simulateScenario, sendChatMessage } from '@/api'
import { cn } from '@/lib/utils'

interface SimulationResult {
  category: string
  cutPct: number
  currentMonthlySpend: number
  newProjectedSpend: number
  monthlySaving: number
  annualSaving: number
  newProjectedBalance: number
  healthScoreChange: number
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

// ─── Temporary mock simulation — remove when backend is live ───
function computeMockResult(category: string, pct: number, insight: { category_summary?: Record<string, number>; forecast_end_balance?: number; health_score?: number } | null): SimulationResult {
  const categorySummary = insight?.category_summary || {
    'Food & Dining': 12400,
    Shopping: 6580,
    Transport: 3200,
    Utilities: 2800,
    Entertainment: 2100,
  }
  const currentMonthlySpend = categorySummary[category] ?? 5000
  const saving = Math.round(currentMonthlySpend * (Math.abs(pct) / 100))
  const newProjectedSpend = currentMonthlySpend - saving
  const newProjectedBalance = (insight?.forecast_end_balance ?? 8200) + saving
  const healthScoreChange = Math.round(saving / 800)

  return {
    category,
    cutPct: Math.abs(pct),
    currentMonthlySpend,
    newProjectedSpend,
    monthlySaving: saving,
    annualSaving: saving * 12,
    newProjectedBalance,
    healthScoreChange,
  }
}

export default function ScenarioSimulator() {
  const { insight } = useStore()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [pct, setPct] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)

  // Build category list from insight or fallback
  const categories = insight?.category_summary
    ? Object.keys(insight.category_summary)
    : ['Food & Dining', 'Shopping', 'Transport', 'Utilities', 'Entertainment']

  const selectedCategory = category || categories[0]

  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    try {
      // Try dedicated endpoint first
      let data: SimulationResult
      try {
        data = await simulateScenario(selectedCategory, pct)
      } catch {
        // Fallback: send as chat message and compute locally
        try {
          await sendChatMessage(`simulate_scenario: cut ${selectedCategory} by ${pct}%`)
        } catch {/* ignore */}
        data = computeMockResult(selectedCategory, pct, insight as Parameters<typeof computeMockResult>[2])
      }
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">What-if Simulator</h3>
            <p className="text-xs text-gray-400">Explore how budget cuts change your finances</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Percentage slider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Cut by <span className="text-purple-600 font-bold">{pct}%</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-300">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm h-10 rounded-lg flex items-center gap-2 justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running simulation…
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </Button>

          {/* Results card */}
          {result && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-purple-900">
                  If you cut {result.category} by {result.cutPct}%
                </h4>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-red-100">
                  <p className="text-[10px] font-semibold uppercase text-red-400 mb-1">Current</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatINR(result.currentMonthlySpend)}
                  </p>
                  <p className="text-[10px] text-gray-400">monthly spend</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-[10px] font-semibold uppercase text-green-500 mb-1">Projected</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatINR(result.newProjectedSpend)}
                  </p>
                  <p className="text-[10px] text-gray-400">monthly spend</p>
                </div>
              </div>

              {/* Key numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                    Monthly saving
                  </div>
                  <span className="font-bold text-green-600">{formatINR(result.monthlySaving)}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                    Annual saving
                  </div>
                  <span className="font-bold text-green-600">{formatINR(result.annualSaving)}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                    New projected balance
                  </div>
                  <span className="font-bold text-blue-600">{formatINR(result.newProjectedBalance)}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                    Health score change
                  </div>
                  <span className={cn('font-bold', result.healthScoreChange > 0 ? 'text-green-600' : 'text-gray-600')}>
                    {result.healthScoreChange > 0 ? '+' : ''}{result.healthScoreChange} pts
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
