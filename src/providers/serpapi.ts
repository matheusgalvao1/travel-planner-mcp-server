import { requireEnv } from "../config.js";
import { fetchJson } from "../http.js";

/**
 * Shared SerpApi client. SerpApi is a single GET endpoint selected by `engine`
 * (google_flights, google_hotels). The api_key travels as a query param — we
 * never log full URLs, so it stays out of logs.
 */
export async function serpapiSearch(
  engine: string,
  params: Record<string, unknown>,
  supplier: string
): Promise<unknown> {
  const baseUrl = process.env.SERPAPI_BASE_URL ?? "https://serpapi.com/search.json";
  const apiKey = requireEnv("SERPAPI_API_KEY", supplier);

  const url = new URL(baseUrl);
  url.searchParams.set("engine", engine);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return fetchJson(url.toString(), { method: "GET", headers: { Accept: "application/json" } }, supplier);
}
