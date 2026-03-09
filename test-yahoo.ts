// 测试 Yahoo Finance API
// 运行: npx ts-node test-yahoo.ts

import { getMultipleYahooQuotes, testYahooConnection } from "./lib/api/yahoo-api";

async function test() {
  console.log("Testing Yahoo Finance API...\n");
  
  // 测试连接
  const connected = await testYahooConnection();
  console.log(`Connection test: ${connected ? "✅ OK" : "❌ Failed"}\n`);
  
  if (!connected) {
    console.error("Failed to connect to Yahoo Finance");
    return;
  }
  
  // 测试获取多个报价
  const symbols = ["SPY", "QQQ", "GLD", "GC=F", "ASHR"];
  console.log(`Fetching quotes for: ${symbols.join(", ")}\n`);
  
  const quotes = await getMultipleYahooQuotes(symbols);
  
  console.log(`\nReceived ${quotes.length} quotes:\n`);
  quotes.forEach(q => {
    console.log(`${q.symbol}: ${q.name}`);
    console.log(`  Price: $${q.price.toFixed(2)}`);
    console.log(`  Change: ${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)} (${q.changePercent.toFixed(2)}%)`);
    console.log(`  Volume: ${q.volume.toLocaleString()}`);
    console.log();
  });
}

test().catch(console.error);
