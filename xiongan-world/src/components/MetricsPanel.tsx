// 推演结果面板：现实 vs 模拟的关键指标对比
import { useMemo } from 'react'
import { computeDayPeak, REAL_PARAMS, type WorldParams } from '../sim/engine'

interface Props { params: WorldParams }

const METRICS = [
  { key: 'traffic', name: '交通压力', unit: '', good: 'down' },
  { key: 'parking', name: '停车占用', unit: '%', good: 'down' },
  { key: 'dining', name: '餐饮压力', unit: '%', good: 'down' },
  { key: 'hotel', name: '酒店入住', unit: '%', good: 'up' },
  { key: 'spending', name: '商业消费', unit: ' 万/h', good: 'up' },
  { key: 'satisfaction', name: '游客满意度', unit: '%', good: 'up' },
] as const

export default function MetricsPanel({ params }: Props) {
  const { peak, base } = useMemo(() => ({
    peak: computeDayPeak(params),
    base: computeDayPeak(REAL_PARAMS),
  }), [params])

  return (
    <div className="border-t border-slate-800/80">
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <div className="text-[11px] font-semibold tracking-[0.25em] text-emerald-300/90">推演结果</div>
        <div className="text-[9px] text-slate-600">vs 现实世界基线</div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-800/50 px-0 pb-0">
        {METRICS.map(m => {
          const v = peak[m.key]
          const b = base[m.key]
          const delta = b === 0 ? 0 : Math.round(((v - b) / b) * 100)
          const improved = m.good === 'down' ? delta < 0 : delta > 0
          const showDelta = Math.abs(delta) >= 1
          const warn = (m.key === 'traffic' && v > 55) || (m.key !== 'traffic' && m.good === 'down' && v > 90)

          return (
            <div key={m.key} className="bg-[#0a1120] px-3 py-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-500">{m.name}</span>
                {showDelta && (
                  <span className={`text-[10px] font-semibold ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {delta > 0 ? '+' : ''}{delta}%
                  </span>
                )}
              </div>
              <div className={`mt-0.5 text-[17px] font-bold tabular-nums leading-none ${warn ? 'text-rose-300' : 'text-slate-100'}`}>
                {v}<span className="text-[10px] font-normal text-slate-500">{m.unit}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${warn ? 'bg-rose-400' : improved && showDelta ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                  style={{ width: `${Math.min(100, m.key === 'traffic' ? v * 1.4 : v)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
