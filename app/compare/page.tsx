"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Compare } from "lucide-react";

// 模拟历史数据
const generateMockData = () => {
  const data = [];
  let spyPrice = 500;
  let qqqPrice = 420;
  let ashrPrice = 25;
  let goldPrice = 2600;
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    spyPrice *= (1 + (Math.random() - 0.48) * 0.02);
    qqqPrice *= (1 + (Math.random() - 0.47) * 0.025);
    ashrPrice *= (1 + (Math.random() - 0.52) * 0.03);
    goldPrice *= (1 + (Math.random() - 0.49) * 0.015);
    
    data.push({
      date: date.toISOString().split('T')[0],
      SPY: Number((spyPrice / 500 * 100 - 100).toFixed(2)),
      QQQ: Number((qqqPrice / 420 * 100 - 100).toFixed(2)),
      ASHR: Number((ashrPrice / 25 * 100 - 100).toFixed(2)),
      Gold: Number((goldPrice / 2600 * 100 - 100).toFixed(2)),
    });
  }
  return data;
};

const mockChartData = generateMockData();

const assetOptions = [
  { value: "SPY", label: "标普500 ETF", color: "#3b82f6" },
  { value: "QQQ", label: "纳斯达克100 ETF", color: "#8b5cf6" },
  { value: "ASHR", label: "沪深300 ETF", color: "#ef4444" },
  { value: "TLT", label: "美国长期国债", color: "#10b981" },
  { value: "Gold", label: "黄金", color: "#f59e0b" },
  { value: "CL=F", label: "WTI原油", color: "#6b7280" },
];

export default function ComparePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState(["SPY", "QQQ", "ASHR", "Gold"]);
  const [timeRange, setTimeRange] = useState("90d");

  const toggleAsset = (asset: string) => {
    if (selectedAssets.includes(asset)) {
      setSelectedAssets(selectedAssets.filter(a => a !== asset));
    } else if (selectedAssets.length < 4) {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">对比分析</h1>
        <p className="text-muted-foreground">多资产走势对比与相关性分析</p>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compare className="h-5 w-5" />
            选择对比标的
          </CardTitle>
          <CardDescription>最多选择4个资产进行对比（已选择 {selectedAssets.length}/4）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {assetOptions.map((asset) => (
              <Button
                key={asset.value}
                variant={selectedAssets.includes(asset.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAsset(asset.value)}
                disabled={!selectedAssets.includes(asset.value) && selectedAssets.length >= 4}
                style={{
                  borderColor: selectedAssets.includes(asset.value) ? asset.color : undefined,
                  backgroundColor: selectedAssets.includes(asset.value) ? asset.color : undefined,
                }}
              >
                {asset.label}
              </Button>
            ))}
          </div>
          
          <div className="mt-4 flex gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">时间范围</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">近30天</SelectItem>
                  <SelectItem value="90d">近90天</SelectItem>
                  <SelectItem value="180d">近180天</SelectItem>
                  <SelectItem value="1y">近1年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 走势图 */}
      <Card>
        <CardHeader>
          <CardTitle>归一化走势对比</CardTitle>
          <CardDescription>以起始日为基准的涨跌幅对比（%）</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value}%`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, '涨跌幅']}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  {selectedAssets.includes("SPY") && (
                    <Line 
                      type="monotone" 
                      dataKey="SPY" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {selectedAssets.includes("QQQ") && (
                    <Line 
                      type="monotone" 
                      dataKey="QQQ" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {selectedAssets.includes("ASHR") && (
                    <Line 
                      type="monotone" 
                      dataKey="ASHR" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {selectedAssets.includes("TLT") && (
                    <Line 
                      type="monotone" 
                      dataKey="TLT" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {selectedAssets.includes("Gold") && (
                    <Line 
                      type="monotone" 
                      dataKey="Gold" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {selectedAssets.includes("CL=F") && (
                    <Line 
                      type="monotone" 
                      dataKey="CL=F" 
                      stroke="#6b7280" 
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 相关性矩阵 */}
      <Card>
        <CardHeader>
          <CardTitle>相关性矩阵</CardTitle>
          <CardDescription>90天滚动相关系数（-1到1，1表示完全正相关）</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2"></th>
                    {selectedAssets.map(asset => (
                      <th key={asset} className="text-center p-2 font-medium">
                        {assetOptions.find(a => a.value === asset)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedAssets.map((rowAsset, rowIndex) => (
                    <tr key={rowAsset}>
                      <td className="p-2 font-medium">
                        {assetOptions.find(a => a.value === rowAsset)?.label}
                      </td>
                      {selectedAssets.map((colAsset, colIndex) => {
                        // 模拟相关性数据
                        let correlation = 1;
                        if (rowAsset !== colAsset) {
                          const correlations: Record<string, Record<string, number>> = {
                            SPY: { QQQ: 0.92, ASHR: 0.45, TLT: -0.35, Gold: 0.12, "CL=F": 0.28 },
                            QQQ: { SPY: 0.92, ASHR: 0.48, TLT: -0.38, Gold: 0.08, "CL=F": 0.25 },
                            ASHR: { SPY: 0.45, QQQ: 0.48, TLT: -0.15, Gold: 0.18, "CL=F": 0.22 },
                            TLT: { SPY: -0.35, QQQ: -0.38, ASHR: -0.15, Gold: 0.25, "CL=F": -0.12 },
                            Gold: { SPY: 0.12, QQQ: 0.08, ASHR: 0.18, TLT: 0.25, "CL=F": 0.15 },
                            "CL=F": { SPY: 0.28, QQQ: 0.25, ASHR: 0.22, TLT: -0.12, Gold: 0.15 },
                          };
                          correlation = correlations[rowAsset]?.[colAsset] || 0;
                        }
                        
                        const bgColor = correlation > 0 
                          ? `rgba(34, 197, 94, ${correlation * 0.3})`
                          : `rgba(239, 68, 68, ${Math.abs(correlation) * 0.3})`;
                        
                        return (
                          <td 
                            key={colAsset} 
                            className="text-center p-2"
                            style={{ backgroundColor: bgColor }}
                          >
                            {correlation.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">波动率对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedAssets.map(asset => {
                const volatilities: Record<string, number> = {
                  SPY: 14.2, QQQ: 18.5, ASHR: 22.3, TLT: 12.8, Gold: 15.6, "CL=F": 28.4
                };
                return (
                  <div key={asset} className="flex justify-between items-center">
                    <span className="text-sm">{assetOptions.find(a => a.value === asset)?.label}</span>
                    <span className="font-mono">{volatilities[asset]}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">夏普比率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedAssets.map(asset => {
                const sharpes: Record<string, number> = {
                  SPY: 1.25, QQQ: 1.42, ASHR: 0.68, TLT: 0.45, Gold: 0.85, "CL=F": 0.32
                };
                return (
                  <div key={asset} className="flex justify-between items-center">
                    <span className="text-sm">{assetOptions.find(a => a.value === asset)?.label}</span>
                    <span className="font-mono">{sharpes[asset]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最大回撤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedAssets.map(asset => {
                const drawdowns: Record<string, number> = {
                  SPY: -12.5, QQQ: -15.8, ASHR: -25.2, TLT: -18.6, Gold: -8.4, "CL=F": -32.1
                };
                return (
                  <div key={asset} className="flex justify-between items-center">
                    <span className="text-sm">{assetOptions.find(a => a.value === asset)?.label}</span>
                    <span className="font-mono text-red-600">{drawdowns[asset]}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
