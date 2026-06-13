export type HotelOption = {
  id?: string;
  name: string;
  supplier: "google_hotels";
  type?: string;
  total_price?: number;
  nightly_price?: number;
  currency?: string;
  rating?: number;
  review_count?: number;
  stars?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  breakfast_included?: boolean;
  booking_url?: string;
  raw?: unknown;
};

/**
 * Normalizes a SerpApi Google Hotels response. Listings live in `properties[]`;
 * formatted prices are strings (e.g. "$347") while `extracted_*` fields are
 * numbers, so we read the extracted numbers. `overall_rating` is on a 0-5 scale.
 *
 * @param fallbackCurrency the requested currency (the response prices are in
 *   that currency).
 */
export function normalizeGoogleHotels(
  raw: unknown,
  limit: number,
  fallbackCurrency?: string
): HotelOption[] {
  const data = raw as any;

  const candidates: any[] = Array.isArray(data?.properties) ? data.properties : [];
  const currency = data?.search_parameters?.currency ?? fallbackCurrency;

  return candidates.slice(0, limit).map((item: any): HotelOption => {
    const amenities = Array.isArray(item?.amenities)
      ? item.amenities.filter(Boolean).map(String)
      : undefined;

    return {
      id: item?.property_token ? String(item.property_token) : undefined,
      name: String(item?.name ?? "Unknown property"),
      supplier: "google_hotels",
      type: item?.type,
      total_price: numberOrUndefined(item?.total_rate?.extracted_lowest),
      nightly_price: numberOrUndefined(item?.rate_per_night?.extracted_lowest),
      currency,
      rating: numberOrUndefined(item?.overall_rating),
      review_count: numberOrUndefined(item?.reviews),
      stars: numberOrUndefined(item?.extracted_hotel_class),
      address: item?.address,
      latitude: numberOrUndefined(item?.gps_coordinates?.latitude),
      longitude: numberOrUndefined(item?.gps_coordinates?.longitude),
      amenities,
      breakfast_included: amenities ? hasBreakfast(amenities) : undefined,
      booking_url: item?.link ?? item?.serpapi_property_details_link,
      raw: item
    };
  });
}

function hasBreakfast(amenities: string[]): boolean | undefined {
  const match = amenities.some((a) => /breakfast/i.test(a));
  return match ? true : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
