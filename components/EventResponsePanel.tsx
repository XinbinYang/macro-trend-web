"use client";

import { useState, useEffect } from "react";
import { ALL_EVENT_TEMPLATES, type EventScenario, type RiskUnitImpact } from "@/lib/config/event-templates";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, AlertCircle, CheckSquare, Target, PenLine } from "lucide-react";

// 行动选项
const ACTION_OPTIONS = ["加仓", "减仓", "观望", "对冲", "调仓"] as const;
type ActionType = typeof ACTION_OPTIONS[number];

// 根据场景索引预填行动
function getDefaultAction(scenarioIndex: number): ActionType {
  if (scenarioIndex === 0) return "观望";
  if (scenarioIndex === 1) return "观望";
  return "加仓";
}

// 从场景标签提取关键词
function extractKeywords(label: string): string[] {
  const keywords: string[] = [];
  if (label.includes("高于预期") || label.includes("超预期")) keywords.push("高于预期");
  if (label.includes("低于预期")) keywords.push("低于预期");
  if (label.includes("鹰派")) keywords.push("鹰派");
  if (label.includes("鸽派")) keywords.push("鸽派");
  if (label.includes("中性")) keywords.push("中性");
  if (label.includes("强劲") || label.includes("超强")) keywords.push("强劲");
  if (label.includes("恶化")) keywords.push("恶化");
  return keywords;
}

// Decision Log Modal
function DecisionLogModal({
  isOpen,
  onClose,
  eventInfo,
  scenario,
  scenarioIndex,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventInfo: {
    displayName: string;
    eventType: string;
    triggerDimension: string;
  };
  scenario: EventScenario;
  scenarioIndex: number;
}) {
  const { displayName, eventType, triggerDimension } = eventInfo;
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // 表单状态
  const [title, setTitle] = useState("");
  const [action, setAction] = useState<ActionType>("观望");
  const [asset, setAsset] = useState("");
  const [rationale, setRationale] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // 初始化预填值
  useEffect(() => {
    if (isOpen) {
      const defaultAction = getDefaultAction(scenarioIndex);
      setTitle(`${displayName} — ${scenario.label}`);
      setAction(defaultAction);
      setAsset("");
      setRationale(`${scenario.macroRegimeShift}\n\n传导路径：\n${scenario.transmission.join("\n")}`);
      const keywords = extractKeywords(scenario.label);
      setTags([eventType, triggerDimension, ...keywords]);
      setStatus("idle");
      setErrorMsg("");
    }
  }, [isOpen, displayName, eventType, triggerDimension, scenario, scenarioIndex]);

  // 处理提交
  const handleSubmit = async () => {
    setIsLoading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const response = await fetch("/api/mission/decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          action,
          asset,
          rationale,
          tags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "提交失败");
      }

      setStatus("success");
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 关闭时重置（useEffect 会在 isOpen 变化时自动重置）
  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-100">写入决策日志</h3>
        </div>

        {/* 表单内容 */}
        <div className="p-5 space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* 行动 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">行动</label>
            <Select value={action} onValueChange={(v) => setAction(v as ActionType)}>
              <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-slate-200 focus:bg-zinc-700">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 资产 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">资产</label>
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="例如：沪深300ETF、10年期国债..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* 决策逻辑 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">决策逻辑</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">标签</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-zinc-600 text-zinc-300">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 状态提示 */}
          {status === "success" && (
            <div className="text-center text-green-400 text-sm py-2">✅ 已写入 Decision Log</div>
          )}
          {status === "error" && (
            <div className="text-center text-red-400 text-sm py-2">❌ {errorMsg}</div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-zinc-800 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "提交中..." : "确认写入"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 风险单元映射
const RISK_UNIT_CONFIG = [
  { key: "usEquity", label: "🇺🇸 美股", emoji: "🇺🇸" },
  { key: "cnEquity", label: "🇨🇳 A股", emoji: "🇨🇳" },
  { key: "usBond", label: "🎯 美债", emoji: "🎯" },
  { key: "cnBond", label: "📜 中债", emoji: "📜" },
  { key: "commodity", label: "⚙️ 商品", emoji: "⚙️" },
  { key: "gold", label: "🪙 黄金", emoji: "🪙" },
] as const;

// Impact 映射为 emoji + 文字
function getImpactDisplay(impact: RiskUnitImpact): { emoji: string; text: string; colorClass: string } {
  switch (impact) {
    case "↑↑机会":
      return { emoji: "🟢", text: "↑↑机会", colorClass: "text-green-400" };
    case "↑强":
      return { emoji: "🟢", text: "↑强", colorClass: "text-green-400" };
    case "→中性":
      return { emoji: "⚪", text: "→中性", colorClass: "text-slate-400" };
    case "↓弱":
      return { emoji: "🔴", text: "↓弱", colorClass: "text-red-400" };
    case "↓↓风险":
      return { emoji: "🔴", text: "↓↓风险", colorClass: "text-red-500" };
    case "?不确定":
      return { emoji: "⚪", text: "?不确定", colorClass: "text-slate-500" };
    default:
      return { emoji: "⚪", text: "?", colorClass: "text-slate-400" };
  }
}

// 维度 badge 颜色
function getDimensionBadgeVariant(dimension: string) {
  switch (dimension) {
    case "inflation":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "policy":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "growth":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "liquidity":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

// 场景卡片颜色（标题边框/背景）
function getScenarioStyles(label: string) {
  if (label.includes("高于预期") || label.includes("鹰派") || label.includes("超强") || label.includes("强劲") || label.includes("超预期宽松")) {
    return {
      headerBg: "bg-red-900/30",
      borderColor: "border-red-500/50",
      titleColor: "text-red-400",
    };
  }
  if (label.includes("低于预期") || label.includes("鸽派") || label.includes("恶化") || label.includes("收缩") || label.includes("收紧")) {
    return {
      headerBg: "bg-green-900/30",
      borderColor: "border-green-500/50",
      titleColor: "text-green-400",
    };
  }
  // 符合预期/中性
  return {
    headerBg: "bg-slate-800/50",
    borderColor: "border-slate-600/50",
    titleColor: "text-slate-300",
  };
}

// 可折叠部分组件
function CollapsibleSection({
  title,
  icon: Icon,
  items,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{title}</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1.5 text-xs text-slate-400 pl-1">
          {items.map((item, idx) => (
            <div key={idx} className="leading-relaxed">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 单个场景卡片
function ScenarioCard({
  scenario,
  scenarioIndex,
  onWriteDecision,
}: {
  scenario: EventScenario;
  scenarioIndex: number;
  onWriteDecision: (scenario: EventScenario, index: number) => void;
}) {
  const styles = getScenarioStyles(scenario.label);

  return (
    <Card className={`bg-zinc-900 border ${styles.borderColor} overflow-hidden`}>
      {/* 卡片标题 */}
      <div className={`px-4 py-3 ${styles.headerBg} border-b ${styles.borderColor}`}>
        <h4 className={`font-semibold text-sm ${styles.titleColor}`}>
          {scenario.label}
        </h4>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* 触发条件 */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            触发条件
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            {scenario.trigger}
          </div>
        </div>

        {/* 概率 & Regime Shift */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">概率: </span>
            <span className="text-amber-400 font-medium">{scenario.probability}</span>
          </div>
          <div className="text-slate-400 text-right max-w-[60%]">
            {scenario.macroRegimeShift}
          </div>
        </div>

        {/* 风险单元图标行 */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            风险单元影响
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RISK_UNIT_CONFIG.map((unit) => {
              const impact = scenario.riskUnits[unit.key as keyof typeof scenario.riskUnits];
              const display = getImpactDisplay(impact);
              return (
                <div
                  key={unit.key}
                  className="flex items-center gap-1.5 bg-zinc-800/50 rounded px-2 py-1.5"
                >
                  <span className="text-sm">{unit.emoji}</span>
                  <span className={`text-xs font-medium ${display.colorClass}`}>
                    {display.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transmission 链 */}
        <CollapsibleSection
          title="传导链 Transmission"
          icon={AlertCircle}
          items={scenario.transmission}
        />

        {/* CheckList */}
        <CollapsibleSection
          title="操作清单 CheckList"
          icon={CheckSquare}
          items={scenario.checkList}
        />

        {/* KeyLevels */}
        <CollapsibleSection
          title="关键价位 KeyLevels"
          icon={Target}
          items={scenario.keyLevels}
        />

        {/* 写入决策按钮 */}
        <button
          onClick={() => onWriteDecision(scenario, scenarioIndex)}
          className="w-full mt-4 py-2 text-xs border border-zinc-600 text-zinc-300 rounded hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
        >
          <PenLine className="w-3.5 h-3.5" />
          写入决策
        </button>
      </CardContent>
    </Card>
  );
}

// 主组件
export function EventResponsePanel() {
  const [selectedEvent, setSelectedEvent] = useState<string>("US_CPI");
  
  // Modal 状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScenario, setModalScenario] = useState<EventScenario | null>(null);
  const [modalScenarioIndex, setModalScenarioIndex] = useState(0);
  const [modalEventInfo, setModalEventInfo] = useState<{
    displayName: string;
    eventType: string;
    triggerDimension: string;
  } | null>(null);
  
  const eventTypes = Object.keys(ALL_EVENT_TEMPLATES) as Array<keyof typeof ALL_EVENT_TEMPLATES>;
  const currentTemplate = ALL_EVENT_TEMPLATES[selectedEvent];

  // 打开决策日志 Modal
  const handleWriteDecision = (scenario: EventScenario, index: number) => {
    setModalScenario(scenario);
    setModalScenarioIndex(index);
    setModalEventInfo({
      displayName: currentTemplate.displayName,
      eventType: selectedEvent,
      triggerDimension: currentTemplate.triggerDimension,
    });
    setIsModalOpen(true);
  };

  // 关闭 Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalScenario(null);
  };

  if (!currentTemplate) {
    return (
      <div className="p-6 text-center text-slate-400">
        未找到事件模板: {selectedEvent}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 顶部选择器 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="text-sm text-slate-400 font-medium">
          选择宏观事件:
        </div>
        <Select value={selectedEvent} onValueChange={(value) => setSelectedEvent(value as string)}>
          <SelectTrigger className="w-full sm:w-[240px] bg-zinc-800 border-zinc-700 text-slate-200">
            <SelectValue placeholder="选择事件类型" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {eventTypes.map((key) => (
              <SelectItem
                key={key}
                value={key}
                className="text-slate-200 focus:bg-zinc-700 focus:text-slate-100"
              >
                {ALL_EVENT_TEMPLATES[key].displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 中间事件信息 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              {currentTemplate.displayName}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {currentTemplate.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className={getDimensionBadgeVariant(currentTemplate.triggerDimension)}>
              {currentTemplate.triggerDimension === "inflation" && "📊 通胀"}
              {currentTemplate.triggerDimension === "policy" && "🏛️ 政策"}
              {currentTemplate.triggerDimension === "growth" && "📈 增长"}
              {currentTemplate.triggerDimension === "liquidity" && "💧 流动性"}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              📅 {currentTemplate.frequency}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              ⏰ {currentTemplate.leadTime}
            </Badge>
          </div>
        </div>
      </div>

      {/* 下方 3 列场景卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentTemplate.scenarios.map((scenario, idx) => (
          <ScenarioCard
            key={idx}
            scenario={scenario}
            scenarioIndex={idx}
            onWriteDecision={handleWriteDecision}
          />
        ))}
      </div>

      {/* Decision Log Modal */}
      {modalScenario && modalEventInfo && (
        <DecisionLogModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          eventInfo={modalEventInfo}
          scenario={modalScenario}
          scenarioIndex={modalScenarioIndex}
        />
      )}
    </div>
  );
}
