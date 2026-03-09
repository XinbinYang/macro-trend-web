"use client";

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  title: string;
  unit?: string;
  zones?: {
    label: string;
    color: string;
    range: [number, number];
  }[];
}

export function MacroGauge({ value, min, max, title, unit = "", zones }: GaugeProps) {
  // 计算角度 (0-180度)
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 180 - 90;

  // 默认分区
  const defaultZones = [
    { label: "低", color: "#22c55e", range: [0, 0.33] as [number, number] },
    { label: "中", color: "#f59e0b", range: [0.33, 0.66] as [number, number] },
    { label: "高", color: "#ef4444", range: [0.66, 1] as [number, number] },
  ];

  const activeZones = zones || defaultZones;

  // 确定当前值所在区域
  const currentZone = activeZones.find(
    (z) => percentage >= z.range[0] && percentage <= z.range[1]
  ) || activeZones[1];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-20">
        {/* SVG 仪表盘 */}
        <svg viewBox="0 0 100 60" className="w-full h-full">
          {/* 背景弧 */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* 彩色分区 */}
          {activeZones.map((zone, index) => {
            const startAngle = 180 - zone.range[1] * 180;
            const endAngle = 180 - zone.range[0] * 180;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 - 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 - 40 * Math.sin(endRad);
            
            const largeArc = zone.range[1] - zone.range[0] > 0.5 ? 1 : 0;
            
            return (
              <path
                key={index}
                d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={zone.color}
                strokeWidth="6"
                strokeLinecap="round"
                opacity={currentZone === zone ? 1 : 0.3}
              />
            );
          })}
          
          {/* 指针 */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((angle * Math.PI) / 180)}
            y2={50 - 35 * Math.sin((angle * Math.PI) / 180)}
            stroke="#f8fafc"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* 中心点 */}
          <circle cx="50" cy="50" r="4" fill="#f59e0b" />
        </svg>
        
        {/* 数值显示 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className="text-lg font-bold" style={{ color: currentZone.color }}>
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500 ml-0.5">{unit}</span>
        </div>
      </div>
      
      {/* 标题 */}
      <div className="mt-2 text-center">
        <div className="text-xs text-slate-400">{title}</div>
        <div className="text-[10px] mt-0.5" style={{ color: currentZone.color }}>
          {currentZone.label}
        </div>
      </div>
    </div>
  );
}

// 宏观指标仪表盘组
export function MacroDashboard() {
  const indicators = [
    { title: "经济周期", value: 65, min: 0, max: 100, unit: "分" },
    { title: "通胀预期", value: 3.2, min: 0, max: 6, unit: "%" },
    { title: "流动性", value: 72, min: 0, max: 100, unit: "分" },
    { title: "风险偏好", value: 45, min: 0, max: 100, unit: "分" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {indicators.map((ind) => (
        <div key={ind.title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <MacroGauge {...ind} />
        </div>
      ))}
    </div>
  );
}
