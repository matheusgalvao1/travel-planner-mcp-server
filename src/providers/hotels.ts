import { isMockMode } from "../config.js";
import { serpapiSearch } from "./serpapi.js";
import { mockGoogleHotels } from "../mocks.js";

const SUPPLIER = "google_hotels";

export type HotelsSearchInput = {
  destination: string;
  check_in: string;
  check_out: string;
  guests: {
    adults: number;
    children?: number;
  };
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  constraints?: {
    min_rating?: number;
    stars?: number[];
    free_cancellation?: boolean;
    vacation_rentals?: boolean;
  };
  currency: string;
  market: string;
  locale: string;
  result_limit: number;
};

export async function searchHotels(input: HotelsSearchInput): Promise<unknown> {
  if (isMockMode()) {
    return mockGoogleHotels(input);
  }

  /**
   * SerpApi Google Hotels. `q` takes free destination text (city, region,
   * neighborhood, or a specific property name). Only filters Google Hotels
   * actually supports are mapped; unsupported preferences are left to the LLM
   * to weigh over the normalized results.
   */
  const params: Record<string, unknown> = {
    q: input.destination,
    check_in_date: input.check_in,
    check_out_date: input.check_out,
    adults: input.guests.adults,
    children: input.guests.children,
    children_ages: input.guests.children
      ? Array.from({ length: input.guests.children }, () => 8).join(",")
      : undefined,
    currency: input.budget?.currency ?? input.currency,
    gl: input.market.toLowerCase(),
    hl: input.locale.toLowerCase(),
    min_price: input.budget?.min,
    max_price: input.budget?.max,
    rating: mapRating(input.constraints?.min_rating),
    hotel_class: input.constraints?.stars?.join(","),
    free_cancellation: input.constraints?.free_cancellation,
    vacation_rentals: input.constraints?.vacation_rentals
  };

  return serpapiSearch("google_hotels", params, SUPPLIER);
}

/**
 * SerpApi `rating`: 7 = 3.5+, 8 = 4.0+, 9 = 4.5+ (Google ratings are 0-5).
 */
function mapRating(minRating?: number): number | undefined {
  if (minRating == null) return undefined;
  if (minRating >= 4.5) return 9;
  if (minRating >= 4) return 8;
  if (minRating >= 3.5) return 7;
  return undefined;
}
