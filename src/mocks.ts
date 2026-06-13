import type { FlightsSearchInput } from "./providers/flights.js";
import type { HotelsSearchInput } from "./providers/hotels.js";

/**
 * Fixtures that mimic the *raw* SerpApi payloads (not our normalized shape), so
 * mock mode flows through the exact same normalizers as live mode.
 * Enable with TRAVEL_MCP_MOCK=1.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Shaped like SerpApi engine=google_flights: best_flights[] + other_flights[]. */
export function mockGoogleFlights(input: FlightsSearchInput): unknown {
  const origin = input.origin.toUpperCase();
  const dest = input.destination.toUpperCase();
  const date = input.departure_date;

  const segment = (
    from: string,
    to: string,
    depHour: number,
    durationMin: number,
    airline: string,
    flightNumber: string
  ) => {
    const arrHour = depHour + Math.floor((durationMin + 5) / 60);
    const arrMin = (5 + durationMin) % 60;
    return {
      departure_airport: { name: `${from} Airport`, id: from, time: `${date} ${pad(depHour)}:05` },
      arrival_airport: { name: `${to} Airport`, id: to, time: `${date} ${pad(arrHour)}:${pad(arrMin)}` },
      duration: durationMin,
      airline,
      airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/mock.png",
      flight_number: flightNumber,
      travel_class: "Economy",
      airplane: "Airbus A320"
    };
  };

  const best_flights = [
    {
      flights: [segment(origin, dest, 8, 75, "LATAM Airlines", "LA 1234")],
      layovers: [],
      total_duration: 75,
      price: 1289,
      type: input.return_date ? "Round trip" : "One way",
      airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/LA.png",
      booking_token: "mock-booking-token-0",
      departure_token: "mock-departure-token-0"
    },
    {
      flights: [segment(origin, dest, 9, 80, "Azul", "AD 4321")],
      layovers: [],
      total_duration: 80,
      price: 1450,
      type: input.return_date ? "Round trip" : "One way",
      airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AD.png",
      booking_token: "mock-booking-token-1",
      departure_token: "mock-departure-token-1"
    }
  ];

  const other_flights = [
    {
      flights: [
        segment(origin, "CGH", 6, 70, "Gol", "G3 1100"),
        segment("CGH", dest, 9, 75, "Gol", "G3 1180")
      ],
      layovers: [{ duration: 65, name: "São Paulo Congonhas", id: "CGH" }],
      total_duration: 210,
      price: 989,
      type: input.return_date ? "Round trip" : "One way",
      airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/G3.png",
      booking_token: "mock-booking-token-2",
      departure_token: "mock-departure-token-2"
    }
  ];

  return {
    search_metadata: {
      status: "Success",
      google_flights_url: `https://www.google.com/travel/flights?q=mock-${origin}-${dest}`
    },
    search_parameters: {
      engine: "google_flights",
      departure_id: origin,
      arrival_id: dest,
      currency: input.currency
    },
    best_flights,
    other_flights
  };
}

/** Shaped like SerpApi engine=google_hotels: properties[]. */
export function mockGoogleHotels(input: HotelsSearchInput): unknown {
  const currency = input.budget?.currency ?? input.currency;
  const nights = nightsBetween(input.check_in, input.check_out);

  const seeds = [
    { name: "Copacabana Beachfront Hotel", nightly: 920, rating: 4.6, reviews: 4210, stars: 5, breakfast: true },
    { name: "Ipanema Garden Boutique", nightly: 640, rating: 4.4, reviews: 1870, stars: 4, breakfast: true },
    { name: "Centro Express Inn", nightly: 310, rating: 4.0, reviews: 980, stars: 3, breakfast: false }
  ];

  const properties = seeds.map((s, i) => {
    const total = s.nightly * nights;
    const amenities = ["Free Wi-Fi", "Pool", s.breakfast ? "Free breakfast" : "Restaurant", "Air conditioning"];
    return {
      type: "hotel",
      name: `${s.name} (${input.destination})`,
      link: `https://www.google.com/travel/hotels/mock-${i}`,
      property_token: `mock-property-token-${i}`,
      serpapi_property_details_link: `https://serpapi.com/search?engine=google_hotels_property_details&property_token=mock-${i}`,
      gps_coordinates: { latitude: -22.97 + i * 0.01, longitude: -43.18 - i * 0.01 },
      check_in_time: "3:00 PM",
      check_out_time: "12:00 PM",
      rate_per_night: { lowest: `${currency} ${s.nightly}`, extracted_lowest: s.nightly },
      total_rate: { lowest: `${currency} ${total}`, extracted_lowest: total },
      hotel_class: `${s.stars}-star hotel`,
      extracted_hotel_class: s.stars,
      overall_rating: s.rating,
      reviews: s.reviews,
      location_rating: 4.5,
      amenities,
      images: [{ thumbnail: "https://example.com/mock.jpg" }]
    };
  });

  return {
    search_parameters: {
      engine: "google_hotels",
      q: input.destination,
      currency
    },
    properties
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.round((b - a) / 86_400_000);
}
