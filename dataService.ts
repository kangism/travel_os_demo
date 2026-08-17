
// services/dataService.ts
// 本地离线数据查询服务层

import cityGIS from '../../data/city_gis.json'
import heatmapData from '../../data/heatmap_24h7d.json'
import trafficData from '../../data/traffic_simulation.json'
import tourismData from '../../data/tourism_business.json'

export interface Zone {
  id: string
  name: string
  type: 'scenic' | 'commercial' | 'traffic' | 'hotel'
  lat: number
  lng: number
  capacity: number
  loadRate?: number
  flow?: number
}

export interface HeatmapPoint {
  zoneId: string
  zoneName: string
  day: string
  hour: number
  flow: number
  loadRate: number
  alertLevel: number
}

export interface TrafficPoint {
  roadId: string
  roadName: string
  hour: number
  vehicleFlow: number
  avgSpeed: number
  congestionIndex: number
}

class DataService {
  private zones: Zone[] = cityGIS.zones
  private heatmap: HeatmapPoint[] = heatmapData
  private traffic: TrafficPoint[] = trafficData
  private businesses = tourismData.businesses
  private monthlyAgg = tourismData.monthly_aggregate

  // 获取所有区域
  getZones(): Zone[] {
    return this.zones
  }

  // 按时段获取区域客流
  getHeatmapByTime(dayIdx: number, hour: number): HeatmapPoint[] {
    return this.heatmap.filter(
      h => h.dayIdx === dayIdx && h.hour === hour
    )
  }

  // 获取指定区域24h时序
  getZoneTimeline(zoneId: string, dayIdx: number): HeatmapPoint[] {
    return this.heatmap.filter(
      h => h.zoneId === zoneId && h.dayIdx === dayIdx
    ).sort((a, b) => a.hour - b.hour)
  }

  // 按时段获取交通数据
  getTrafficByTime(dayIdx: number, hour: number): TrafficPoint[] {
    return this.traffic.filter(
      t => this.dayToIdx(t.day) === dayIdx && t.hour === hour
    )
  }

  // 获取区域业态点位
  getBusinessesByZone(zoneId: string) {
    return this.businesses.filter(b => b.zone_id === zoneId)
  }

  // 获取区域月度聚合
  getMonthlyByZone(zoneId: string) {
    return this.monthlyAgg.filter(m => m.zone_id === zoneId)
  }

  // 获取预警区域 (loadRate > 0.8)
  getAlertZones(dayIdx: number, hour: number): HeatmapPoint[] {
    return this.getHeatmapByTime(dayIdx, hour).filter(h => h.alertLevel >= 2)
  }

  private dayToIdx(day: string): number {
    const map: Record<string, number> = {
      '周一': 0, '周二': 1, '周三': 2, '周四': 3,
      '周五': 4, '周六': 5, '周日': 6
    }
    return map[day] ?? 0
  }
}

export const dataService = new DataService()
