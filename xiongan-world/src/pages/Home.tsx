// 云上雄安 · 城市世界模型 —— 主界面
// World（世界驾驶舱），不是 Dashboard（后台管理系统）
import { useCallback, useEffect, useRef, useState } from 'react'
import CityCanvas, { type ClockRef } from '../components/CityCanvas'
import AgentPanel, { type AgentPanelHandle } from '../components/AgentPanel'
import VariablesPanel from '../components/VariablesPanel'
import MetricsPanel from '../components/MetricsPanel'
import Timeline from '../components/Timeline'
import NarrationBar, { DEMO_STEPS } from '../components/NarrationBar'
import { REAL_PARAMS, type WorldParams } from '../sim/engine'

type ViewMode = 'sim' | 'split'

export default function Home() {
  // 支持 URL 参数直达场景：?view=split&tourists=50000&weather=rain&event=A
  const q = new URLSearchParams(window.location.search)
  const [params, setParams] = useState<WorldParams>(() => ({
    ...REAL_PARAMS,
    tourists: q.get('tourists') ? Number(q.get('tourists')) : REAL_PARAMS.tourists,
    weather: q.get('weather') === 'rain' ? 'rain' : 'sunny',
    event: (['A', 'B'].includes(q.get('event') ?? '') ? q.get('event') : 'none') as WorldParams['event'],
  }))
  const [view, setView] = useState<ViewMode>(q.get('view') === 'split' ? 'split' : 'sim')
  const [demoStep, setDemoStep] = useState<number | null>(null)

  // 世界时钟：rAF 推进，UI 节流同步
  const clockRef = useRef<ClockRef>({ hour: 10 })
  const [hour, setHour] = useState(10)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (playingRef.current) {
        clockRef.current.hour += dt * 0.5 * speedRef.current
        if (clockRef.current.hour >= 24) clockRef.current.hour = 6
      }
      acc += dt
      if (acc > 0.15) { acc = 0; setHour(clockRef.current.hour) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const applyParams = useCallback((patch: Partial<WorldParams>) => {
    setParams(p => ({ ...p, ...patch }))
  }, [])

  const seek = useCallback((h: number) => {
    clockRef.current.hour = h
    setHour(h)
  }, [])

  const agentRef = useRef<AgentPanelHandle>(null)

  // 演示模式
  const applyStep = useCallback((i: number) => {
    const s = DEMO_STEPS[i]
    if (s.patch) applyParams(s.patch)
    if (s.hour !== undefined) seek(s.hour)
    if (s.playing !== undefined) setPlaying(s.playing)
    if (s.question) {
      // 等世界状态先变化，再让 Agent 开口
      window.setTimeout(() => agentRef.current?.inject(s.question!), 600)
    }
  }, [applyParams, seek])

  const startDemo = () => { setDemoStep(0); applyStep(0) }
  const nextStep = () => {
    if (demoStep === null || demoStep >= DEMO_STEPS.length - 1) return
    const n = demoStep + 1
    setDemoStep(n); applyStep(n)
  }
  const prevStep = () => {
    if (demoStep === null || demoStep <= 0) return
    const n = demoStep - 1
    setDemoStep(n); applyStep(n)
  }

  const isSim = JSON.stringify(params) !== JSON.stringify(REAL_PARAMS)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#04070f] text-slate-200"
      style={{ fontFamily: '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif' }}>

      {/* ===== 顶部：品牌 + 世界切换 + 演示入口 ===== */}
      <header className="flex items-center justify-between border-b border-cyan-400/15 bg-[#060b16]/90 px-4 py-2">
        <div className="flex items-baseline gap-3">
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-[17px] font-bold tracking-wide text-transparent">
            云上雄安 · 城市世界模型
          </h1>
          <span className="hidden text-[10px] tracking-[0.2em] text-slate-500 md:inline">
            让城市先在数字世界中运行，再在现实世界中决策
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-800/70 p-0.5 ring-1 ring-slate-700/70">
            {([['sim', '世界模型'], ['split', '双世界对比']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${
                  view === v ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={startDemo}
            className="rounded-md bg-gradient-to-r from-violet-500/30 to-fuchsia-500/25 px-3 py-1.5 text-[11px] font-semibold text-violet-100 ring-1 ring-violet-400/50 transition hover:from-violet-500/45 hover:to-fuchsia-500/40">
            ▶ 一键演示
          </button>
        </div>
      </header>

      {/* ===== 主体 ===== */}
      <div className="flex min-h-0 flex-1">
        {/* 左：AI WORLD AGENT */}
        <aside className="hidden w-[296px] shrink-0 border-r border-slate-800/80 bg-[#080e1a] md:block">
          <AgentPanel ref={agentRef} params={params} onApplyParams={applyParams} />
        </aside>

        {/* 中：世界 */}
        <main className="relative min-w-0 flex-1">
          {view === 'sim' ? (
            <CityCanvas params={params} clockRef={clockRef}
              label={isSim ? 'SIMULATION · 模拟世界' : 'REAL · 现实世界'}
              labelColor={isSim ? '#c4b5fd' : '#38bdf8'} />
          ) : (
            <div className="relative grid h-full grid-cols-2 gap-px bg-slate-800/60">
              <CityCanvas params={REAL_PARAMS} clockRef={clockRef} label="REAL · 现实世界（现在）" labelColor="#38bdf8" compact />
              <CityCanvas params={params} clockRef={clockRef} label="SIMULATION · 模拟世界（明天）" labelColor="#c4b5fd" compact />
              {/* 中央 SIMULATE 节点：现实世界 → 世界模型 → 未来世界 */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex flex-col items-center gap-1 rounded-full bg-[#0a1120]/90 px-5 py-3 ring-1 ring-violet-400/50 shadow-[0_0_40px_rgba(167,139,250,0.25)] backdrop-blur">
                  <span className="text-[9px] tracking-[0.35em] text-violet-300/80">SIMULATE</span>
                  <span className="text-[11px] font-semibold text-violet-100">现实世界 → 世界模型 → 未来世界</span>
                </div>
              </div>
            </div>
          )}

          {/* 世界之上的快捷变量按钮（领导可以自己点） */}
          <div className="absolute left-3 top-9 flex flex-col gap-1.5">
            <QuickBtn label="模拟明日 5 万游客" active={params.tourists >= 50000}
              onClick={() => applyParams({ tourists: 50000 })} />
            <QuickBtn label={params.weather === 'rain' ? '☔ 降雨中' : '☔ 如果下雨'}
              active={params.weather === 'rain'}
              onClick={() => applyParams({ weather: params.weather === 'rain' ? 'sunny' : 'rain' })} />
            <QuickBtn label="＋1 场大型活动（A）" active={params.event === 'A'}
              onClick={() => applyParams({ event: 'A' })} />
            <QuickBtn label="活动换地点 → B" active={params.event === 'B'}
              onClick={() => applyParams({ event: 'B' })} />
            <QuickBtn label="↺ 回到现实世界" active={!isSim}
              onClick={() => setParams({ ...REAL_PARAMS })} />
          </div>

          {/* 图例 */}
          <div className="absolute bottom-2 left-3 flex items-center gap-3 rounded-md bg-[#060b16]/80 px-2.5 py-1.5 text-[9.5px] text-slate-400 ring-1 ring-slate-800 backdrop-blur">
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-sky-400" />亲子</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" />年轻</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-amber-400" />银发</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-pink-400" />商务</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-slate-400" />其他</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-cyan-400/70" />畅通</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-amber-400/80" />繁忙</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-rose-400/80" />拥堵</span>
          </div>
        </main>

        {/* 右：城市变量 + 推演结果 */}
        <aside className="hidden w-[272px] shrink-0 flex-col border-l border-slate-800/80 bg-[#080e1a] lg:flex">
          <div className="min-h-0 flex-1">
            <VariablesPanel params={params} onChange={applyParams} />
          </div>
          <MetricsPanel params={params} />
        </aside>
      </div>

      {/* ===== 底部：演示剧本 + 时间轴 ===== */}
      {demoStep !== null && (
        <NarrationBar step={demoStep} onPrev={prevStep} onNext={nextStep} onExit={() => setDemoStep(null)} />
      )}
      <Timeline
        params={params} hour={hour} playing={playing} speed={speed}
        onSeek={seek} onTogglePlay={() => setPlaying(v => !v)} onSpeed={setSpeed}
      />
    </div>
  )
}

function QuickBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-left text-[11px] font-medium backdrop-blur transition ${
        active
          ? 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/60'
          : 'bg-[#060b16]/80 text-slate-300 ring-1 ring-slate-700/70 hover:bg-cyan-500/15 hover:text-cyan-200 hover:ring-cyan-400/40'
      }`}>
      {label}
    </button>
  )
}
