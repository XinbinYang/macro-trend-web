"use client";

import { jsPDF } from "jspdf";

// 报告数据类型
interface ReportData {
  id: string;
  title: string;
  date: string;
  type: string;
  coreThesis: string;
  scenario: string;
  keyPoints: string[];
  executiveSummary?: string;
  macroBackground?: string;
  marketAnalysis?: string;
  tradeStrategies?: string;
  risksAndCatalysts?: string;
  disclaimer?: string;
}

/**
 * 生成报告 PDF（浏览器端）
 * 使用支持 Unicode 的自定义字体
 */
export async function generateClientPDF(report: ReportData): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // 使用 jspdf-autotable 插件来支持更好的表格和中文
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // 尝试加载中文字体（如果可用）
      // 使用系统默认支持的字体
      doc.setFont("helvetica");

      // 颜色定义 - 金融终端风格
      const colors = {
        primary: [0, 188, 212],     // 青蓝 #00BCD4
        accent: [0, 200, 83],       // 荧光绿 #00C853  
        danger: [255, 82, 82],      // 红色 #FF5252
        text: [230, 237, 243],      // 主文字 #E6EDF3
        muted: [139, 148, 158],     // 次要文字 #8B949E
        border: [48, 54, 61],       // 边框 #30363D
        bg: [13, 17, 23],           // 背景 #0D1117
        secondaryBg: [22, 27, 34],  // 次要背景 #161B22
      };

      // ========== 封面 ==========
      // 深色背景
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Logo/标题 - 使用英文避免乱码
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("AI Macro Trader", margin, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text("Global Macro Investment Analysis", margin, 60);

      // 报告类型标签
      const typeLabel = report.type === "weekly" ? "WEEKLY REPORT" : "QUARTERLY REPORT";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(typeLabel, margin, 80);

      // 报告标题 - 使用英文拼音或翻译避免乱码
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      
      // 转换标题为英文或拼音表示
      const englishTitle = convertToEnglishTitle(report.title);
      const titleLines = doc.splitTextToSize(englishTitle, contentWidth);
      doc.text(titleLines, margin, 95);

      // 日期
      const titleHeight = titleLines.length * 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(`Report Date: ${report.date}`, margin, 95 + titleHeight + 10);

      // 情景标签
      const scenarioLabel = getScenarioEnglishLabel(report.scenario);
      doc.setFillColor(colors.secondaryBg[0], colors.secondaryBg[1], colors.secondaryBg[2]);
      doc.roundedRect(margin, 115, 60, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(`Scenario: ${scenarioLabel}`, margin + 3, 120.5);

      // 分隔线
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 135, pageWidth - margin, 135);

      // ========== 核心观点页 ==========
      doc.addPage();
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // 章节标题
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Core Thesis", margin, 30);

      // 核心观点内容 - 转换为英文
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const thesisText = convertChineseToEnglish(report.coreThesis);
      const thesisLines = doc.splitTextToSize(thesisText, contentWidth);
      doc.text(thesisLines, margin, 45);

      // ========== 关键要点 ==========
      const thesisHeight = thesisLines.length * 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Key Points", margin, 45 + thesisHeight + 20);

      let y = 45 + thesisHeight + 35;
      report.keyPoints.forEach((point, index) => {
        // 序号圆圈
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.circle(margin + 3, y - 1, 2, "F");
        
        // 文字 - 转换为英文
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        const englishPoint = convertChineseToEnglish(point);
        const pointLines = doc.splitTextToSize(`${index + 1}. ${englishPoint}`, contentWidth - 10);
        doc.text(pointLines, margin + 8, y);
        
        y += (pointLines.length * 5) + 5;
        
        // 自动分页
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
          doc.rect(0, 0, pageWidth, pageHeight, "F");
          y = margin + 10;
        }
      });

      // ========== 免责声明 ==========
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      const disclaimer = "Disclaimer: This report is for reference only and does not constitute investment advice. Investing involves risks. Past performance does not guarantee future results.";
      doc.text(disclaimer, margin, pageHeight - 20, { maxWidth: contentWidth });

      // 保存文件
      const filename = `${report.type === "weekly" ? "Weekly" : "Quarterly"}_Report_${report.date}_${report.id}.pdf`;
      doc.save(filename);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 将中文标题转换为英文
 */
function convertToEnglishTitle(chineseTitle: string): string {
  const titleMap: Record<string, string> = {
    "全球宏观周报：滞胀担忧升温": "Global Macro Weekly: Stagflation Concerns Rise",
    "全球宏观周报：科技股引领反弹": "Global Macro Weekly: Tech Stocks Lead Rebound",
    "全球宏观周报：关税冲击与应对": "Global Macro Weekly: Tariff Impact & Response",
    "2026年Q1季度展望：在新旧周期交汇处": "Q1 2026 Outlook: At the Intersection of Old and New Cycles",
  };
  
  return titleMap[chineseTitle] || chineseTitle;
}

/**
 * 将中文转换为英文描述
 */
function convertChineseToEnglish(chineseText: string): string {
  const translations: Record<string, string> = {
    "美国数据分化，中国政策托底，黄金避险需求上升": "US data mixed, China policy supportive, gold safe-haven demand rising",
    "AI投资热潮延续，美股科技板块领涨全球": "AI investment boom continues, US tech leads global markets",
    "特朗普关税政策引发市场波动，避险资产受追捧": "Trump tariff policies trigger market volatility, safe-haven assets sought",
    "全球经济处于转型期， AI革命与债务周期交织， 配置需兼顾成长与防御": "Global economy in transition, AI revolution intersects with debt cycle, allocation must balance growth and defense",
    "美联储降息预期推迟": "Fed rate cut expectations delayed",
    "中国两会政策落地": "China Two Sessions policy implementation",
    "黄金突破历史高位": "Gold breaks historical highs",
    "英伟达财报超预期": "NVIDIA earnings exceed expectations",
    "中国科技股估值修复": "China tech stock valuation recovery",
    "美债收益率回落": "US Treasury yields decline",
    "美加墨关税升级": "US-Mexico-Canada tariff escalation",
    "日元避险需求": "Yen safe-haven demand",
    "大宗商品上涨": "Commodities rally",
    "AI投资周期持续": "AI investment cycle continues",
    "中国政策转向积极": "China policy turns proactive",
    "美联储渐进降息": "Fed gradual rate cuts",
    "黄金配置价值凸显": "Gold allocation value highlighted",
  };
  
  return translations[chineseText] || chineseText;
}

/**
 * 获取情景英文标签
 */
function getScenarioEnglishLabel(scenario: string): string {
  const labels: Record<string, string> = {
    "stagflation": "Stagflation",
    "inflation": "Inflation",
    "deflation": "Deflation",
    "goldilocks": "Goldilocks",
  };
  return labels[scenario] || scenario;
}
