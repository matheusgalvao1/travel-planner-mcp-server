import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeGoogleFlights } from "../src/normalizers/flight.js";
import { normalizeGoogleHotels } from "../src/normalizers/hotel.js";
import { mockGoogleFlights, mockGoogleHotels } from "../src/mocks.js";
import type { FlightsSearchInput } from "../src/providers/flights.js";
import type { HotelsSearchInput } from "../src/providers/hotels.js";

const flightInput: FlightsSearchInput = {
  origin: "gru",
  destination: "gig",
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

test("flight normalizer maps SerpApi best_flights + other_flights", () => {
  const flights = normalizeGoogleFlights(mockGoogleFlights(flightInput), 10, "BRL");
  assert.equal(flights.length, 3); // 2 best + 1 other

  const first = flights[0];
  assert.equal(first.supplier, "google_flights");
  assert.equal(first.price, 1289);
  assert.equal(first.currency, "BRL");
  assert.equal(first.stops, 0);
  assert.equal(first.duration_minutes, 75);
  assert.equal(first.outbound?.origin, "GRU");
  assert.equal(first.outbound?.destination, "GIG");
  assert.deepEqual(first.carriers, ["LATAM Airlines"]);
  assert.match(first.booking_url ?? "", /google\.com\/travel\/flights/);

  // The connecting itinerary (from other_flights) has one layover stop.
  const connecting = flights.find((f) => f.stops === 1);
  assert.ok(connecting, "connecting flight present");
  assert.equal(connecting?.price, 989);
  assert.deepEqual(connecting?.carriers, ["Gol"]);
});

test("flight normalizer falls back to the requested currency", () => {
  const flights = normalizeGoogleFlights(mockGoogleFlights(flightInput), 10, "USD");
  // mock echoes search_parameters.currency = input.currency (BRL here)
  assert.equal(flights[0].currency, "BRL");
});

test("hotel normalizer maps SerpApi properties[] and extracted prices", () => {
  const hotels = normalizeGoogleHotels(mockGoogleHotels(hotelInput), 10, "BRL");
  assert.equal(hotels.length, 3);

  const first = hotels[0];
  assert.equal(first.supplier, "google_hotels");
  assert.equal(first.total_price, 920 * 4); // 4 nights
  assert.equal(first.nightly_price, 920);
  assert.equal(first.currency, "BRL");
  assert.equal(first.rating, 4.6);
  assert.equal(first.stars, 5);
  assert.equal(first.review_count, 4210);
  assert.equal(first.breakfast_included, true);
  assert.ok(typeof first.latitude === "number");
  assert.match(first.booking_url ?? "", /google\.com\/travel\/hotels/);
  assert.ok(Array.isArray(first.amenities) && first.amenities.length > 0);
});

test("normalizers tolerate empty / unexpected payloads", () => {
  assert.deepEqual(normalizeGoogleFlights({}, 10), []);
  assert.deepEqual(normalizeGoogleHotels({}, 10), []);
  assert.deepEqual(normalizeGoogleHotels(null, 10), []);
});

test("normalizers respect the limit", () => {
  assert.equal(normalizeGoogleFlights(mockGoogleFlights(flightInput), 1, "BRL").length, 1);
  assert.equal(normalizeGoogleHotels(mockGoogleHotels(hotelInput), 2, "BRL").length, 2);
});
