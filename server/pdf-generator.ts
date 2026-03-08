import PDFDocument from "pdfkit";
import type { ReportDetail } from "../shared/macro-types";
import { SCENARIO_CONFIG, type MacroScenario } from "../shared/macro-types";

const FONT_REGULAR = "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf";
const FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf";

// Colors
const C = {
  primary: "#0D47A1",
  accent: "#1565C0",
  text: "#1A1A1A",
  muted: "#64748B",
  border: "#D1D5DB",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

interface PDFOptions {
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
}

/**
 * Generate a complete PDF buffer for an asset analysis.
 */
export async function generateAssetPDF(
  asset: {
    symbol: string;
    name: string;
    assetClass: string;
    price: number;
    change: number;
    changePercent: number;
    direction: string;
    ma200: number;
    priceVsMa200: number;
    keySupport: string;
    keyResistance: string;
    pivotalPoints: string[];
    macroDrivers: string[];
    crossAssetCorrelations: Array<{ asset: string; correlation: string; observation: string }>;
    tradeStrategy: {
      direction: string;
      entryRange: string;
      initialPosition: string;
      pyramidCondition: string;
      stopLoss: string;
      target: string;
      riskRewardRatio: string;
      timeFrame: string;
    };
    dimensionViews: Array<{ dimension: string; dimensionName: string; perspective: string; keyInsight: string }>;
  },
  opts?: PDFOptions
): Promise<Buffer> {
  const margin = opts?.margin ?? 50;
  const pageWidth = opts?.pageWidth ?? 595.28;
  const pageHeight = opts?.pageHeight ?? 841.89;
  const contentWidth = pageWidth - margin * 2;
  const today = new Date().toISOString().split("T")[0];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        info: {
          Title: `${asset.name} (${asset.symbol}) - 资产深度分析`,
          Author: "AI宏观作手 Macro Trader",
          Subject: "资产深度分析报告",
          Creator: "AI宏观作手",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Regular", FONT_REGULAR);
      doc.registerFont("Bold", FONT_BOLD);

      // ========== COVER PAGE ==========
      doc.rect(0, 0, pageWidth, 8).fill(C.primary);

      // Brand
      doc.font("Bold").fontSize(14).fillColor(C.primary).text("AI宏观作手", margin, 60, { width: contentWidth });
      doc.font("Regular").fontSize(10).fillColor(C.muted).text("MACRO TRADER", margin, doc.y + 2, { width: contentWidth });

      doc.moveTo(margin, 110).lineTo(margin + contentWidth, 110).strokeColor(C.border).lineWidth(0.5).stroke();

      // Asset type badge
      const classLabels: Record<string, string> = { stocks: "股票", bonds: "债券", commodities: "商品", forex: "外汇" };
      doc.font("Regular").fontSize(12).fillColor(C.accent).text(`${classLabels[asset.assetClass] || asset.assetClass} · 资产深度分析`, margin, 130, { width: contentWidth });

      // Title
      doc.font("Bold").fontSize(26).fillColor(C.text).text(`${asset.name}`, margin, 160, { width: contentWidth, lineGap: 6 });
      doc.font("Regular").fontSize(14).fillColor(C.muted).text(asset.symbol, margin, doc.y + 4, { width: contentWidth });

      // Price overview box
      const priceBoxY = doc.y + 24;
      const isUp = asset.changePercent > 0;
      const priceColor = isUp ? "#00C853" : "#FF1744";
      const dirLabels: Record<string, string> = { bullish: "看涨", bearish: "看跌", neutral: "中性" };

      doc.font("Bold").fontSize(36).fillColor(C.text).text(`$${asset.price.toFixed(2)}`, margin + 16, priceBoxY + 12);
      doc.font("Bold").fontSize(14).fillColor(priceColor).text(
        `${isUp ? "+" : ""}${asset.change?.toFixed(2)} (${Math.abs(asset.changePercent)?.toFixed(2)}%)  ${dirLabels[asset.direction] || "中性"}`,
        margin + 16, doc.y + 4
      );

      if (asset.ma200 > 0) {
        doc.font("Regular").fontSize(11).fillColor(C.muted).text(
          `200日均线: $${asset.ma200.toFixed(2)}  |  偏离度: ${asset.priceVsMa200 > 0 ? "+" : ""}${asset.priceVsMa200?.toFixed(2)}%`,
          margin + 16, doc.y + 8
        );
      }

      const priceBoxEnd = doc.y + 16;
      doc.roundedRect(margin, priceBoxY, contentWidth, priceBoxEnd - priceBoxY, 6).strokeColor(C.primary).lineWidth(1).stroke();

      // Date
      doc.font("Regular").fontSize(10).fillColor(C.muted)
        .text(`分析日期：${today}`, margin, pageHeight - 100, { width: contentWidth })
        .text("由 AI宏观作手 分析引擎生成", margin, doc.y + 4, { width: contentWidth });

      doc.rect(0, pageHeight - 8, pageWidth, 8).fill(C.primary);

      // ========== CONTENT PAGES ==========
      doc.addPage();

      // Section 1: Technical Analysis
      doc.font("Bold").fontSize(16).fillColor(C.primary).text("一、技术面分析", margin, margin);
      doc.moveDown(0.3);
      doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
      doc.moveDown(0.5);

      // Support / Resistance table
      const techRows = [
        ["关键支撑", asset.keySupport || "--"],
        ["关键阻力", asset.keyResistance || "--"],
        ["200日均线", asset.ma200 > 0 ? `$${asset.ma200.toFixed(2)}` : "--"],
        ["均线偏离度", asset.priceVsMa200 ? `${asset.priceVsMa200 > 0 ? "+" : ""}${asset.priceVsMa200.toFixed(2)}%` : "--"],
      ];
      for (const [label, value] of techRows) {
        const rowY = doc.y;
        doc.save().rect(margin, rowY - 2, contentWidth, 22).fillOpacity(0.03).fill(C.text).restore();
        doc.font("Bold").fontSize(10.5).fillColor(C.text).text(label, margin + 8, rowY + 2, { width: contentWidth / 2 });
        doc.font("Regular").fontSize(10.5).fillColor(C.text).text(value, margin + contentWidth / 2, rowY + 2, { width: contentWidth / 2 - 8, align: "right" });
        doc.y = rowY + 22;
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.3).stroke();
      }

      // Pivotal Points
      if (asset.pivotalPoints && asset.pivotalPoints.length > 0) {
        doc.moveDown(0.5);
        doc.font("Bold").fontSize(11).fillColor(C.accent).text("关键点位 (Pivotal Points)", margin, doc.y);
        doc.moveDown(0.3);
        for (const p of asset.pivotalPoints) {
          if (doc.y > pageHeight - 80) doc.addPage();
          doc.font("Regular").fontSize(10.5).fillColor(C.text).text(`•  ${p}`, margin + 10, doc.y, { width: contentWidth - 20, lineGap: 3 });
          doc.moveDown(0.1);
        }
      }

      // Section 2: Macro Drivers
      if (asset.macroDrivers && asset.macroDrivers.length > 0) {
        if (doc.y > pageHeight - 120) doc.addPage();
        doc.moveDown(1);
        doc.font("Bold").fontSize(16).fillColor(C.primary).text("二、宏观驱动因素", margin, doc.y);
        doc.moveDown(0.3);
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
        doc.moveDown(0.5);
        for (const d of asset.macroDrivers) {
          if (doc.y > pageHeight - 80) doc.addPage();
          doc.font("Regular").fontSize(10.5).fillColor(C.text).text(`•  ${d}`, margin + 10, doc.y, { width: contentWidth - 20, lineGap: 3 });
          doc.moveDown(0.2);
        }
      }

      // Section 3: Cross Asset Correlations
      if (asset.crossAssetCorrelations && asset.crossAssetCorrelations.length > 0) {
        if (doc.y > pageHeight - 120) doc.addPage();
        doc.moveDown(1);
        doc.font("Bold").fontSize(16).fillColor(C.primary).text("三、跨资产相关性", margin, doc.y);
        doc.moveDown(0.3);
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
        doc.moveDown(0.5);
        for (const c of asset.crossAssetCorrelations) {
          if (doc.y > pageHeight - 80) doc.addPage();
          const rowY = doc.y;
          doc.save().rect(margin, rowY - 2, contentWidth, 36).fillOpacity(0.03).fill(C.text).restore();
          doc.font("Bold").fontSize(10.5).fillColor(C.text).text(c.asset, margin + 8, rowY + 2, { width: contentWidth / 3 });
          doc.font("Regular").fontSize(10).fillColor(C.accent).text(c.correlation, margin + contentWidth / 3, rowY + 2, { width: contentWidth / 3, align: "center" });
          doc.font("Regular").fontSize(9.5).fillColor(C.muted).text(c.observation, margin + 8, rowY + 18, { width: contentWidth - 16 });
          doc.y = rowY + 36;
          doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.3).stroke();
        }
      }

      // Section 4: Trade Strategy
      if (asset.tradeStrategy) {
        if (doc.y > pageHeight - 120) doc.addPage();
        doc.moveDown(1);
        const ts = asset.tradeStrategy;
        const tsDir = dirLabels[ts.direction] || "中性";

        // Highlighted title
        const titleH = 28;
        doc.save().rect(margin, doc.y, contentWidth, titleH).fillOpacity(0.08).fill(C.primary).restore();
        doc.font("Bold").fontSize(16).fillColor(C.primary).text(`四、交易执行计划  [${tsDir}]`, margin + 12, doc.y + 6, { width: contentWidth - 24 });
        doc.y += 8;
        doc.moveDown(0.3);
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
        doc.moveDown(0.5);

        const stratRows = [
          ["方向", tsDir],
          ["入场区间", ts.entryRange || "--"],
          ["初始仓位", ts.initialPosition || "--"],
          ["加仓条件", ts.pyramidCondition || "--"],
          ["止损位", ts.stopLoss || "--"],
          ["目标位", ts.target || "--"],
          ["风险回报比", ts.riskRewardRatio || "--"],
          ["时间框架", ts.timeFrame || "--"],
        ];
        for (const [label, value] of stratRows) {
          if (doc.y > pageHeight - 80) doc.addPage();
          const rowY = doc.y;
          doc.save().rect(margin, rowY - 2, contentWidth, 22).fillOpacity(0.03).fill(C.text).restore();
          doc.font("Bold").fontSize(10.5).fillColor(C.text).text(label, margin + 8, rowY + 2, { width: contentWidth / 2 });
          doc.font("Regular").fontSize(10.5).fillColor(C.text).text(value, margin + contentWidth / 2, rowY + 2, { width: contentWidth / 2 - 8, align: "right" });
          doc.y = rowY + 22;
          doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.3).stroke();
        }
      }

      // Section 5: Multi-Dimension Analysis
      if (asset.dimensionViews && asset.dimensionViews.length > 0) {
        if (doc.y > pageHeight - 120) doc.addPage();
        doc.moveDown(1);
        doc.font("Bold").fontSize(16).fillColor(C.primary).text("五、多维度分析", margin, doc.y);
        doc.moveDown(0.3);
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
        doc.moveDown(0.5);

        for (const dv of asset.dimensionViews) {
          if (doc.y > pageHeight - 100) doc.addPage();
          doc.font("Bold").fontSize(12).fillColor(C.accent).text(dv.dimensionName || dv.dimension, margin, doc.y);
          doc.moveDown(0.2);
          doc.font("Regular").fontSize(10.5).fillColor(C.text).text(dv.perspective, margin + 10, doc.y, { width: contentWidth - 20, lineGap: 3, align: "justify" });
          if (dv.keyInsight) {
            doc.moveDown(0.3);
            const insightY = doc.y;
            doc.font("Bold").fontSize(10).fillColor(C.primary).text(`核心洞察: ${dv.keyInsight}`, margin + 16, insightY + 8, { width: contentWidth - 32, lineGap: 3 });
            const insightEnd = doc.y + 8;
            doc.save().roundedRect(margin + 8, insightY, contentWidth - 16, insightEnd - insightY, 4).fillOpacity(0.05).fill(C.primary).restore();
            doc.y = insightEnd;
          }
          doc.moveDown(0.5);
        }
      }

      // Disclaimer
      if (doc.y > pageHeight - 100) doc.addPage();
      doc.moveDown(1);
      doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.5);
      doc.font("Bold").fontSize(11).fillColor(C.muted).text("免责声明", margin, doc.y);
      doc.moveDown(0.3);
      doc.font("Regular").fontSize(9).fillColor(C.muted).text(
        "本报告仅为基于公开信息的宏观分析，不构成任何投资建议。市场有风险，投资需谨慎。过往表现不代表未来收益。",
        margin, doc.y, { width: contentWidth, lineGap: 3, align: "justify" }
      );

      // Page numbers
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.font("Regular").fontSize(8).fillColor(C.muted).text(
          i === 0 ? "AI宏观作手 MACRO TRADER" : `AI宏观作手 MACRO TRADER  |  ${today}  |  第 ${i} / ${totalPages - 1} 页`,
          margin, pageHeight - 30, { width: contentWidth, align: "center" }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a complete PDF buffer for a report.
 */
export async function generateReportPDF(
  report: ReportDetail,
  opts?: PDFOptions
): Promise<Buffer> {
  const margin = opts?.margin ?? 50;
  const pageWidth = opts?.pageWidth ?? 595.28; // A4
  const pageHeight = opts?.pageHeight ?? 841.89;
  const contentWidth = pageWidth - margin * 2;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        info: {
          Title: report.title,
          Author: "AI宏观作手 Macro Trader",
          Subject: `${report.type === "weekly" ? "周度" : "季度"}投资报告`,
          Creator: "AI宏观作手",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Register fonts
      doc.registerFont("Regular", FONT_REGULAR);
      doc.registerFont("Bold", FONT_BOLD);

      // ========== COVER PAGE ==========
      renderCoverPage(doc, report, margin, contentWidth, pageWidth, pageHeight);

      // ========== CONTENT PAGES ==========
      doc.addPage();

      // Table of Contents
      renderTOC(doc, report, margin, contentWidth);

      // Core Thesis
      if (report.coreThesis) {
        addSectionGap(doc, margin, pageHeight);
        renderHighlightBox(doc, "核心论点", report.coreThesis, margin, contentWidth, C.primary);
      }

      // Executive Summary
      if (report.executiveSummary) {
        addSectionGap(doc, margin, pageHeight);
        renderSection(doc, "一、执行摘要", report.executiveSummary, margin, contentWidth, pageHeight);
      }

      // Macro Background
      if (report.macroBackground) {
        addSectionGap(doc, margin, pageHeight);
        renderSection(doc, "二、宏观背景与驱动因素", report.macroBackground, margin, contentWidth, pageHeight);
      }

      // Market Analysis
      if (report.marketAnalysis) {
        addSectionGap(doc, margin, pageHeight);
        renderSection(doc, "三、市场分析与主流偏见", report.marketAnalysis, margin, contentWidth, pageHeight);
      }

      // Trade Strategies
      if (report.tradeStrategies) {
        addSectionGap(doc, margin, pageHeight);
        renderSection(doc, "四、交易策略与实施建议", report.tradeStrategies, margin, contentWidth, pageHeight, true);
      }

      // Risks and Catalysts
      if (report.risksAndCatalysts) {
        addSectionGap(doc, margin, pageHeight);
        renderSection(doc, "五、风险与催化剂", report.risksAndCatalysts, margin, contentWidth, pageHeight);
      }

      // Disclaimer
      addSectionGap(doc, margin, pageHeight);
      renderDisclaimer(doc, report.disclaimer, margin, contentWidth, pageHeight);

      // ========== PAGE NUMBERS ==========
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc
          .font("Regular")
          .fontSize(8)
          .fillColor(C.muted)
          .text(
            i === 0 ? "AI宏观作手 MACRO TRADER" : `AI宏观作手 MACRO TRADER  |  ${report.date}  |  第 ${i} / ${totalPages - 1} 页`,
            margin,
            pageHeight - 30,
            { width: contentWidth, align: "center" }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ========== RENDER HELPERS ==========

function renderCoverPage(
  doc: PDFKit.PDFDocument,
  report: ReportDetail,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number
) {
  // Background accent bar at top
  doc.rect(0, 0, pageWidth, 8).fill(C.primary);

  // Brand name
  doc
    .font("Bold")
    .fontSize(14)
    .fillColor(C.primary)
    .text("AI宏观作手", margin, 60, { width: contentWidth })
    .font("Regular")
    .fontSize(10)
    .fillColor(C.muted)
    .text("MACRO TRADER", margin, doc.y + 2, { width: contentWidth });

  // Divider
  doc.moveTo(margin, 110).lineTo(margin + contentWidth, 110).strokeColor(C.border).lineWidth(0.5).stroke();

  // Report type badge
  const typeLabel = report.type === "weekly" ? "周度投资报告" : "季度投资报告";
  doc
    .font("Regular")
    .fontSize(12)
    .fillColor(C.accent)
    .text(typeLabel, margin, 130, { width: contentWidth });

  // Title
  doc
    .font("Bold")
    .fontSize(26)
    .fillColor(C.text)
    .text(report.title, margin, 160, { width: contentWidth, lineGap: 6 });

  // Scenario badge
  const sc = SCENARIO_CONFIG[report.scenario as MacroScenario] || SCENARIO_CONFIG.goldilocks;
  const scenarioY = doc.y + 20;
  doc
    .font("Regular")
    .fontSize(11)
    .fillColor(C.muted)
    .text("宏观情景判断：", margin, scenarioY, { continued: true })
    .font("Bold")
    .fillColor(sc.color)
    .text(sc.label, { continued: true })
    .font("Regular")
    .fillColor(C.muted)
    .text(`  （${sc.description}）`);

  // Core thesis on cover
  if (report.coreThesis) {
    const thesisY = doc.y + 30;
    doc.roundedRect(margin, thesisY, contentWidth, 0.1, 4); // measure
    const thesisBoxY = thesisY;

    doc
      .font("Regular")
      .fontSize(10)
      .fillColor(C.muted)
      .text("核心论点", margin + 16, thesisBoxY + 4);

    doc
      .font("Bold")
      .fontSize(14)
      .fillColor(C.text)
      .text(report.coreThesis, margin + 16, doc.y + 4, {
        width: contentWidth - 32,
        lineGap: 4,
      });

    const boxBottom = doc.y + 12;
    // Draw box around
    doc
      .roundedRect(margin, thesisBoxY - 4, contentWidth, boxBottom - thesisBoxY + 8, 6)
      .strokeColor(C.primary)
      .lineWidth(1)
      .stroke();
  }

  // Date and metadata at bottom
  doc
    .font("Regular")
    .fontSize(10)
    .fillColor(C.muted)
    .text(`发布日期：${report.date}`, margin, pageHeight - 120, { width: contentWidth })
    .text(`生成时间：${report.createdAt || report.date}`, margin, doc.y + 4, { width: contentWidth })
    .text("由 AI宏观作手 分析引擎生成", margin, doc.y + 4, { width: contentWidth });

  // Bottom bar
  doc.rect(0, pageHeight - 8, pageWidth, 8).fill(C.primary);
}

function renderTOC(
  doc: PDFKit.PDFDocument,
  report: ReportDetail,
  margin: number,
  contentWidth: number
) {
  doc.font("Bold").fontSize(18).fillColor(C.primary).text("目录", margin, margin);
  doc.moveDown(0.5);

  const sections = [
    { title: "核心论点", has: !!report.coreThesis },
    { title: "一、执行摘要", has: !!report.executiveSummary },
    { title: "二、宏观背景与驱动因素", has: !!report.macroBackground },
    { title: "三、市场分析与主流偏见", has: !!report.marketAnalysis },
    { title: "四、交易策略与实施建议", has: !!report.tradeStrategies },
    { title: "五、风险与催化剂", has: !!report.risksAndCatalysts },
    { title: "免责声明", has: true },
  ];

  sections.forEach((s, i) => {
    if (s.has) {
      doc
        .font("Regular")
        .fontSize(12)
        .fillColor(C.text)
        .text(`${s.title}`, margin + 10, doc.y + 6, { width: contentWidth - 20 });
    }
  });

  // Divider after TOC
  doc.moveDown(1);
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
}

function renderHighlightBox(
  doc: PDFKit.PDFDocument,
  label: string,
  text: string,
  margin: number,
  contentWidth: number,
  color: string
) {
  const startY = doc.y;

  // Label
  doc.font("Bold").fontSize(10).fillColor(color).text(label, margin + 16, startY + 12);

  // Content
  doc
    .font("Bold")
    .fontSize(13)
    .fillColor(C.text)
    .text(text, margin + 16, doc.y + 6, { width: contentWidth - 32, lineGap: 4 });

  const endY = doc.y + 12;

  // Background box
  doc
    .save()
    .roundedRect(margin, startY, contentWidth, endY - startY, 6)
    .fillOpacity(0.05)
    .fill(color)
    .restore();

  // Border
  doc
    .roundedRect(margin, startY, contentWidth, endY - startY, 6)
    .strokeColor(color)
    .lineWidth(0.8)
    .stroke();

  doc.y = endY + 4;
}

function addSectionGap(doc: PDFKit.PDFDocument, margin: number, pageHeight: number) {
  if (doc.y > pageHeight - 120) {
    doc.addPage();
  } else {
    doc.moveDown(1);
  }
}

function renderSection(
  doc: PDFKit.PDFDocument,
  title: string,
  content: string,
  margin: number,
  contentWidth: number,
  pageHeight: number,
  highlight?: boolean
) {
  // Section title
  if (highlight) {
    // Accent background for title
    const titleH = 28;
    doc.save().rect(margin, doc.y, contentWidth, titleH).fillOpacity(0.08).fill(C.primary).restore();
    doc.font("Bold").fontSize(16).fillColor(C.primary).text(title, margin + 12, doc.y + 6, { width: contentWidth - 24 });
    doc.y += 8;
  } else {
    doc.font("Bold").fontSize(16).fillColor(C.primary).text(title, margin, doc.y);
  }

  doc.moveDown(0.3);

  // Divider under title
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.primary).lineWidth(0.8).stroke();
  doc.moveDown(0.5);

  // Parse and render markdown-like content
  renderMarkdownContent(doc, content, margin, contentWidth, pageHeight);
}

function renderMarkdownContent(
  doc: PDFKit.PDFDocument,
  content: string,
  margin: number,
  contentWidth: number,
  pageHeight: number
) {
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.3);
      continue;
    }

    // Check if we need a new page
    if (doc.y > pageHeight - 80) {
      doc.addPage();
    }

    // H2 heading
    if (trimmed.startsWith("## ")) {
      doc.moveDown(0.5);
      doc
        .font("Bold")
        .fontSize(14)
        .fillColor(C.text)
        .text(trimmed.replace("## ", ""), margin, doc.y, { width: contentWidth });
      doc.moveDown(0.2);
      continue;
    }

    // H3 heading
    if (trimmed.startsWith("### ")) {
      doc.moveDown(0.3);
      doc
        .font("Bold")
        .fontSize(12)
        .fillColor(C.accent)
        .text(trimmed.replace("### ", ""), margin, doc.y, { width: contentWidth });
      doc.moveDown(0.2);
      continue;
    }

    // Bullet point
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletText = trimmed.replace(/^[-*]\s/, "").replace(/\*\*/g, "");
      doc
        .font("Regular")
        .fontSize(10.5)
        .fillColor(C.text)
        .text("•  " + bulletText, margin + 10, doc.y, {
          width: contentWidth - 20,
          lineGap: 3,
        });
      doc.moveDown(0.1);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const numText = trimmed.replace(/\*\*/g, "");
      doc
        .font("Regular")
        .fontSize(10.5)
        .fillColor(C.text)
        .text(numText, margin + 10, doc.y, {
          width: contentWidth - 20,
          lineGap: 3,
        });
      doc.moveDown(0.1);
      continue;
    }

    // Table row (skip separator rows)
    if (trimmed.startsWith("|")) {
      if (trimmed.includes("---")) continue;
      const cells = trimmed
        .split("|")
        .filter((c) => c.trim().length > 0)
        .map((c) => c.trim().replace(/\*\*/g, ""));

      if (cells.length >= 2) {
        const colWidth = contentWidth / cells.length;
        const rowY = doc.y;

        // Light background for table rows
        doc.save().rect(margin, rowY - 2, contentWidth, 18).fillOpacity(0.03).fill(C.text).restore();

        cells.forEach((cell, ci) => {
          doc
            .font(ci === 0 ? "Bold" : "Regular")
            .fontSize(9.5)
            .fillColor(C.text)
            .text(cell, margin + ci * colWidth + 4, rowY, {
              width: colWidth - 8,
              lineGap: 2,
            });
        });

        doc.y = rowY + 18;
        doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.3).stroke();
        continue;
      }
    }

    // Regular paragraph
    const cleanText = trimmed.replace(/\*\*/g, "");
    doc
      .font("Regular")
      .fontSize(10.5)
      .fillColor(C.text)
      .text(cleanText, margin, doc.y, {
        width: contentWidth,
        lineGap: 4,
        align: "justify",
      });
    doc.moveDown(0.2);
  }
}

function renderDisclaimer(
  doc: PDFKit.PDFDocument,
  disclaimer: string | undefined,
  margin: number,
  contentWidth: number,
  pageHeight: number
) {
  if (doc.y > pageHeight - 150) {
    doc.addPage();
  }

  const disclaimerText =
    disclaimer ||
    "本报告仅为基于公开信息的宏观分析，不构成任何投资建议。市场有风险，投资需谨慎。过往表现不代表未来收益。本报告中的观点和预测可能随时变化，恕不另行通知。";

  doc.moveDown(1);
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  doc.font("Bold").fontSize(11).fillColor(C.muted).text("免责声明", margin, doc.y);
  doc.moveDown(0.3);

  doc
    .font("Regular")
    .fontSize(9)
    .fillColor(C.muted)
    .text(disclaimerText.replace(/\*\*/g, ""), margin, doc.y, {
      width: contentWidth,
      lineGap: 3,
      align: "justify",
    });
}
