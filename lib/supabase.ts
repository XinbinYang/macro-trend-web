import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xmdvozykqwolmfaycgyz.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZHZvenlrcXdvbG1mYXljZ3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjM1NDYsImV4cCI6MjA4ODY5OTU0Nn0.AbEpeNn1cL_qOmKWj1Y5n4NQL7OtY4B8VJkrSzJvHWY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// 策略净值相关操作
export async function getStrategyNav(strategyId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('strategy_nav')
    .select('*')
    .eq('strategy_id', strategyId)
    .order('date', { ascending: true })
  
  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)
  
  const { data, error } = await query
  if (error) throw error
  return data
}

// 获取所有策略最新净值
export async function getLatestStrategyNav() {
  const { data, error } = await supabase
    .from('strategy_nav')
    .select('*')
    .order('date', { ascending: false })
    .limit(4)
  
  if (error) throw error
  return data
}

// 资产价格相关操作
export async function getAssetPrices(symbol: string, limit: number = 30) {
  const { data, error } = await supabase
    .from('asset_prices')
    .select('*')
    .eq('symbol', symbol)
    .order('date', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

// 获取某类别的所有资产最新价格
export async function getAssetsByCategory(category: string) {
  const { data, error } = await supabase
    .from('asset_prices')
    .select('*')
    .eq('category', category)
    .order('date', { ascending: false })
  
  if (error) throw error
  // 只返回每个symbol的最新一条
  const latestBySymbol = new Map()
  data?.forEach(item => {
    if (!latestBySymbol.has(item.symbol)) {
      latestBySymbol.set(item.symbol, item)
    }
  })
  return Array.from(latestBySymbol.values())
}

// AI解读缓存
export async function getAIInsight(contentType: string, contentId: string) {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .single()
  
  if (error) return null
  return data
}

export async function saveAIInsight(contentType: string, contentId: string, insight: string, impact?: string, suggestion?: string) {
  const { data, error } = await supabase
    .from('ai_insights')
    .upsert({
      content_type: contentType,
      content_id: contentId,
      insight_text: insight,
      impact,
      suggestion,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时过期
    })
  
  if (error) throw error
  return data
}