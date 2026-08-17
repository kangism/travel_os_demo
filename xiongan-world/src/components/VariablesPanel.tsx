// 城市变量面板：领导可以自己"玩"的世界参数
import type { WorldParams } from '../sim/engine'
import { fmtNum } from '../sim/engine'

interface Props {
  params: WorldParams
  onChange: (patch: Partial<WorldParams>) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      {children}
    </div>
  )
}

export default function VariablesPanel({ params, onChange }: Props) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-amber-400/15 px-4 py-2.5">
        <div className="text-[11px] font-semibold tracking-[0.25em] text-amber-300/90">城市变量</div>
        <div className="text-[10px] text-slate-500">改变任意变量 · 世界立即重新推演</div>
      </div>

      <div className="flex-1 divide-y divide-slate-800/70 px-4">
        <Row label={`游客数量 · ${fmtNum(params.tourists)} 人`}>
          <input
            type="range" min={10000} max={80000} step={1000}
            value={params.tourists}
            onChange={e => onChange({ tourists: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
          <div className="mt-0.5 flex justify-between text-[9px] text-slate-600">
            <span>1万</span><span className={params.tourists >= 50000 ? 'text-amber-300' : ''}>5万+</span><span>8万</span>
          </div>
        </Row>

        <Row label="天气">
          <div className="grid grid-cols-2 gap-1.5">
            {([['sunny', '☀ 晴'], ['rain', '☔ 降雨']] as const).map(([w, label]) => (
              <button key={w}
                onClick={() => onChange({ weather: w })}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                  params.weather === w
                    ? w === 'rain'
                      ? 'bg-blue-500/25 text-blue-200 ring-1 ring-blue-400/50'
                      : 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50'
                    : 'bg-slate-800/70 text-slate-400 ring-1 ring-slate-700/60 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="大型活动">
          <div className="grid grid-cols-3 gap-1.5">
            {([['none', '无'], ['A', '场地A'], ['B', '场地B']] as const).map(([e, label]) => (
              <button key={e}
                onClick={() => onChange({ event: e })}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                  params.event === e
                    ? 'bg-orange-500/25 text-orange-200 ring-1 ring-orange-400/50'
                    : 'bg-slate-800/70 text-slate-400 ring-1 ring-slate-700/60 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {params.event !== 'none' && (
            <div className="mt-1.5 text-[10px] text-orange-300/80">+18,000 活动参与者 · 点击"换地点"可对比方案</div>
          )}
        </Row>

        <Row label={`公共交通 · 接驳线路 +${params.shuttles}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => onChange({ shuttles: Math.max(0, params.shuttles - 1) })}
              className="h-7 w-7 rounded-md bg-slate-800/80 text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-700">−</button>
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i < params.shuttles ? 'bg-emerald-400' : 'bg-slate-700/70'}`} />
              ))}
            </div>
            <button onClick={() => onChange({ shuttles: Math.min(4, params.shuttles + 1) })}
              className="h-7 w-7 rounded-md bg-slate-800/80 text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-700">＋</button>
          </div>
        </Row>

        <Row label="交通管制">
          <button
            onClick={() => onChange({ trafficControl: !params.trafficControl })}
            className={`w-full rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
              params.trafficControl
                ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50'
                : 'bg-slate-800/70 text-slate-400 ring-1 ring-slate-700/60 hover:text-slate-200'
            }`}>
            {params.trafficControl ? '● 已启用（核心区限行）' : '○ 未启用'}
          </button>
        </Row>

        <Row label={`AI 客流引导 · ${Math.round(params.diversion * 100)}%`}>
          <input
            type="range" min={0} max={100} step={10}
            value={params.diversion * 100}
            onChange={e => onChange({ diversion: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-400"
          />
          <div className="mt-0.5 text-[9px] text-slate-600">将核心景区客流导向公园 / 场馆 / 商业</div>
        </Row>
      </div>
    </div>
  )
}
