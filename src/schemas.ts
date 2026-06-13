import { z } from "zod";

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? "BRL";
const DEFAULT_MARKET = process.env.DEFAULT_MARKET ?? "BR";
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE ?? "pt-BR";

export const PassengerSchema = z.object({
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).optional(),
  infants: z.number().int().min(0).optional()
});

export const SearchFlightsSchema = {
  origin: z.string().describe("Origin IATA airport/city code, e.g. GRU, SAO, JFK"),
  destination: z.string().describe("Destination IATA airport/city code, e.g. GIG, RIO, LIS"),
  departure_date: z.string().describe("YYYY-MM-DD"),
  return_date: z.string().optional().describe("YYYY-MM-DD for round trips; omit for one-way"),
  passengers: PassengerSchema.default({ adults: 1 }),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  constraints: z
    .object({
      max_price: z.number().optional(),
      max_stops: z.number().int().min(0).optional(),
      max_duration_minutes: z.number().int().positive().optional(),
      baggage_required: z.boolean().optional(),
      preferred_airlines: z.array(z.string()).optional(),
      avoid_airlines: z.array(z.string()).optional()
    })
    .optional(),
  currency: z.string().default(DEFAULT_CURRENCY),
  market: z.string().default(DEFAULT_MARKET).describe("Country code (Google `gl`), e.g. BR, US"),
  locale: z.string().default(DEFAULT_LOCALE).describe("Language code (Google `hl`), e.g. pt-BR, en"),
  result_limit: z.number().int().min(1).max(50).default(10)
};

export const SearchHotelsSchema = {
  destination: z.string().describe("Free-text destination: city, region, neighborhood, or property name"),
  check_in: z.string().describe("YYYY-MM-DD"),
  check_out: z.string().describe("YYYY-MM-DD"),
  guests: z
    .object({
      adults: z.number().int().min(1).default(1),
      children: z.number().int().min(0).optional()
    })
    .default({ adults: 1 }),
  budget: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default(DEFAULT_CURRENCY)
    })
    .optional(),
  constraints: z
    .object({
      min_rating: z.number().min(0).max(5).optional().describe("Minimum Google rating, 0-5"),
      stars: z.array(z.number().int().min(2).max(5)).optional().describe("Hotel class filter (2-5)"),
      free_cancellation: z.boolean().optional(),
      vacation_rentals: z.boolean().optional().describe("Search vacation rentals instead of hotels")
    })
    .optional(),
  currency: z.string().default(DEFAULT_CURRENCY),
  market: z.string().default(DEFAULT_MARKET).describe("Country code (Google `gl`), e.g. BR, US"),
  locale: z.string().default(DEFAULT_LOCALE).describe("Language code (Google `hl`), e.g. pt-BR, en"),
  result_limit: z.number().int().min(1).max(50).default(10)
};
