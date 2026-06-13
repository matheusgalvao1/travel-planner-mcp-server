import { isMockMode } from "./config.js";
import { toErrorPayload } from "./errors.js";
import { searchHotels, type HotelsSearchInput } from "./providers/hotels.js";
import { searchFlights, type FlightsSearchInput } from "./providers/flights.js";
import { normalizeGoogleHotels } from "./normalizers/hotel.js";
import { normalizeGoogleFlights, type FlightOption } from "./normalizers/flight.js";

/** MCP tool result shape (text content carrying a JSON string). */
export type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type FlightConstraints = FlightsSearchInput["constraints"];

export async function searchHotelsTool(input: HotelsSearchInput): Promise<ToolResponse> {
  try {
    const raw = await searchHotels(input);
    const hotels = normalizeGoogleHotels(raw, input.result_limit, input.budget?.currency ?? input.currency);

    return jsonToolResponse({
      status: "success",
      supplier: "google_hotels",
      source: "serpapi/google_hotels",
      mode: isMockMode() ? "mock" : "live",
      assumptions: [
        "Prices and availability come from Google Hotels via SerpApi and may change before booking.",
        "Ratings are on a 0-5 scale; nightly and total prices are in the requested currency."
      ],
      result_count: hotels.length,
      results: hotels
    });
  } catch (error) {
    return errorResponse("google_hotels", error);
  }
}

export async function searchFlightsTool(input: FlightsSearchInput): Promise<ToolResponse> {
  try {
    const raw = await searchFlights(input);
    const flights = normalizeGoogleFlights(raw, input.result_limit, input.currency);
    const filtered = applyFlightConstraints(flights, input.constraints).slice(0, input.result_limit);

    return jsonToolResponse({
      status: "success",
      supplier: "google_flights",
      source: "serpapi/google_flights",
      mode: isMockMode() ? "mock" : "live",
      assumptions: [
        "Prices and availability come from Google Flights via SerpApi and may change before booking.",
        "For round trips, price is the round-trip total and the return itinerary is finalized via the Google Flights URL."
      ],
      result_count: filtered.length,
      results: filtered
    });
  } catch (error) {
    return errorResponse("google_flights", error);
  }
}

export function applyFlightConstraints(
  flights: FlightOption[],
  constraints?: FlightConstraints
): FlightOption[] {
  if (!constraints) return flights;

  return flights.filter((flight) => {
    if (constraints.max_price != null && flight.price != null && flight.price > constraints.max_price) {
      return false;
    }
    if (constraints.max_stops != null && flight.stops != null && flight.stops > constraints.max_stops) {
      return false;
    }
    if (
      constraints.max_duration_minutes != null &&
      flight.duration_minutes != null &&
      flight.duration_minutes > constraints.max_duration_minutes
    ) {
      return false;
    }
    if (constraints.avoid_airlines?.length && flight.carriers?.length) {
      const avoid = constraints.avoid_airlines.map((x) => x.toLowerCase());
      const carriers = flight.carriers.map((x) => x.toLowerCase());
      if (carriers.some((carrier) => avoid.some((blocked) => carrier.includes(blocked)))) {
        return false;
      }
    }
    return true;
  });
}

function errorResponse(supplier: string, error: unknown): ToolResponse {
  const { code, message, status } = toErrorPayload(error);
  return jsonToolResponse(
    {
      status: "failed",
      supplier,
      error: { code, message, ...(status != null ? { http_status: status } : {}) },
      results: []
    },
    true
  );
}

function jsonToolResponse(payload: unknown, isError = false): ToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {})
  };
}
