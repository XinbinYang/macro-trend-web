"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, RefreshCw } from "lucide-react";

interface HistoricalPoint {
  date: string;
  price: number;
}

interface AssetData {
  symbol: string;
  label: string;
  color: string;
  data: HistoricalPoint[];
}

const assetOptions = [
  { value: "SPY", label: "标普500 ETF", color: "#3b82f6" },
  { value: "QQQ", label: "纳斯达克100 ETF", color: "#8b5cf6" },
  { value: "ASHR", label: "沪深300 ETF", color: "#ef4444" },
  { value: "TLT", label: "美国长期国债", color: "#10b981" },
  { value: "GLD", label: "黄金", color: "#f59e0b" },
  { value: "CL=F", label: "WTI原油", color: "#6b7280" },
];

// 获取历史数据
async function fetchHistoricalData(symbol: string, days: number): Promise<HistoricalPoint[]> {
  try {
    const res = await fetch(`/api/historical-data?symbol=${symbol}&days=${days}`);
    const data = await res.json();
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
  }
  return [];
}

interface ChartRow {
  date: string;
  [key: string]: string | number;
}

// 计算归一化数据
function normalizeData(assetsData: AssetData[]): ChartRow[] {
  const result: ChartRow[] = [];
  
  // 找到所有资产的共同日期范围
  const allDates = new Set<string>();
  assetsData.forEach(asset => {
    asset.data.forEach(point => allDates.add(point.date));
  });
  const sortedDates = Array.from(allDates).sort();
  
  // 对每个日期计算归一化值
  sortedDates.forEach(date => {
    const row: ChartRow = { date };
    
    assetsData.forEach(asset => {
      const point = asset.data.find(p => p.date === date);
      if (point && asset.data.length > 0) {
        const basePrice = asset.data[0].price;
        const normalizedValue = ((point.price - basePrice) / basePrice) * 100;
        row[asset.symbol] = Number(normalizedValue.toFixed(2));
      }
    });
    
    result.push(row);
  });
  
  return result;
}

// 计算相关系数
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// 计算波动率
function calculateVolatility(data: HistoricalPoint[]): number {
  if (data.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].price - data[i-1].price) / data[i-1].price);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((total, r) => total + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  
  // 年化波动率
  return Number((dailyVol * Math.sqrt(252) * 100).toFixed(1));
}

// 计算最大回撤
function calculateMaxDrawdown(data: HistoricalPoint[]): number {
  if (data.length === 0) return 0;
  
  let maxPrice = data[0].price;
  let maxDrawdown = 0;
  
  for (const point of data) {
    if (point.price > maxPrice) {
      maxPrice = point.price;
    }
    const drawdown = (point.price - maxPrice) / maxPrice;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return Number((maxDrawdown * 100).toFixed(1));
}

// 计算夏普比率（简化版，假设无风险利率2%）
function calculateSharpe(data: HistoricalPoint[]): number {
  if (data.length < 2) return 0;
  
  const totalReturn = (data[data.length - 1].price - data[0].price) / data[0].price;
  const annualizedReturn = totalReturn * (252 / data.length);
  const volatility = calculateVolatility(data) / 100;
  
  if (volatility === 0) return 0;
  const sharpe = (annualizedReturn - 0.02) / volatility;
  return Number(sharpe.toFixed(2));
}

export default function ComparePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState(["SPY", "QQQ", "ASHR", "GLD"]);
  const [timeRange, setTimeRange] = useState("90");
  const [assetsData, setAssetsData] = useState<AssetData[]>([]);
  const [chartData, setChartData] = useState<ChartRow[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    
    const days = parseInt(timeRange);
    const loadedAssets: AssetData[] = [];
    
    for (const symbol of selectedAssets) {
      const option = assetOptions.find(a => a.value === symbol);
      if (option) {
        const data = await fetchHistoricalData(symbol, days);
        loadedAssets.push({
          symbol,
          label: option.label,
          color: option.color,
          data,
        });
      }
    }
    
    setAssetsData(loadedAssets);
    setChartData(normalizeData(loadedAssets));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // 当选择资产变化时重新加载
  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets]);

  const toggleAsset = (asset: string) => {
    if (selectedAssets.includes(asset)) {
      setSelectedAssets(selectedAssets.filter(a => a !== asset));
    } else if (selectedAssets.length < 4) {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  // 计算相关性矩阵
  const correlationMatrix: Record<string, Record<string, number>> = {};
  selectedAssets.forEach(rowAsset => {
    correlationMatrix[rowAsset] = {};
    selectedAssets.forEach(colAsset => {
      if (rowAsset === colAsset) {
        correlationMatrix[rowAsset][colAsset] = 1;
      } else {
        const rowData = assetsData.find(a => a.symbol === rowAsset)?.data.map(d => d.price) || [];
        const colData = assetsData.find(a => a.symbol === colAsset)?.data.map(d => d.price) || [];
        // 使用收益率计算相关性
        const rowReturns: number[] = [];
        const colReturns: number[] = [];
        const minLen = Math.min(rowData.length, colData.length);
        for (let i = 1; i < minLen; i++) {
          rowReturns.push((rowData[i] - rowData[i-1]) / rowData[i-1]);
          colReturns.push((colData[i] - colData[i-1]) / colData[i-1]);
        }
        correlationMatrix[rowAsset][colAsset] = calculateCorrelation(rowReturns, colReturns);
      }
    });
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">对比分析</h1>
          <p className="text-sm md:text-base text-muted-foreground">多资产走势对比与相关性分析</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadData} 
          disabled={isLoading}
          className="gap-1 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">刷新数据</span>
        </Button>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            选择对比标的
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            最多选择4个资产进行对比（已选择 {selectedAssets.length}/4）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
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
                className="text-xs md:text-sm h-7 md:h-8"
              >
                {asset.label}
              </Button>
            ))}
          </div>
          
          <div className="mt-3 md:mt-4">
            <label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">时间范围</label>
            <Select value={timeRange} onValueChange={(value) => value && setTimeRange(value)}>
              <SelectTrigger className="w-[140px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">近30天</SelectItem>
                <SelectItem value="90">近90天</SelectItem>
                <SelectItem value="180">近180天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 走势图 */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">归一化走势对比</CardTitle>
          <CardDescription className="text-xs md:text-sm">以起始日为基准的涨跌幅对比（%）</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] md:h-[400px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[250px] md:h-[400px] flex items-center justify-center text-muted-foreground w-full min-h-[300px]">
              暂无数据
            </div>
          ) : (
            <div className="h-[250px] md:h-[400px] w-full min-h-[300px]">
              <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%" minHeight={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value.slice(5)}
                    interval="preserveStartEnd"
                    className="text-[10px] md:text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value}%`}
                    domain={['auto', 'auto']}
                    className="text-[10px] md:text-xs"
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '涨跌幅']}
                    labelFormatter={(label) => label}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Legend className="text-xs" />
                  {selectedAssets.map(symbol => {
                    const asset = assetOptions.find(a => a.value === symbol);
                    return asset ? (
                      <Line 
                        key={symbol}
                        type="monotone" 
                        dataKey={symbol} 
                        stroke={asset.color} 
                        strokeWidth={2}
                        dot={false}
                        name={asset.label}
                      />
                    ) : null;
                  })}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 相关性矩阵 */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">相关性矩阵</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {timeRange}天滚动相关系数（-1到1，1表示完全正相关）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] md:h-[300px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 md:p-2"></th>
                    {selectedAssets.map(asset => (
                      <th key={asset} className="text-center p-1.5 md:p-2 font-medium">
                        {assetOptions.find(a => a.value === asset)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedAssets.map((rowAsset) => (
                    <tr key={rowAsset}>
                      <td className="p-1.5 md:p-2 font-medium">
                        {assetOptions.find(a => a.value === rowAsset)?.label}
                      </td>
                      {selectedAssets.map((colAsset) => {
                        const correlation = correlationMatrix[rowAsset]?.[colAsset] || 0;
                        const bgColor = correlation > 0 
                          ? `rgba(34, 197, 94, ${Math.min(correlation * 0.4, 0.5)})`
                          : `rgba(239, 68, 68, ${Math.min(Math.abs(correlation) * 0.4, 0.5)})`;
                        
                        return (
                          <td 
                            key={colAsset} 
                            className="text-center p-1.5 md:p-2 font-mono"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-sm md:text-base">年化波动率</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 md:h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                {assetsData.map(asset => (
                  <div key={asset.symbol} className="flex justify-between items-center text-xs md:text-sm">
                    <span className="truncate mr-2">{asset.label}</span>
                    <span className="font-mono font-medium">{calculateVolatility(asset.data)}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-sm md:text-base">夏普比率</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 md:h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                {assetsData.map(asset => {
                  const sharpe = calculateSharpe(asset.data);
                  return (
                    <div key={asset.symbol} className="flex justify-between items-center text-xs md:text-sm">
                      <span className="truncate mr-2">{asset.label}</span>
                      <span className={`font-mono font-medium ${sharpe > 1 ? 'text-green-600' : sharpe < 0 ? 'text-red-600' : ''}`}>
                        {sharpe.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-sm md:text-base">最大回撤</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 md:h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                {assetsData.map(asset => {
                  const drawdown = calculateMaxDrawdown(asset.data);
                  return (
                    <div key={asset.symbol} className="flex justify-between items-center text-xs md:text-sm">
                      <span className="truncate mr-2">{asset.label}</span>
                      <span className="font-mono font-medium text-red-600">{drawdown}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
