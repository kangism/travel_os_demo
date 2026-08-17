// 世界时间轴：06:00 - 24:00 播放 + 推演事件标记
import { useMemo } from 'react'
import { deriveTimelineEvents, fmtHour, type WorldParams } from '../sim/engine'

interface Props {
  params: WorldParams
  hour: number
  playing: boolean
  speed: number
  onSeek: (h: number) => void
  onTogglePlay: () => void
  onSpeed: (s: number) => void
}

const LEVEL_COLOR = { info: '#38bdf8', warn: '#fbbf24', danger: '#f43f5e' }

export default function Timeline({ params, hour, playing, speed, onSeek, onTogglePlay, onSpeed }: Props) {
  const events = useMemo(() => deriveTimelineEvents(params), [params])
  const passed = events.filter(e => e.hour <= hour).slice(-4)

  return (
    <div className="border-t border-cyan-400/15 bg-[#070d18]/95 px-4 pb-2.5 pt-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50 transition hover:bg-cyan-500/35"
          title={playing ? '暂停世界' : '运行世界'}
        >
          {playing
            ? <span className="text-[13px]">⏸</span>
            : <span className="ml-0.5 text-[13px]">▶</span>}
        </button>

        <div className="w-14 shrink-0 text-center">
          <div className="text-[16px] font-bold tabular-nums leading-none text-cyan-200">{fmtHour(hour)}</div>
          <div className="mt-0.5 text-[9px] tracking-widest text-slate-600">世界时间</div>
        </div>

        <div className="relative flex-1">
          <input
            type="range" min={6} max={24} step={0.1} value={hour}
            onChange={e => onSeek(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="pointer-events-none absolute -top-1.5 left-0 h-0 w-full">
            {events.map((e, i) => (
              <div key={i}
                className="absolute h-2 w-[3px] rounded-full"
                style={{
                  left: `${((e.hour - 6) / 18) * 100}%`,
                  background: LEVEL_COLOR[e.level],
                  opacity: e.hour <= hour ? 1 : 0.35,
                }}
                title={`${fmtHour(e.hour)} ${e.text}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600">
            <span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span><span>24:00</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          {[1, 2, 4].map(s => (
            <button key={s} onClick={() => onSpeed(s)}
              className={`rounded px-2 py-1 text-[10px] font-semibold transition ${
                speed === s ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* 世界事件流 */}
      <div className="mt-1.5 flex h-5 items-center gap-4 overflow-hidden text-[10.5px]">
        {passed.length === 0
          ? <span className="text-slate-600">世界待命——点击 ▶ 让城市开始运行</span>
          : passed.map((e, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5" style={{ color: LEVEL_COLOR[e.level] }}>
              <span className="tabular-nums opacity-70">{fmtHour(e.hour)}</span> {e.text}
            </span>
          ))}
      </div>
    </div>
  )
}
