// ============================================================
// 云上雄安 · 城市世界模型 —— 仿真引擎
// 在雄安数字孪生底座之上，让 AI 在数字世界里"先活一次"
// ============================================================

export type Weather = 'sunny' | 'rain'
export type EventSite = 'none' | 'A' | 'B'

export interface WorldParams {
  tourists: number        // 游客数量
  weather: Weather        // 天气
  event: EventSite        // 大型活动
  shuttles: number        // 新增接驳线路 0-4
  trafficControl: boolean // 交通管制
  diversion: number       // AI 引导分流强度 0-1（将景区客流导向其他区域）
}

export const REAL_PARAMS: WorldParams = {
  tourists: 18200,
  weather: 'sunny',
  event: 'none',
  shuttles: 0,
  trafficControl: false,
  diversion: 0,
}

// ---------------- 世界地理 ----------------

export interface Zone {
  id: string
  name: string
  short: string
  x: number   // 0-100
  y: number   // 0-62
  r: number   // 视觉半径
  indoor: boolean
  capacity: number
  color: string
}

export const ZONES: Zone[] = [
  { id: 'hub',    name: '雄安站·交通枢纽', short: '枢纽', x: 50, y: 55, r: 5.4, indoor: true,  capacity: 26000, color: '#7dd3fc' },
  { id: 'hotel',  name: '酒店集群',        short: '酒店', x: 14, y: 42, r: 5.0, indoor: true,  capacity: 22000, color: '#a5b4fc' },
  { id: 'park',   name: '郊野公园',        short: '公园', x: 15, y: 13, r: 4.6, indoor: false, capacity: 26000, color: '#6ee7b7' },
  { id: 'scenic', name: '白洋淀核心景区',  short: '景区', x: 47, y: 12, r: 6.2, indoor: false, capacity: 24000, color: '#34d399' },
  { id: 'museum', name: '文化场馆群',      short: '场馆', x: 78, y: 10, r: 4.6, indoor: true,  capacity: 15000, color: '#c4b5fd' },
  { id: 'dining', name: '餐饮街区',        short: '餐饮', x: 36, y: 34, r: 4.4, indoor: true,  capacity: 14000, color: '#fbbf24' },
  { id: 'mall',   name: '商业综合体',      short: '商业', x: 72, y: 33, r: 5.0, indoor: true,  capacity: 18000, color: '#f0abfc' },
  { id: 'eventA', name: '活动场地A·湖畔广场', short: '场地A', x: 63, y: 22, r: 3.6, indoor: false, capacity: 20000, color: '#fb923c' },
  { id: 'eventB', name: '活动场地B·会展中心', short: '场地B', x: 88, y: 47, r: 3.6, indoor: true,  capacity: 20000, color: '#fb923c' },
]

export const ZONE_MAP: Record<string, Zone> = Object.fromEntries(ZONES.map(z => [z.id, z]))

export interface Road { a: string; b: string }

export const ROADS: Road[] = [
  { a: 'hub', b: 'hotel' },
  { a: 'hub', b: 'dining' },
  { a: 'hub', b: 'mall' },
  { a: 'hotel', b: 'park' },
  { a: 'hotel', b: 'dining' },
  { a: 'park', b: 'scenic' },
  { a: 'scenic', b: 'museum' },
  { a: 'scenic', b: 'dining' },
  { a: 'scenic', b: 'eventA' },
  { a: 'eventA', b: 'museum' },
  { a: 'eventA', b: 'mall' },
  { a: 'dining', b: 'mall' },
  { a: 'mall', b: 'museum' },
  { a: 'mall', b: 'eventB' },
  { a: 'hub', b: 'eventB' },
]

// ---------------- 游客构成 ----------------

export interface TouristType {
  id: string
  name: string
  share: number
  color: string
  // 偏好权重：景区/公园/场馆/餐饮/商业
  pref: { scenic: number; park: number; museum: number; dining: number; mall: number }
}

export const TOURIST_TYPES: TouristType[] = [
  { id: 'family',   name: '亲子家庭', share: 0.32, color: '#38bdf8', pref: { scenic: 1.0, park: 0.9, museum: 0.7, dining: 1.0, mall: 0.6 } },
  { id: 'young',    name: '年轻游客', share: 0.27, color: '#a78bfa', pref: { scenic: 0.9, park: 0.6, museum: 0.6, dining: 1.0, mall: 1.0 } },
  { id: 'senior',   name: '银发游客', share: 0.18, color: '#fbbf24', pref: { scenic: 1.0, park: 1.0, museum: 0.8, dining: 0.7, mall: 0.3 } },
  { id: 'business', name: '商务游客', share: 0.13, color: '#f472b6', pref: { scenic: 0.4, park: 0.2, museum: 0.7, dining: 0.9, mall: 0.9 } },
  { id: 'other',    name: '其他游客', share: 0.10, color: '#94a3b8', pref: { scenic: 0.7, park: 0.7, museum: 0.6, dining: 0.8, mall: 0.7 } },
]

// ---------------- 需求曲线 ----------------

const gauss = (h: number, mu: number, sigma: number) =>
  Math.exp(-((h - mu) * (h - mu)) / (2 * sigma * sigma))

// 每个区域在时刻 h（6-24）的客流强度（相对值）
export function zoneDemand(zoneId: string, h: number): number {
  // 游客上午陆续抵达核心景区的爬坡因子
  const scenicGate = Math.min(1, Math.max(0.12, (h - 7.2) / 6.0))
  switch (zoneId) {
    case 'hotel':
      return 1.1 * gauss(h, 7.6, 1.1) + 1.9 * gauss(h, 22, 1.8) + 0.12
    case 'hub':
      return 1.2 * gauss(h, 9.4, 1.0) + 2.0 * gauss(h, 18, 1.3) + 0.15
    case 'scenic':
      return (4.0 * gauss(h, 12.9, 1.8) + 0.05) * scenicGate
    case 'park':
      return 0.9 * gauss(h, 10, 1.8) + 1.2 * gauss(h, 16, 1.6) + 0.04
    case 'museum':
      return 1.7 * gauss(h, 13.5, 3.0) * (h > 9 && h < 18 ? 1 : 0.15) + 0.03
    case 'dining':
      return 2.5 * gauss(h, 12.2, 0.9) + 2.7 * gauss(h, 18.6, 1.1) + 0.06
    case 'mall':
      return 2.2 * gauss(h, 17.5, 3.2) + 0.7 * gauss(h, 20.5, 1.4) + 0.05
    default:
      return 0
  }
}

// ---------------- 世界状态计算 ----------------

export interface ZoneLoad {
  zone: Zone
  people: number
  ratio: number   // people / capacity
}

export interface WorldMetrics {
  traffic: number      // 交通压力指数 0-100+
  parking: number      // 停车占用率 %
  dining: number       // 餐饮压力 %
  hotel: number        // 酒店入住率 %
  spending: number     // 商业消费指数（万元/小时）
  satisfaction: number // 游客满意度 %
  congestedRoads: number
}

// 天气修正
function demandModifier(zone: Zone, p: WorldParams): number {
  let m = 1
  if (p.weather === 'rain') {
    m *= zone.indoor ? 1.5 : 0.5
  }
  return m
}

// 各区域实时人数
export function computeZoneLoads(p: WorldParams, h: number): ZoneLoad[] {
  const eventZoneId = p.event === 'A' ? 'eventA' : p.event === 'B' ? 'eventB' : null
  const normalZones = ZONES.filter(z => z.id !== 'eventA' && z.id !== 'eventB')

  // 常规游客需求 → 归一化到游客总量
  const raw = new Map<string, number>()
  for (const z of normalZones) {
    let d = zoneDemand(z.id, h) * demandModifier(z, p)

    // AI 引导分流：核心景区溢出客流导向公园/场馆/商业
    if (p.diversion > 0) {
      if (z.id === 'scenic') d *= (1 - 0.30 * p.diversion)
      if (z.id === 'park') d *= (1 + 0.38 * p.diversion)
      if (z.id === 'museum') d *= (1 + 0.42 * p.diversion)
      if (z.id === 'mall') d *= (1 + 0.18 * p.diversion)
    }
    // 场地B（会展中心）毗邻商业综合体，带动晚间消费
    if (z.id === 'mall' && p.event === 'B') d *= 1.25
    raw.set(z.id, d)
  }

  const total = [...raw.values()].reduce((a, b) => a + b, 0) || 1
  const loads: ZoneLoad[] = normalZones.map(z => {
    const people = (raw.get(z.id)! / total) * p.tourists
    return { zone: z, people, ratio: people / z.capacity }
  })

  // 活动参与者：按活动日程独立聚集（约 13:00 进场，15:00 高峰，晚间演出）
  if (eventZoneId) {
    const z = ZONE_MAP[eventZoneId]
    const curve = 1.1 * gauss(h, 15, 2.6) + 0.35 * gauss(h, 19.5, 1.2)
    const rainMod = p.weather === 'rain' && !z.indoor ? 0.72 : 1
    const people = 18000 * curve * rainMod
    loads.push({ zone: z, people, ratio: people / z.capacity })
  }

  return loads
}

// 道路拥堵：与枢纽/换乘客流相关
// 出行强度曲线：早抵达峰、午间接驳、傍晚离场峰，凌晨/清晨道路安静
function travelFactor(h: number): number {
  return 0.20 +
    0.45 * gauss(h, 9.6, 1.3) +
    1.30 * gauss(h, 17.8, 1.6) +
    1.00 * gauss(h, 13.5, 1.8) +
    0.50 * gauss(h, 20, 1.5)
}

export function computeRoadCongestion(p: WorldParams, h: number): Map<string, number> {
  const loads = computeZoneLoads(p, h)
  const loadOf = (id: string) => loads.find(l => l.zone.id === id)?.people ?? 0

  // 场地A 位于景区湖畔、缺乏直达接驳；场地B 会展中心有枢纽直达
  const eventRoadMod = p.event === 'A' ? 1.14 : p.event === 'B' ? 0.88 : 1
  const speedFactor =
    (p.weather === 'rain' ? 1.3 : 1) *
    (1 - 0.055 * p.shuttles) *
    (p.trafficControl ? 0.88 : 1) *
    eventRoadMod

  const tf = travelFactor(h)
  const m = new Map<string, number>()
  for (const r of ROADS) {
    const flow = (loadOf(r.a) + loadOf(r.b)) / 2
    const base = (flow / 14000) * tf
    m.set(`${r.a}-${r.b}`, base * speedFactor)
  }
  return m
}

export function computeMetrics(p: WorldParams, h: number): WorldMetrics {
  const loads = computeZoneLoads(p, h)
  const roads = computeRoadCongestion(p, h)
  const roadVals = [...roads.values()]
  const avgRoad = roadVals.reduce((a, b) => a + b, 0) / (roadVals.length || 1)
  const congestedRoads = roadVals.filter(v => v > 1.0).length

  const loadOf = (id: string) => loads.find(l => l.zone.id === id)
  const diningRatio = (loadOf('dining')?.ratio ?? 0) * 1.35 // 餐饮瞬时承接更紧张
  const hotelRatio = Math.min(1.15, (p.tourists * 0.62) / 32000)
  // 停车：随抵达流在上午累积，傍晚离场回落
  const parkingTime = Math.min(1, Math.max(0.06, (h - 7) / 6)) * (1 - 0.4 * gauss(h, 20.5, 2.2))
  const parkingRatio = Math.min(1.3, (p.tourists * 0.34) / 16500) * parkingTime *
    (p.event === 'A' ? 1.28 : p.event === 'B' ? 1.07 : 1) * (p.weather === 'rain' ? 1.08 : 1) *
    (1 - 0.04 * p.shuttles)

  const indoor = ['mall', 'museum', 'dining']
  const indoorPeople = indoor.reduce((s, id) => s + (loadOf(id)?.people ?? 0), 0)
  const spending = indoorPeople * 0.0096 * (p.weather === 'rain' ? 1.12 : 1)

  // 满意度：拥挤惩罚 + 天气惩罚 + 接驳奖励
  const overCrowded = loads.filter(l => l.ratio > 0.9 && l.zone.id !== 'eventA' && l.zone.id !== 'eventB').length
  let sat = 92
  sat -= overCrowded * 7
  sat -= Math.max(0, avgRoad - 0.85) * 26
  sat -= Math.max(0, diningRatio - 0.95) * 18
  if (p.weather === 'rain') sat -= 5
  if (p.event === 'A') sat -= 5   // 与景区客流叠加，体验下降
  if (p.event === 'B') sat += 2   // 室内场馆 + 枢纽直达
  sat += p.shuttles * 1.6
  sat += p.diversion * 6
  sat = Math.max(58, Math.min(97, sat))

  return {
    traffic: Math.round(avgRoad * 62),
    parking: Math.round(parkingRatio * 100),
    dining: Math.round(diningRatio * 100),
    hotel: Math.round(hotelRatio * 100),
    spending: Math.round(spending),
    satisfaction: Math.round(sat),
    congestedRoads,
  }
}

// 全天峰值指标（用于方案对比）
export function computeDayPeak(p: WorldParams): WorldMetrics {
  let peak: WorldMetrics = computeMetrics(p, 10)
  for (let h = 6; h <= 23; h += 0.5) {
    const m = computeMetrics(p, h)
    peak = {
      traffic: Math.max(peak.traffic, m.traffic),
      parking: Math.max(peak.parking, m.parking),
      dining: Math.max(peak.dining, m.dining),
      hotel: Math.max(peak.hotel, m.hotel),
      spending: Math.max(peak.spending, m.spending),
      satisfaction: Math.min(peak.satisfaction, m.satisfaction),
      congestedRoads: Math.max(peak.congestedRoads, m.congestedRoads),
    }
  }
  return peak
}

// ---------------- 时间轴事件推演 ----------------

export interface TimelineEvent {
  hour: number
  text: string
  level: 'info' | 'warn' | 'danger'
}

export function deriveTimelineEvents(p: WorldParams): TimelineEvent[] {
  const events: TimelineEvent[] = []
  let scenic80 = false, scenic95 = false, park80 = false, diningBurst = false, parking95 = false
  let jamReported = false, migrateReported = false

  for (let h = 6; h <= 23.5; h += 0.25) {
    const loads = computeZoneLoads(p, h)
    const roads = computeRoadCongestion(p, h)
    const scenic = loads.find(l => l.zone.id === 'scenic')
    const park = loads.find(l => l.zone.id === 'park')
    const dining = loads.find(l => l.zone.id === 'dining')
    const jam = [...roads.values()].filter(v => v > 1).length

    if (scenic && scenic.ratio > 0.8 && !scenic80) {
      scenic80 = true
      events.push({ hour: h, text: '核心景区客流达到容量 80%', level: 'warn' })
    }
    if (scenic && scenic.ratio > 0.95 && !scenic95) {
      scenic95 = true
      events.push({ hour: h, text: '核心景区逼近容量上限 95%', level: 'danger' })
    }
    if (park && park.ratio > 0.8 && !park80) {
      park80 = true
      events.push({ hour: h, text: '郊野公园客流达到容量 80%', level: 'warn' })
    }
    if (dining && dining.ratio > 0.72 && !diningBurst && h > 10.5 && h < 14) {
      diningBurst = true
      events.push({ hour: h, text: '午餐高峰：餐饮需求暴涨', level: 'warn' })
    }
    const m = computeMetrics(p, h)
    if (m.parking > 95 && !parking95) {
      parking95 = true
      events.push({ hour: h, text: `停车场占用达到 ${m.parking}%`, level: 'danger' })
    }
    if (jam >= 2 && !jamReported) {
      jamReported = true
      events.push({ hour: h, text: `${jam} 条主要道路出现拥堵`, level: 'danger' })
    }
    if (h >= 16.4 && !migrateReported && (scenic?.ratio ?? 0) < 0.55 && scenic80) {
      migrateReported = true
      events.push({ hour: h, text: '游客开始向商业/餐饮区域迁移', level: 'info' })
    }
  }
  if (p.event !== 'none') {
    events.push({ hour: 13, text: `大型活动开场（场地${p.event}），+18,000 人`, level: 'info' })
  }
  if (p.weather === 'rain') {
    events.push({ hour: 8, text: '降雨开始：室外客流下降，室内场馆承压', level: 'warn' })
  }
  return events.sort((a, b) => a.hour - b.hour)
}

// ---------------- AI 建议生成 ----------------

export interface Suggestion {
  text: string
  effect: string
}

export function generateSuggestions(p: WorldParams): Suggestion[] {
  const peak = computeDayPeak(p)
  const out: Suggestion[] = []

  const scenicPeak = Math.max(...Array.from({ length: 36 }, (_, i) =>
    computeZoneLoads(p, 6 + i * 0.5).find(l => l.zone.id === 'scenic')?.ratio ?? 0))

  if (scenicPeak > 0.8) {
    out.push({ text: '将部分游客引导至郊野公园与文化场馆', effect: `景区峰值 -${Math.round(scenicPeak * 30)}%` })
  }
  if (peak.traffic > 45) {
    out.push({ text: '增加 2 条雄安站—景区接驳线路', effect: `交通压力 -${Math.min(14, 5 + p.shuttles * 2)}%` })
  }
  if (scenicPeak > 0.9) {
    out.push({ text: '调整核心景区分时预约配额（上午+15%）', effect: '错峰削峰 · 满意度 +6%' })
  }
  if (peak.dining > 80) {
    out.push({ text: '将部分演艺活动提前至上午，平抑午餐峰值', effect: '餐饮峰值 -12%' })
  }
  if (peak.spending > 0) {
    out.push({ text: '推荐商业综合体承接晚间消费外溢', effect: '夜间消费 +9%' })
  }
  if (p.event === 'A') {
    out.push({ text: '活动场地A临近景区，建议评估迁移至场地B', effect: '预计 3 个区域拥堵' })
  }
  if (p.weather === 'rain') {
    out.push({ text: '启动雨天预案：开放场馆夜场、加密室内接驳', effect: '满意度 +5%' })
  }
  if (out.length < 5) {
    out.push({ text: '当前方案整体承载均衡，保持动态监测', effect: '风险可控' })
  }
  return out.slice(0, 5)
}

// ---------------- 工具 ----------------

export function fmtHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function fmtNum(n: number): string {
  return n.toLocaleString('zh-CN')
}
