-- 策略净值表
CREATE TABLE strategy_nav (
  id SERIAL PRIMARY KEY,
  strategy_id VARCHAR(50) NOT NULL, -- 'beta-7-0', 'alpha-2-0', 'mix-55', 'mix-73'
  strategy_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  nav DECIMAL(12, 6) NOT NULL,
  daily_return DECIMAL(8, 4),
  cumulative_return DECIMAL(12, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(strategy_id, date)
);

-- 资产日线价格表
CREATE TABLE asset_prices (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  region VARCHAR(10), -- 'US', 'CN', 'HK', 'GLOBAL'
  category VARCHAR(20), -- 'stocks', 'bonds', 'commodities', 'fx'
  date DATE NOT NULL,
  open DECIMAL(12, 4),
  high DECIMAL(12, 4),
  low DECIMAL(12, 4),
  close DECIMAL(12, 4) NOT NULL,
  volume BIGINT,
  change DECIMAL(12, 4),
  change_percent DECIMAL(8, 4),
  data_source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- 用户投资组合表
CREATE TABLE user_portfolios (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  portfolio_name VARCHAR(100) DEFAULT '默认组合',
  strategy_allocation JSONB, -- {'beta-7-0': 0.5, 'alpha-2-0': 0.5}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI解读缓存表
CREATE TABLE ai_insights (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'news', 'asset', 'strategy'
  content_id VARCHAR(100) NOT NULL,
  insight_text TEXT NOT NULL,
  impact VARCHAR(20), -- 'positive', 'negative', 'neutral'
  suggestion VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- 缓存过期时间
  UNIQUE(content_type, content_id)
);

-- 创建索引优化查询
CREATE INDEX idx_strategy_nav_strategy_date ON strategy_nav(strategy_id, date);
CREATE INDEX idx_asset_prices_symbol_date ON asset_prices(symbol, date);
CREATE INDEX idx_asset_prices_category ON asset_prices(category);
CREATE INDEX idx_ai_insights_type_id ON ai_insights(content_type, content_id);

-- 插入示例数据：策略净值
INSERT INTO strategy_nav (strategy_id, strategy_name, date, nav, daily_return, cumulative_return) VALUES
('beta-7-0', 'Beta 7.0', '2024-01-02', 1.000000, 0.0000, 0.0000),
('alpha-2-0', 'Alpha 2.0', '2024-01-02', 1.000000, 0.0000, 0.0000),
('mix-55', '5:5 Mix', '2024-01-02', 1.000000, 0.0000, 0.0000),
('mix-73', '7:3 Mix', '2024-01-02', 1.000000, 0.0000, 0.0000);

-- 插入示例数据：资产价格
INSERT INTO asset_prices (symbol, name, region, category, date, close, change_percent, data_source) VALUES
('SPY', '标普500', 'US', 'stocks', '2024-03-10', 520.50, 0.85, 'Yahoo'),
('QQQ', '纳斯达克100', 'US', 'stocks', '2024-03-10', 445.30, 1.20, 'Yahoo'),
('ASHR', '沪深300', 'CN', 'stocks', '2024-03-10', 28.45, 0.30, 'Yahoo'),
('GLD', '黄金ETF', 'GLOBAL', 'commodities', '2024-03-10', 185.20, -0.15, 'Yahoo');

-- 启用RLS (行级安全)
ALTER TABLE strategy_nav ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- 创建允许匿名读取的策略
CREATE POLICY "Allow anonymous read" ON strategy_nav FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON asset_prices FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON ai_insights FOR SELECT USING (true);