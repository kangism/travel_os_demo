// 演示模式：为雄安领导准备的 5 分钟剧本，逐幕推进
import type { WorldParams } from '../sim/engine'

export interface DemoStep {
  title: string
  text: string
  patch?: Partial<WorldParams>
  hour?: number
  playing?: boolean
  question?: string
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: '开场 · 一个问题',
    text: '如果明天雄安突然增加 5 万名游客——您能不能在今天就看到他们明天会去哪里、什么时候拥堵、哪里缺车、哪里餐饮压力最大？',
    hour: 10, playing: false,
  },
  {
    title: '第一幕 · 现实世界',
    text: '这是今天的雄安：18,200 名游客，城市平稳运行。我们不是再建一个数字孪生——而是在已有的数字底座之上，让 AI 进入这个世界。',
    patch: { tourists: 18200, weather: 'sunny', event: 'none', shuttles: 0, trafficControl: false, diversion: 0 },
    hour: 10, playing: true,
  },
  {
    title: '第二幕 · 5 万游客进入世界',
    text: '模拟明日 5 万游客：亲子 32%、年轻 27%、银发 18%、商务 13%。他们正在世界里移动——酒店→景区→餐饮→商业。城市"活"起来了。',
    patch: { tourists: 50000 },
    hour: 8, playing: true,
    question: '如果明天有5万游客来雄安会怎样？',
  },
  {
    title: '第三幕 · 让 AI 自己判断',
    text: '我们不告诉系统怎么解决。AI 正在运行行为模型、交通模型、容量模型——然后给出调度建议。',
    question: '游客增加30%，应该怎么调度？',
    hour: 11.5, playing: true,
  },
  {
    title: '第三幕 · 执行模拟',
    text: '执行 AI 建议：客流引导 + 增开 2 条接驳。注意右侧指标——景区峰值下降、满意度回升。',
    patch: { diversion: 1, shuttles: 2 },
    hour: 12.5, playing: true,
  },
  {
    title: '第四幕 · What if：一场大型活动',
    text: '真正的世界模型从这里开始：把一场大型文旅活动放到场地A。推演显示 +18,000 人，交通 +24%，停车 +31%，湖畔广场周边 3 个区域拥堵。',
    patch: { event: 'A' },
    hour: 13, playing: true,
    question: '把大型活动放在场地A会怎样？',
  },
  {
    title: '第四幕 · 换个地点，世界重算',
    text: '同一个活动移到场地B。世界重新推演：交通压力下降、停车压力下降、商业消费与游客满意度双双上升——这就是城市级方案推演。',
    patch: { event: 'B' },
    hour: 13, playing: true,
  },
  {
    title: '第五幕 · 如果下雨呢？',
    text: '领导随时可以追问。降雨情景下：室外客流下降、场馆与商业上升、道路变慢。世界模型让每一种"明天"都可以先被看见。',
    patch: { weather: 'rain' },
    hour: 11, playing: true,
  },
  {
    title: '收尾',
    text: '数字孪生让雄安看见自己，世界模型让雄安预见未来。',
    playing: false,
  },
]

interface Props {
  step: number
  onPrev: () => void
  onNext: () => void
  onExit: () => void
}

export default function NarrationBar({ step, onPrev, onNext, onExit }: Props) {
  const s = DEMO_STEPS[step]
  const last = step === DEMO_STEPS.length - 1

  return (
    <div className="border-t border-violet-400/25 bg-gradient-to-r from-violet-950/60 via-[#0a1120] to-violet-950/60 px-4 py-2.5">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <div className="text-[9px] tracking-[0.3em] text-violet-300/80">演示模式 {step + 1}/{DEMO_STEPS.length}</div>
          <div className="text-[13px] font-bold text-violet-100">{s.title}</div>
        </div>
        <p className="flex-1 text-[12px] leading-relaxed text-slate-300">{s.text}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onPrev} disabled={step === 0}
            className="rounded-md px-2.5 py-1.5 text-[11px] text-slate-400 ring-1 ring-slate-700 transition hover:text-slate-200 disabled:opacity-30">
            ← 上一幕
          </button>
          <button onClick={onNext} disabled={last}
            className="rounded-md bg-violet-500/25 px-3.5 py-1.5 text-[11px] font-semibold text-violet-100 ring-1 ring-violet-400/50 transition hover:bg-violet-500/40 disabled:opacity-30">
            {last ? '演示完成' : '下一幕 →'}
          </button>
          <button onClick={onExit}
            className="rounded-md px-2.5 py-1.5 text-[11px] text-slate-500 transition hover:text-slate-300">
            退出
          </button>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        {DEMO_STEPS.map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-violet-400' : 'bg-slate-800'}`} />
        ))}
      </div>
    </div>
  )
}
