"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  coreThesis: string;
  scenario: string;
  keyPoints: string[];
  content?: string;
  model?: string;
}

const scenarioLabels: Record<string, string> = {
  inflation: "通胀",
  deflation: "通缩",
  goldilocks: "金发姑娘",
  stagflation: "滞胀",
};

// 生成 PDF 报告
export async function generatePDF(report: Report): Promise<void> {
  // 创建临时 DOM 元素用于渲染
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  container.style.background = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily = "'Inter', 'Noto Sans SC', sans-serif";
  
  // 根据情景选择颜色
  const scenarioColor = 
    report.scenario === "inflation" ? "#f97316" :
    report.scenario === "deflation" ? "#3b82f6" :
    report.scenario === "stagflation" ? "#ef4444" : "#22c55e";
  
  container.innerHTML = `
    <div style="max-width: 720px; margin: 0 auto;">
      <!-- 头部 -->
      <div style="border-bottom: 3px solid ${scenarioColor}; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              ${report.type === "weekly" ? "周度宏观报告" : "季度宏观展望"} · ${report.date}
            </div>
            <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0; line-height: 1.3;">
              ${report.title}
            </h1>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: bold; color: ${scenarioColor};">
              ${scenarioLabels[report.scenario]}
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
              ${report.model?.includes("deepseek") ? "DeepSeek" : "GPT-5.4"}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 核心观点 -->
      <div style="background: #f9fafb; border-left: 4px solid ${scenarioColor}; padding: 20px; margin-bottom: 30px;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          核心观点
        </div>
        <div style="font-size: 16px; color: #111827; line-height: 1.6;">
          ${report.coreThesis}
        </div>
      </div>
      
      <!-- 关键要点 -->
      <div style="margin-bottom: 30px;">
        <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 16px;">
          关键要点
        </div>
        <div style="display: grid; gap: 12px;">
          ${report.keyPoints.map((point, i) => `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="width: 24px; height: 24px; background: ${scenarioColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                ${i + 1}
              </div>
              <div style="font-size: 14px; color: #374151; line-height: 1.5; padding-top: 2px;">
                ${point}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      
      <!-- 详细内容 -->
      ${report.content ? `
        <div style="margin-bottom: 30px;">
          <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 16px;">
            详细分析
          </div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.8; white-space: pre-line;">
            ${report.content.replace(/#{1,6}\s/g, "")}
          </div>
        </div>
      ` : ""}
      
      <!-- 底部 -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12px; color: #9ca3af;">
            AI宏观作手 · 全球宏观投资分析平台
          </div>
          <div style="font-size: 10px; color: #d1d5db;">
            仅供参考，不构成投资建议
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    // 使用 html2canvas 渲染
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 800,
      height: container.offsetHeight,
    });
    
    // 创建 PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    const imgY = 10;
    
    // 计算需要多少页
    const scaledHeight = imgHeight * ratio * (pdfWidth - 20) / (imgWidth * ratio);
    let heightLeft = scaledHeight;
    let position = imgY;
    
    // 添加第一页
    pdf.addImage(imgData, "PNG", 10, position, pdfWidth - 20, scaledHeight);
    heightLeft -= pdfHeight;
    
    // 如果内容超出一页，添加更多页
    while (heightLeft > 0) {
      position = heightLeft - scaledHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, pdfWidth - 20, scaledHeight);
      heightLeft -= pdfHeight;
    }
    
    // 下载 PDF
    pdf.save(`${report.title}_${report.date}.pdf`);
    
  } finally {
    document.body.removeChild(container);
  }
}

// 生成 Markdown（备用）
export function generateMarkdown(report: Report): string {
  return `# ${report.title}

**日期**: ${report.date}  
**类型**: ${report.type === "weekly" ? "周度报告" : "季度报告"}  
**模型**: ${report.model?.includes("deepseek") ? "DeepSeek" : "GPT-5.4"}

## 核心观点

${report.coreThesis}

## 宏观情景

${scenarioLabels[report.scenario]}

## 关键要点

${report.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 详细内容

${report.content || "暂无详细内容"}

---

*本报告由 AI宏观作手 生成，仅供参考，不构成投资建议。*
`;
}

// 下载 Markdown 文件
export function downloadMarkdown(report: Report): void {
  const content = generateMarkdown(report);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title}_${report.date}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
