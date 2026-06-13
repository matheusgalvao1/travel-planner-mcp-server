import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { SearchFlightsSchema, SearchHotelsSchema } from "../src/schemas.js";

const Flights = z.object(SearchFlightsSchema);
const Hotels = z.object(SearchHotelsSchema);

test("flights: minimal input applies defaults", () => {
  const parsed = Flights.parse({
    origin: "GRU",
    destination: "GIG",
    departure_date: "2026-07-01"
  });
  assert.equal(parsed.passengers.adults, 1);
  assert.equal(parsed.cabin, "economy");
  assert.equal(parsed.result_limit, 10);
  assert.ok(parsed.currency, "currency default is set");
});

test("flights: result_limit above max is rejected", () => {
  assert.throws(() =>
    Flights.parse({
      origin: "GRU",
      destination: "GIG",
      departure_date: "2026-07-01",
      result_limit: 999
    })
  );
});

test("flights: zero adults is rejected", () => {
  assert.throws(() =>
    Flights.parse({
      origin: "GRU",
      destination: "GIG",
      departure_date: "2026-07-01",
      passengers: { adults: 0 }
    })
  );
});

test("hotels: minimal input applies defaults", () => {
  const parsed = Hotels.parse({
    destination: "Rio de Janeiro",
    check_in: "2026-07-01",
    check_out: "2026-07-05"
  });
  assert.equal(parsed.guests.adults, 1);
  assert.equal(parsed.result_limit, 10);
  assert.ok(parsed.market, "market default is set");
});

test("hotels: missing destination is rejected", () => {
  assert.throws(() =>
    Hotels.parse({
      check_in: "2026-07-01",
      check_out: "2026-07-05"
    })
  );
});

test("hotels: out-of-range stars are rejected", () => {
  assert.throws(() =>
    Hotels.parse({
      destination: "Rio",
      check_in: "2026-07-01",
      check_out: "2026-07-05",
      constraints: { stars: [9] }
    })
  );
});
