import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { searchFlights, type FlightsSearchInput } from "../src/providers/flights.js";
import { searchHotels, type HotelsSearchInput } from "../src/providers/hotels.js";
import { TravelMcpError } from "../src/errors.js";

const flightInput: FlightsSearchInput = {
  origin: "GRU",
  destination: "GIG",
  departure_date: "2026-07-01",
  passengers: { adults: 1 },
  cabin: "economy",
  currency: "BRL",
  market: "BR",
  locale: "pt-BR",
  result_limit: 10
};

const hotelInput: HotelsSearchInput = {
  destination: "Rio de Janeiro",
  check_in: "2026-07-01",
  check_out: "2026-07-05",
  guests: { adults: 1 },
  currency: "BRL",
  market: "BR",
  locale: "pt-BR",
  result_limit: 10
};

const realFetch = globalThis.fetch;

function clearEnv() {
  delete process.env.TRAVEL_MCP_MOCK;
  delete process.env.MOCK_MODE;
  delete process.env.SERPAPI_API_KEY;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  clearEnv();
});

test("flights: missing SERPAPI_API_KEY throws missing_credentials", async () => {
  clearEnv();
  await assert.rejects(
    () => searchFlights(flightInput),
    (err) => err instanceof TravelMcpError && err.code === "missing_credentials"
  );
});

test("hotels: missing SERPAPI_API_KEY throws missing_credentials", async () => {
  clearEnv();
  await assert.rejects(
    () => searchHotels(hotelInput),
    (err) => err instanceof TravelMcpError && err.code === "missing_credentials"
  );
});

test("hotels: a non-OK SerpApi response throws supplier_error with status", async () => {
  clearEnv();
  process.env.SERPAPI_API_KEY = "key";
  globalThis.fetch = (async () =>
    new Response("rate limited", { status: 429 })) as typeof fetch;

  await assert.rejects(
    () => searchHotels(hotelInput),
    (err) =>
      err instanceof TravelMcpError && err.code === "supplier_error" && err.status === 429
  );
});

test("flights: SerpApi key is sent and engine/params are set on the request URL", async () => {
  clearEnv();
  process.env.SERPAPI_API_KEY = "secret-key";
  let calledUrl = "";
  globalThis.fetch = (async (input: any) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({ best_flights: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  await searchFlights(flightInput);
  const url = new URL(calledUrl);
  assert.equal(url.searchParams.get("engine"), "google_flights");
  assert.equal(url.searchParams.get("api_key"), "secret-key");
  assert.equal(url.searchParams.get("departure_id"), "GRU");
  assert.equal(url.searchParams.get("type"), "2"); // one-way (no return_date)
});

test("mock mode bypasses credentials and returns a SerpApi-shaped payload", async () => {
  clearEnv();
  process.env.TRAVEL_MCP_MOCK = "1";
  const raw = (await searchFlights(flightInput)) as any;
  assert.ok(Array.isArray(raw?.best_flights), "mock returns best_flights[]");
});
