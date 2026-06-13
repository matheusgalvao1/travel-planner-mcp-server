import { TravelMcpError } from "./errors.js";
import { requestTimeoutMs } from "./config.js";

/**
 * Single network entry point for every supplier call. It owns timeouts and
 * turns transport/HTTP failures into a TravelMcpError so adapters don't each
 * re-implement error handling.
 */
export async function fetchJson(
  url: string,
  init: RequestInit,
  supplier: string
): Promise<unknown> {
  const timeoutMs = requestTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TravelMcpError(
        "timeout",
        `${supplier} request timed out after ${timeoutMs}ms`,
        { supplier }
      );
    }
    throw new TravelMcpError(
      "supplier_error",
      `${supplier} request failed: ${error instanceof Error ? error.message : String(error)}`,
      { supplier }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await safeText(response);
    throw new TravelMcpError(
      "supplier_error",
      `${supplier} returned HTTP ${response.status}${body ? `: ${truncate(body)}` : ""}`,
      { supplier, status: response.status }
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new TravelMcpError(
      "supplier_error",
      `${supplier} returned a non-JSON response: ${error instanceof Error ? error.message : String(error)}`,
      { supplier, status: response.status }
    );
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
