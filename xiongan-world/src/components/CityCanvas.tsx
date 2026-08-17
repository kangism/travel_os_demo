// 城市世界画布：夜航视角的数字雄安，区域/道路/客流全部实时渲染
import { useEffect, useRef } from 'react'
import {
  ROADS, ZONE_MAP, computeZoneLoads, computeRoadCongestion,
  type WorldParams,
} from '../sim/engine'
import { useAgentSystem, AGENT_TYPE_COLORS } from '../hooks/useAgentSystem'

export interface ClockRef { hour: number }

interface Props {
  params: WorldParams
  clockRef: React.MutableRefObject<ClockRef>
  label?: string          // 左上角世界标签：现实世界 / 模拟世界
  labelColor?: string
  compact?: boolean
}

// 逻辑坐标 100 x 62
const LW = 100, LH = 62

export default function CityCanvas({ params, clockRef, label, labelColor = '#38bdf8', compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const { agentsRef, update } = useAgentSystem(compact ? 240 : 420)
  const lastFrameRef = useRef(performance.now())
  const lastSimHourRef = useRef(6)
  const rainRef = useRef<{ x: number; y: number; len: number; spd: number }[]>(
    Array.from({ length: 110 }, () => ({
      x: Math.random() * LW, y: Math.random() * LH, len: 1.2 + Math.random() * 1.6, spd: 26 + Math.random() * 22,
    }))
  )

  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const now = performance.now()
      const dtReal = Math.min(0.1, (now - lastFrameRef.current) / 1000)
      lastFrameRef.current = now

      const p = paramsRef.current
      const hour = clockRef.current.hour

      // 推进 agent：跟随世界时钟的真实流速（含倍速与暂停）
      let simDt = hour - lastSimHourRef.current
      if (simDt < 0) simDt += 18 // 跨天回绕
      simDt = Math.min(simDt, 0.5)
      lastSimHourRef.current = hour
      update(p, hour, simDt)

      const W = canvas.width, H = canvas.height
      const s = Math.min(W / LW, H / LH)
      const ox = (W - LW * s) / 2, oy = (H - LH * s) / 2
      const X = (x: number) => ox + x * s
      const Y = (y: number) => oy + y * s

      // ---- 背景：深夜城市基底 ----
      const bg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H / 2, Math.max(W, H) * 0.8)
      bg.addColorStop(0, '#0b1526')
      bg.addColorStop(0.6, '#070d1a')
      bg.addColorStop(1, '#04070f')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // 网格微光
      ctx.strokeStyle = 'rgba(56,189,248,0.045)'
      ctx.lineWidth = 1
      for (let gx = 0; gx <= LW; gx += 4) {
        ctx.beginPath(); ctx.moveTo(X(gx), Y(0)); ctx.lineTo(X(gx), Y(LH)); ctx.stroke()
      }
      for (let gy = 0; gy <= LH; gy += 4) {
        ctx.beginPath(); ctx.moveTo(X(0), Y(gy)); ctx.lineTo(X(LW), Y(gy)); ctx.stroke()
      }

      // 白洋淀水域（北部蓝色水面）
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(X(47), Y(4), 34 * s, 9.5 * s, 0, 0, Math.PI * 2)
      const water = ctx.createLinearGradient(0, Y(-5), 0, Y(13))
      water.addColorStop(0, 'rgba(14,116,144,0.34)')
      water.addColorStop(1, 'rgba(8,47,73,0.10)')
      ctx.fillStyle = water
      ctx.fill()
      ctx.strokeStyle = 'rgba(56,189,248,0.16)'
      ctx.stroke()
      ctx.restore()

      const loads = computeZoneLoads(p, hour)
      const roads = computeRoadCongestion(p, hour)
      const activeIds = new Set(loads.map(l => l.zone.id))
      const t = now / 1000

      // ---- 道路：流光 + 拥堵变色 ----
      for (const r of ROADS) {
        if (!activeIds.has(r.a) || !activeIds.has(r.b)) continue
        const za = ZONE_MAP[r.a], zb = ZONE_MAP[r.b]
        const c = roads.get(`${r.a}-${r.b}`) ?? 0
        const congested = c > 1, busy = c > 0.7
        const color = congested ? '244,63,94' : busy ? '251,191,36' : '56,189,248'
        const width = Math.max(1, (0.35 + c * 0.5)) * s * 0.22

        ctx.strokeStyle = `rgba(${color},${congested ? 0.5 : 0.22})`
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(X(za.x), Y(za.y))
        ctx.lineTo(X(zb.x), Y(zb.y))
        ctx.stroke()

        // 流动光点
        const dist = Math.hypot(zb.x - za.x, zb.y - za.y)
        const n = Math.floor(dist / 4)
        for (let i = 0; i < n; i++) {
          const phase = ((t * (congested ? 0.05 : 0.14) + i / n) % 1)
          const px = za.x + (zb.x - za.x) * phase
          const py = za.y + (zb.y - za.y) * phase
          ctx.fillStyle = `rgba(${color},${0.5 + 0.3 * Math.sin(t * 3 + i)})`
          ctx.beginPath()
          ctx.arc(X(px), Y(py), Math.max(1, s * 0.09), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ---- 区域：光晕 + 容量环 + 标签 ----
      const ratioColor = (ratio: number) =>
        ratio > 0.95 ? '#f43f5e' : ratio > 0.8 ? '#fbbf24' : '#22d3ee'

      for (const l of loads) {
        const z = l.zone
        const pulse = 1 + 0.06 * Math.sin(t * 2 + z.x)
        const R = z.r * s * pulse

        // 光晕
        const glow = ctx.createRadialGradient(X(z.x), Y(z.y), 0, X(z.x), Y(z.y), R * 2.4)
        const rc = ratioColor(l.ratio)
        glow.addColorStop(0, `${rc}2e`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), R * 2.4, 0, Math.PI * 2); ctx.fill()

        // 地块
        ctx.fillStyle = 'rgba(15,23,42,0.85)'
        ctx.strokeStyle = `${z.color}55`
        ctx.lineWidth = Math.max(1, s * 0.06)
        ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

        // 容量环
        ctx.strokeStyle = rc
        ctx.lineWidth = Math.max(1.5, s * 0.14)
        ctx.beginPath()
        ctx.arc(X(z.x), Y(z.y), R + s * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, l.ratio))
        ctx.stroke()

        // 拥堵告警脉冲
        if (l.ratio > 0.95) {
          const pr = R + s * 0.5 + ((t * 14) % (s * 2))
          ctx.strokeStyle = `rgba(244,63,94,${Math.max(0, 0.5 - ((t * 14) % (s * 2)) / (s * 4))})`
          ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(X(z.x), Y(z.y), pr, 0, Math.PI * 2); ctx.stroke()
        }

        // 标签
        ctx.textAlign = 'center'
        if (!compact) {
          ctx.font = `600 ${Math.max(10, s * 0.78)}px "PingFang SC","Microsoft YaHei",sans-serif`
          ctx.fillStyle = 'rgba(226,240,255,0.92)'
          ctx.fillText(z.name, X(z.x), Y(z.y) - R - s * 1.0)
          ctx.font = `${Math.max(9, s * 0.66)}px "SF Mono",Consolas,monospace`
          ctx.fillStyle = rc
          ctx.fillText(`${Math.round(l.ratio * 100)}% · ${(l.people / 1000).toFixed(1)}k`, X(z.x), Y(z.y) + R + s * 1.15)
        } else {
          ctx.font = `600 ${Math.max(9, s * 0.7)}px "PingFang SC","Microsoft YaHei",sans-serif`
          ctx.fillStyle = 'rgba(226,240,255,0.85)'
          ctx.fillText(z.name, X(z.x), Y(z.y) - R - s * 0.8)
          ctx.font = `${Math.max(8, s * 0.6)}px "SF Mono",Consolas,monospace`
          ctx.fillStyle = rc
          ctx.fillText(`${Math.round(l.ratio * 100)}%`, X(z.x), Y(z.y) + R + s * 1.0)
        }
      }

      // ---- 游客 Agent ----
      const agents = agentsRef.current
      const density = Math.min(1, p.tourists / 50000)
      const visible = Math.floor(agents.length * (0.25 + 0.75 * density))
      for (let i = 0; i < visible; i++) {
        const a = agents[i]
        const c = AGENT_TYPE_COLORS[a.typeIdx]
        ctx.fillStyle = c
        ctx.globalAlpha = a.progress < 1 ? 0.95 : 0.72
        ctx.beginPath()
        ctx.arc(X(a.x + a.jitterX), Y(a.y + a.jitterY), Math.max(1, a.size * s * 0.16), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // ---- 雨 ----
      if (p.weather === 'rain') {
        ctx.strokeStyle = 'rgba(147,197,253,0.28)'
        ctx.lineWidth = 1
        for (const d of rainRef.current) {
          d.y += d.spd * dtReal * 0.06
          if (d.y > LH + 2) { d.y = -2; d.x = Math.random() * LW }
          ctx.beginPath()
          ctx.moveTo(X(d.x), Y(d.y))
          ctx.lineTo(X(d.x - 0.4), Y(d.y + d.len))
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(59,130,246,0.05)'
        ctx.fillRect(0, 0, W, H)
      }

      // ---- 世界标签（右上角，避开左侧快捷按钮） ----
      if (label) {
        ctx.textAlign = 'right'
        ctx.font = `600 ${Math.max(11, s * 0.8)}px "PingFang SC","Microsoft YaHei",sans-serif`
        ctx.fillStyle = labelColor
        ctx.fillText(`● ${label}`, X(98), Y(4))
        ctx.font = `${Math.max(9, s * 0.62)}px "SF Mono",Consolas,monospace`
        ctx.fillStyle = 'rgba(148,163,184,0.8)'
        ctx.fillText(`AGENTS ${(p.tourists + (p.event !== 'none' ? 18000 : 0)).toLocaleString()}`, X(98), Y(6.4))
      }
    }

    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [clockRef, compact, update, agentsRef, label, labelColor])

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}
