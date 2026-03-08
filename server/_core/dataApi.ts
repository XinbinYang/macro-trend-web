/**
 * Quick example (matches curl usage):
 *   await callDataApi("Youtube/search", {
 *     query: { gl: "US", hl: "en", q: "manus" },
 *   })
 */
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {},
): Promise<unknown> {
  // Check if Forge API is configured
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn(`[DataApi] Forge API not configured, returning mock data for ${apiId}`);
    return getMockData(apiId);
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      apiId,
      query: options.query,
      body: options.body,
      path_params: options.pathParams,
      multipart_form_data: options.formData,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === "object" && "jsonData" in payload) {
    try {
      return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");
    } catch {
      return (payload as Record<string, unknown>).jsonData;
    }
  }
  return payload;
}

// Mock data for when Forge API is not configured
function getMockData(apiId: string): unknown {
  // Yahoo Finance mock data
  if (apiId.includes("YahooFinance")) {
    return {
      chart: {
        result: [{
          meta: {
            regularMarketPrice: 150.0,
            previousClose: 148.5,
            currency: "USD",
            symbol: "MOCK",
          },
          timestamp: [Date.now() / 1000],
          indicators: {
            quote: [{
              open: [148.5],
              high: [151.0],
              low: [147.0],
              close: [150.0],
              volume: [1000000],
            }],
          },
        }],
        error: null,
      },
    };
  }
  
  // Default mock
  return { mock: true, apiId };
}
