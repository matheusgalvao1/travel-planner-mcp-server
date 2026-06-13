import { TravelMcpError } from "./errors.js";

/**
 * Centralized environment access so providers stay thin and tests can flip
 * behavior (mock mode, missing credentials) by setting process.env.
 */

export function isMockMode(): boolean {
  const raw = (process.env.TRAVEL_MCP_MOCK ?? process.env.MOCK_MODE ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function requireEnv(name: string, supplier?: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new TravelMcpError(
      "missing_credentials",
      `Missing required environment variable: ${name}. Set it, or run in mock mode with TRAVEL_MCP_MOCK=1.`,
      { supplier }
    );
  }
  return value;
}

export function requestTimeoutMs(): number {
  const n = Number(process.env.REQUEST_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 15_000;
}

export function defaults() {
  return {
    currency: process.env.DEFAULT_CURRENCY ?? "BRL",
    market: process.env.DEFAULT_MARKET ?? "BR",
    locale: process.env.DEFAULT_LOCALE ?? "pt-BR"
  };
}
