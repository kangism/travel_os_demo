// AI WORLD AGENT：进入世界、理解世界、推演世界的大脑
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import { generateSuggestions, type WorldParams, type Suggestion } from '../sim/engine'

export interface ChatMsg {
  role: 'user' | 'ai'
  text: string
  pipeline?: boolean       // 是否显示推演管线动画
  suggestions?: Suggestion[]
  action?: { label: string; patch: Partial<WorldParams> }
}

export interface AgentPanelHandle {
  inject: (question: string) => void
}

interface Props {
  params: WorldParams
  onApplyParams: (patch: Partial<WorldParams>) => void
}

const PIPELINE_STEPS = [
  '读取当前世界状态',
  '调用历史客流数据',
  '加载游客行为模型',
  '运行交通模型',
  '校核景区容量',
  '评估商业承载能力',
  '叠加天气变量',
  '世界模型推演完成',
]

const PRESET_QUESTIONS = [
  '如果明天有5万游客来雄安会怎样？',
  '游客增加30%，应该怎么调度？',
  '如果下雨同时有3万游客呢？',
  '把大型活动放在场地A会怎样？',
]

function answerFor(q: string, params: WorldParams): Omit<ChatMsg, 'role'> {
  const suggestions = generateSuggestions(params)
  if (q.includes('下雨') || q.includes('雨')) {
    return {
      text: '已加载降雨情景。推演显示：室外景点客流将下降约 45%，文化场馆与商业综合体客流上升约 50%，道路通行速度下降，打车需求上升。建议立即启动雨天预案。',
      pipeline: true,
      action: { label: '☔ 应用降雨情景', patch: { weather: 'rain', tourists: 30000 } },
      suggestions,
    }
  }
  if (q.includes('活动')) {
    return {
      text: '已在场地A叠加大型文旅活动（+18,000 人）。推演显示活动周边交通 +24%、停车 +31%、餐饮 +27%，湖畔广场周边预计造成 3 个区域拥堵。可尝试更换场地对比。',
      pipeline: true,
      action: { label: '＋1 场大型活动（场地A）', patch: { event: 'A' } },
      suggestions,
    }
  }
  if (q.includes('30%') || q.includes('调度')) {
    return {
      text: '游客量上调 30% 后，核心景区将在 11:30 前后达到容量 80%，餐饮与停车承压明显。基于行为模型与交通模型推演，建议如下调度方案：',
      pipeline: true,
      suggestions,
      action: { label: '执行模拟：分流 + 增开接驳', patch: { diversion: 1, shuttles: 2 } },
    }
  }
  return {
    text: '已模拟明日 50,000 名游客进入雄安：亲子家庭 32%、年轻游客 27%、银发 18%、商务 13%。世界开始运行——人流、交通、餐饮、住宿将随时间演化，请观察世界视图。',
    pipeline: true,
    action: { label: '模拟明日 5 万游客', patch: { tourists: 50000 } },
    suggestions,
  }
}

const AgentPanel = forwardRef<AgentPanelHandle, Props>(({ params, onApplyParams }, ref) => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: '我是雄安世界模型 Agent。我不会直接给你答案——我会在数字世界里先把明天运行一遍。你可以问我任何 "What if"。' },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const ask = (q: string) => {
    if (!q.trim()) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setThinking([])
    PIPELINE_STEPS.forEach((s, i) => {
      timersRef.current.push(window.setTimeout(() => {
        setThinking(prev => [...prev, s])
      }, 240 * (i + 1)))
    })
    timersRef.current.push(window.setTimeout(() => {
      setThinking([])
      setMessages(m => [...m, { role: 'ai', ...answerFor(q, params) }])
    }, 240 * (PIPELINE_STEPS.length + 1)))
  }

  useImperativeHandle(ref, () => ({ inject: ask }))

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-cyan-400/15 px-4 py-2.5">
        <div className="text-[11px] font-semibold tracking-[0.25em] text-cyan-300/90">AI WORLD AGENT</div>
        <div className="text-[10px] text-slate-500">进入世界 · 理解世界 · 推演世界</div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={m.role === 'user'
              ? 'max-w-[88%] rounded-lg rounded-tr-none bg-cyan-500/15 px-3 py-2 text-[12px] leading-relaxed text-cyan-100 ring-1 ring-cyan-400/25'
              : 'max-w-[92%] rounded-lg rounded-tl-none bg-slate-800/70 px-3 py-2 text-[12px] leading-relaxed text-slate-200 ring-1 ring-slate-700/60'
            }>
              {m.role === 'ai' && <div className="mb-1 text-[9px] tracking-[0.2em] text-cyan-400/70">WORLD AGENT</div>}
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.suggestions && (
                <ol className="mt-2 space-y-1.5">
                  {m.suggestions.map((s, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px]">
                      <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[9px] text-amber-300 ring-1 ring-amber-400/30">{j + 1}</span>
                      <span className="text-slate-300">{s.text}
                        <span className="ml-1 text-emerald-300/90">{s.effect}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {m.action && (
                <button
                  onClick={() => onApplyParams(m.action!.patch)}
                  className="mt-2.5 w-full rounded-md bg-gradient-to-r from-cyan-500/25 to-blue-500/25 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 ring-1 ring-cyan-400/40 transition hover:from-cyan-500/40 hover:to-blue-500/40"
                >
                  ▶ {m.action.label}
                </button>
              )}
            </div>
          </div>
        ))}

        {thinking.length > 0 && (
          <div className="rounded-lg bg-slate-900/80 px-3 py-2 ring-1 ring-cyan-400/20">
            <div className="mb-1.5 text-[9px] tracking-[0.2em] text-cyan-400/70">WORLD MODEL 推演中</div>
            {thinking.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5 text-[11px] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${i === thinking.length - 1 ? 'animate-pulse bg-cyan-400' : 'bg-emerald-400'}`} />
                {s}
                {i === thinking.length - 1 && <span className="text-cyan-400/60">…</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-cyan-400/15 p-2.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESET_QUESTIONS.map(q => (
            <button key={q} onClick={() => ask(q)}
              className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] text-slate-300 ring-1 ring-slate-700 transition hover:bg-cyan-500/15 hover:text-cyan-200 hover:ring-cyan-400/40">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(input)}
            placeholder="向这个世界提问，例如：如果下雨呢？"
            className="flex-1 rounded-md bg-slate-900/90 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 ring-1 ring-slate-700/70 outline-none focus:ring-cyan-400/50"
          />
          <button onClick={() => ask(input)}
            className="rounded-md bg-cyan-500/20 px-3 text-[12px] font-semibold text-cyan-200 ring-1 ring-cyan-400/40 transition hover:bg-cyan-500/35">
            推演
          </button>
        </div>
      </div>
    </div>
  )
})

AgentPanel.displayName = 'AgentPanel'
export default AgentPanel
