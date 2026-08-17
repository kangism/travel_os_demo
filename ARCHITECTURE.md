
# Travel OS Phase 1 项目架构

## 目录结构
```
travel-os-phase1/
├── data/                          # 模拟数据集 (离线)
│   ├── city_gis.json              # 城市GIS底图
│   ├── heatmap_24h7d.json         # 24h×7天客流热力
│   ├── traffic_simulation.json    # 交通仿真时序
│   ├── tourism_business.json      # 文旅业态数据
│   ├── revenue_config.json        # 营收测算基准
│   └── travel_os.db               # SQLite整合数据库
├── src/
│   ├── components/
│   │   ├── map/                   # 三维地图组件
│   │   │   ├── CityMap.vue        # 主地图容器
│   │   │   ├── ZoneMarker.vue     # 区域点位
│   │   │   ├── HeatmapLayer.vue   # 热力图层
│   │   │   └── TrafficLayer.vue   # 交通图层
│   │   ├── panels/                # 侧面板
│   │   │   ├── GovPanel.vue       # 政务模式面板
│   │   │   ├── BizPanel.vue       # 投资模式面板
│   │   │   ├── LayerControl.vue   # 图层控制
│   │   │   └── Flywheel.vue       # 数据飞轮
│   │   ├── revenue/               # 收入可视化
│   │   │   ├── RevenueCard.vue    # 收入卡片
│   │   │   ├── SliderControl.vue  # 滑块控件
│   │   │   └── ChartPanel.vue     # 图表面板
│   │   └── shared/                # 共享组件
│   │       ├── TimelineBar.vue    # 时间轴
│   │       ├── ModeSwitcher.vue   # 模式切换
│   │       └── ZoneModal.vue      # 区域弹窗
│   ├── stores/
│   │   ├── mapStore.ts            # 地图状态 (图层/点位/热力)
│   │   ├── modeStore.ts           # 模式状态 (gov/biz)
│   │   ├── timeStore.ts           # 时间轴状态
│   │   └── revenueStore.ts        # 营收测算状态
│   ├── services/
│   │   ├── dataService.ts         # 本地数据查询服务
│   │   ├── heatmapService.ts      # 热力插值计算
│   │   └── revenueService.ts      # 营收测算引擎封装
│   ├── composables/
│   │   ├── useMapRenderer.ts      # 地图渲染逻辑
│   │   ├── useHeatmapAnimation.ts # 热力动画
│   │   └── useRevenueCalc.ts      # 收入计算响应式
│   ├── types/
│   │   ├── map.types.ts
│   │   ├── data.types.ts
│   │   └── revenue.types.ts
│   ├── assets/
│   │   └── styles/
│   │       └── variables.css      # 设计令牌
│   ├── App.vue
│   └── main.ts
├── public/
│   └── data/                      # 静态数据文件
├── electron/                      # 桌面端打包
│   └── main.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈
- 框架: Vue 3 + TypeScript + Vite
- 状态: Pinia
- 三维: Three.js (轻量化) + Mapbox GL (GIS底图)
- 图表: ECharts 5
- 样式: CSS Variables + 自定义设计系统
- 桌面: Electron (PC路演端)
- 数据: SQLite (via sql.js WASM) / JSON 静态加载

## 核心状态设计

### mapStore
```typescript
interface MapState {
  activeLayers: string[];      // 当前激活图层
  selectedZone: Zone | null;   // 选中区域
  heatmapVisible: boolean;
  trafficVisible: boolean;
  businessVisible: boolean;
  cameraPosition: { x, y, z };
}
```

### modeStore
```typescript
interface ModeState {
  currentMode: 'gov' | 'biz';
  isTransitioning: boolean;
}
```

### timeStore
```typescript
interface TimeState {
  currentHour: number;         // 0-23
  currentDay: number;        // 0-6
  isPlaying: boolean;
  playSpeed: number;         // 1x/2x/4x
}
```

### revenueStore
```typescript
interface RevenueState {
  params: {
    monthlyOrders: number;
    merchantCounts: Record<string, number>;
    monthlyCalls: number;
    embodiedClients: number;
    wmClients: number;
  };
  report: RevenueReport | null;
}
```

## 数据流
```
JSON/SQLite 静态数据
    ↓
dataService (本地查询封装)
    ↓
各 Store (Pinia 响应式状态)
    ↓
Components (Vue 组件渲染)
    ↓
用户交互 → 更新 Store → 联动刷新
```

## 离线运行验证清单
- [ ] 断网环境下可正常启动
- [ ] 所有数据从本地 JSON/SQLite 加载
- [ ] 触控手势 (缩放/拖拽/点选) 响应 < 100ms
- [ ] 时间轴播放 24h 循环无卡顿 (目标 30fps+)
- [ ] 图层切换重绘 < 200ms
- [ ] 营收参数拖拽实时更新 (目标 50ms 内)
