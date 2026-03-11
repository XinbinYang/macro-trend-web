type LLMProvider = "openrouter" | "deepseek";

export interface LLMChatResult {
  ok: boolean;
  provider?: LLMProvider;
  status?: number;
  text?: string;
  error?: string;
}

function getReferer() {
  return process.env.VERCEL_URL || "https://macro-trend-web.vercel.app";
}

async function callOpenRouter(payload: unknown): Promise<LLMChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, provider: "openrouter", error: "OPENROUTER_API_KEY is not configured" };

  let resp: Response;
  try {
    resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": getReferer(),
        "X-Title": "AI Macro Trader",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, provider: "openrouter", status: 0, error: String(e) };
  }

  if (!resp.ok) {
    const status = resp.status;
    const t = await resp.text().catch(() => "");
    return { ok: false, provider: "openrouter", status, error: t || `OpenRouter error: ${status}` };
  }

  const data: unknown = await resp.json();
  const text = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  return { ok: true, provider: "openrouter", status: 200, text };
}

async function callDeepSeek(payload: unknown): Promise<LLMChatResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { ok: false, provider: "deepseek", error: "DEEPSEEK_API_KEY is not configured" };

  // DeepSeek provides an OpenAI-compatible chat completions endpoint
  let resp: Response;
  try {
    resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, provider: "deepseek", status: 0, error: String(e) };
  }

  if (!resp.ok) {
    const status = resp.status;
    const t = await resp.text().catch(() => "");
    return { ok: false, provider: "deepseek", status, error: t || `DeepSeek error: ${status}` };
  }

  const data: unknown = await resp.json();
  const text = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  return { ok: true, provider: "deepseek", status: 200, text };
}

/**
 * Provider routing:
 * - Prefer OpenRouter (best model flexibility / quality).
 * - Fallback to DeepSeek for mainland reachability.
 */
export async function llmChat(payload: unknown): Promise<LLMChatResult> {
  const first = await callOpenRouter(payload);
  if (first.ok) return first;

  // fallback to deepseek
  const second = await callDeepSeek(payload);
  if (second.ok) return second;

  // return the more informative error
  return second.error ? second : first;
}
