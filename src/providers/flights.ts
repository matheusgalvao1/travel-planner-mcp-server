import { isMockMode } from "../config.js";
import { serpapiSearch } from "./serpapi.js";
import { mockGoogleFlights } from "../mocks.js";

const SUPPLIER = "google_flights";

export type FlightsSearchInput = {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabin: "economy" | "premium_economy" | "business" | "first";
  constraints?: {
    max_price?: number;
    max_stops?: number;
    max_duration_minutes?: number;
    baggage_required?: boolean;
    preferred_airlines?: string[];
    avoid_airlines?: string[];
  };
  currency: string;
  market: string;
  locale: string;
  result_limit: number;
};

export async function searchFlights(input: FlightsSearchInput): Promise<unknown> {
  if (isMockMode()) {
    return mockGoogleFlights(input);
  }

  /**
   * SerpApi Google Flights. origin/destination are IATA codes (departure_id /
   * arrival_id also accept location kgmid). For round trips, the first response
   * returns outbound options priced at the full round-trip total; the return
   * itinerary is finalized via booking_token/the Google Flights URL.
   */
  const params: Record<string, unknown> = {
    departure_id: input.origin.toUpperCase(),
    arrival_id: input.destination.toUpperCase(),
    outbound_date: input.departure_date,
    return_date: input.return_date,
    type: input.return_date ? 1 : 2, // 1 = round trip, 2 = one way
    travel_class: mapCabin(input.cabin),
    adults: input.passengers.adults,
    children: input.passengers.children,
    infants_in_seat: input.passengers.infants,
    currency: input.currency,
    gl: input.market.toLowerCase(),
    hl: input.locale.toLowerCase(),
    stops: mapStops(input.constraints?.max_stops),
    max_price: input.constraints?.max_price
  };

  return serpapiSearch("google_flights", params, SUPPLIER);
}

function mapCabin(cabin: FlightsSearchInput["cabin"]): number {
  switch (cabin) {
    case "premium_economy":
      return 2;
    case "business":
      return 3;
    case "first":
      return 4;
    case "economy":
    default:
      return 1;
  }
}

/**
 * SerpApi `stops`: 0 = any, 1 = nonstop, 2 = 1 stop or fewer, 3 = 2 stops or
 * fewer. We accept max_stops as a count, so add 1; >2 means "any" (omit).
 */
function mapStops(maxStops?: number): number | undefined {
  if (maxStops == null || maxStops < 0 || maxStops > 2) return undefined;
  return maxStops + 1;
}
