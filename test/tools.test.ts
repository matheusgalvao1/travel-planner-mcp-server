import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { searchFlightsTool, searchHotelsTool, applyFlightConstraints, type ToolResponse } from "../src/tools.js";
import type { FlightsSearchInput } from "../src/providers/flights.js";
import type { HotelsSearchInput } from "../src/providers/hotels.js";
import type { FlightOption } from "../src/normalizers/flight.js";

const flightInput: FlightsSearchInput = {
  origin: "GRU",
  destination: "GIG",
  departure_date: "2026-07-01",
  return_date: "2026-07-08",
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
  guests: { adults: 2 },
  currency: "BRL",
  market: "BR",
  locale: "pt-BR",
  result_limit: 10
};

function parse(res: ToolResponse): any {
  assert.equal(res.content[0].type, "text");
  return JSON.parse(res.content[0].text);
}

afterEach(() => {
  delete process.env.TRAVEL_MCP_MOCK;
  delete process.env.SERPAPI_API_KEY;
});

test("search_flights returns a well-formed success response in mock mode", async () => {
  process.env.TRAVEL_MCP_MOCK = "1";
  const payload = parse(await searchFlightsTool(flightInput));

  assert.equal(payload.status, "success");
  assert.equal(payload.supplier, "google_flights");
  assert.equal(payload.mode, "mock");
  assert.ok(Array.isArray(payload.results));
  assert.equal(payload.result_count, payload.results.length);
  for (const f of payload.results) assert.equal(f.supplier, "google_flights");
});

test("search_flights applies max_stops constraint", async () => {
  process.env.TRAVEL_MCP_MOCK = "1";
  const payload = parse(await searchFlightsTool({ ...flightInput, constraints: { max_stops: 0 } }));
  assert.ok(payload.results.length >= 1);
  for (const f of payload.results) assert.equal(f.stops, 0);
});

test("search_hotels returns a well-formed success response in mock mode", async () => {
  process.env.TRAVEL_MCP_MOCK = "1";
  const payload = parse(await searchHotelsTool(hotelInput));

  assert.equal(payload.status, "success");
  assert.equal(payload.supplier, "google_hotels");
  assert.equal(payload.mode, "mock");
  assert.equal(payload.results.length, 3);
  for (const h of payload.results) assert.equal(h.supplier, "google_hotels");
});

test("search_flights surfaces credential errors as a structured failed response", async () => {
  delete process.env.TRAVEL_MCP_MOCK;
  delete process.env.SERPAPI_API_KEY;

  const res = await searchFlightsTool(flightInput);
  assert.equal(res.isError, true);
  const payload = parse(res);
  assert.equal(payload.status, "failed");
  assert.equal(payload.error.code, "missing_credentials");
  assert.deepEqual(payload.results, []);
});

test("applyFlightConstraints filters by stops, price, duration, and airline", () => {
  const flights: FlightOption[] = [
    { supplier: "google_flights", price: 1289, stops: 0, duration_minutes: 75, carriers: ["LATAM Airlines"] },
    { supplier: "google_flights", price: 989, stops: 1, duration_minutes: 210, carriers: ["Gol"] },
    { supplier: "google_flights", price: 1450, stops: 0, duration_minutes: 80, carriers: ["Azul"] }
  ];

  assert.equal(applyFlightConstraints(flights, { max_stops: 0 }).length, 2);
  assert.equal(applyFlightConstraints(flights, { max_price: 1300 }).length, 2);
  assert.equal(applyFlightConstraints(flights, { max_duration_minutes: 100 }).length, 2);
  assert.equal(applyFlightConstraints(flights, { avoid_airlines: ["gol"] }).length, 2);
  assert.equal(applyFlightConstraints(flights, undefined).length, 3);
});
