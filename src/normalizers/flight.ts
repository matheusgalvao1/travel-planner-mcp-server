export type FlightOption = {
  id?: string;
  supplier: "google_flights";
  price?: number;
  currency?: string;
  duration_minutes?: number;
  stops?: number;
  outbound?: FlightLeg;
  inbound?: FlightLeg;
  carriers?: string[];
  booking_url?: string;
  raw?: unknown;
};

export type FlightLeg = {
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
  stops?: number;
};

/**
 * Normalizes a SerpApi Google Flights response. The response splits options
 * into `best_flights` and `other_flights`; each option's `flights[]` are the
 * individual segments of one direction with `layovers[]` between them.
 *
 * For round trips, this first response returns outbound options at the full
 * round-trip `price`; the specific return itinerary is selected at booking time
 * via the Google Flights URL, so we expose the outbound leg and the total price.
 *
 * @param fallbackCurrency the requested currency (the response price is a plain
 *   number in that currency).
 */
export function normalizeGoogleFlights(
  raw: unknown,
  limit: number,
  fallbackCurrency?: string
): FlightOption[] {
  const data = raw as any;

  const candidates: any[] = [
    ...(Array.isArray(data?.best_flights) ? data.best_flights : []),
    ...(Array.isArray(data?.other_flights) ? data.other_flights : [])
  ];

  const currency = data?.search_parameters?.currency ?? fallbackCurrency;
  const bookingUrl = data?.search_metadata?.google_flights_url;

  return candidates.slice(0, limit).map((item: any, index: number): FlightOption => {
    const segments: any[] = Array.isArray(item?.flights) ? item.flights : [];
    const layovers: any[] = Array.isArray(item?.layovers) ? item.layovers : [];

    return {
      id: String(item?.booking_token ?? item?.departure_token ?? index),
      supplier: "google_flights",
      price: numberOrUndefined(item?.price),
      currency,
      duration_minutes: numberOrUndefined(item?.total_duration) ?? sumSegmentDuration(segments),
      stops: layovers.length || Math.max(0, segments.length - 1),
      outbound: buildLeg(segments, layovers, numberOrUndefined(item?.total_duration)),
      // The return itinerary is finalized at booking; not present in this call.
      inbound: undefined,
      carriers: collectCarriers(segments),
      booking_url: bookingUrl,
      raw: item
    };
  });
}

function buildLeg(
  segments: any[],
  layovers: any[],
  totalDuration?: number
): FlightLeg | undefined {
  if (!segments.length) return undefined;
  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    origin: first?.departure_airport?.id ?? first?.departure_airport?.name,
    destination: last?.arrival_airport?.id ?? last?.arrival_airport?.name,
    departure_time: first?.departure_airport?.time,
    arrival_time: last?.arrival_airport?.time,
    duration_minutes: totalDuration ?? sumSegmentDuration(segments),
    stops: layovers.length || Math.max(0, segments.length - 1)
  };
}

function collectCarriers(segments: any[]): string[] | undefined {
  const names = segments.map((s) => s?.airline).filter(Boolean).map(String);
  return names.length ? [...new Set(names)] : undefined;
}

function sumSegmentDuration(segments: any[]): number | undefined {
  const durations = segments
    .map((s) => numberOrUndefined(s?.duration))
    .filter((v): v is number => v != null);
  return durations.length ? durations.reduce((a, b) => a + b, 0) : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
