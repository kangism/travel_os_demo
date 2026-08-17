// 可视化游客 Agent：把 5 万名游客抽象为数百个有类型、有行程的发光个体
import { useRef, useCallback } from 'react'
import {
  ZONES, ZONE_MAP, TOURIST_TYPES, computeZoneLoads,
  type WorldParams,
} from '../sim/engine'

export interface Agent {
  typeIdx: number
  x: number
  y: number
  zoneId: string
  targetId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number   // 0-1
  walkHours: number  // 走完这段路需要的模拟小时
  dwellUntil: number // 停留到何时（模拟小时）
  jitterX: number
  jitterY: number
  size: number
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function pickType(): number {
  let r = Math.random()
  for (let i = 0; i < TOURIST_TYPES.length; i++) {
    r -= TOURIST_TYPES[i].share
    if (r <= 0) return i
  }
  return 0
}

function jitter(zoneId: string) {
  const z = ZONE_MAP[zoneId]
  const ang = Math.random() * Math.PI * 2
  const rr = Math.sqrt(Math.random()) * z.r * 0.72
  return { x: z.x + Math.cos(ang) * rr, y: z.y + Math.sin(ang) * rr * 0.7 }
}

export function createAgents(count: number): Agent[] {
  const agents: Agent[] = []
  for (let i = 0; i < count; i++) {
    const zone = ZONES[Math.floor(Math.random() * 7)] // 不含活动场地
    const p = jitter(zone.id)
    agents.push({
      typeIdx: pickType(),
      x: p.x, y: p.y,
      zoneId: zone.id, targetId: zone.id,
      fromX: p.x, fromY: p.y, toX: p.x, toY: p.y,
      progress: 1, walkHours: 0,
      dwellUntil: rand(6, 9),
      jitterX: rand(-0.5, 0.5), jitterY: rand(-0.3, 0.3),
      size: rand(0.55, 1.15),
    })
  }
  return agents
}

export function useAgentSystem(count = 420) {
  const agentsRef = useRef<Agent[]>(createAgents(count))
  const lastTimeRef = useRef<number>(6)

  // 每帧推进 agent；simDeltaHours 为本帧经过的模拟小时
  const update = useCallback((p: WorldParams, simHour: number, dtHours: number) => {
    const agents = agentsRef.current

    // 时间被拖动（大幅跳变）→ 全体重新落位
    if (Math.abs(simHour - lastTimeRef.current) > 1.2) {
      for (const a of agents) {
        a.dwellUntil = 0
        a.progress = 1
      }
    }
    lastTimeRef.current = simHour

    const loads = computeZoneLoads(p, simHour)
    const totalPeople = loads.reduce((s, l) => s + l.people, 0) || 1

    // 目标分布（去除活动场地之外的权重时保留场地）
    const weights = loads.map(l => Math.max(0, l.people / totalPeople))

    const sampleZone = (): string => {
      let r = Math.random()
      for (let i = 0; i < loads.length; i++) {
        r -= weights[i]
        if (r <= 0) return loads[i].zone.id
      }
      return loads[0].zone.id
    }

    const speedMod = (p.weather === 'rain' ? 0.72 : 1) * (1 - 0.05 * p.shuttles * 0) // 降雨步行/车行变慢
    const congestionSlow = 1 / (1 + Math.max(0, (p.tourists - 22000) / 60000))

    for (const a of agents) {
      if (a.progress < 1) {
        a.progress = Math.min(1, a.progress + dtHours / Math.max(0.05, a.walkHours))
        const e = a.progress < 0.5
          ? 2 * a.progress * a.progress
          : 1 - Math.pow(-2 * a.progress + 2, 2) / 2
        a.x = a.fromX + (a.toX - a.fromX) * e
        a.y = a.fromY + (a.toY - a.fromY) * e
        if (a.progress >= 1) {
          a.zoneId = a.targetId
          a.dwellUntil = simHour + rand(0.3, 1.4)
        }
      } else if (simHour >= a.dwellUntil) {
        // 按当前世界状态选择下一站
        const target = sampleZone()
        const from = jitter(a.zoneId)
        const to = jitter(target)
        const dist = Math.hypot(to.x - from.x, to.y - from.y)
        a.fromX = from.x; a.fromY = from.y
        a.toX = to.x; a.toY = to.y
        a.targetId = target
        a.walkHours = (dist / 34) * speedMod * congestionSlow * rand(0.8, 1.3)
        a.progress = 0
        a.x = from.x; a.y = from.y
      }
    }
  }, [])

  return { agentsRef, update }
}

export const AGENT_TYPE_COLORS = TOURIST_TYPES.map(t => t.color)
