# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A deliberately thin **stdio MCP server** for an LLM travel-planning agent. It exposes exactly two tools — `search_flights` and `search_hotels` — backed by Google Flights and Google Hotels via **SerpApi**. The product principle: the agent may only recommend flights/hotels actually returned by these tools; everything else (destination facts, itinerary reasoning) is the LLM's own job via its built-in web search. Do **not** add tools for web search, booking, payments, cancellations, itineraries, ranking, or maps unless explicitly asked.

## Commands

```bash
npm run build      # tsc -> build/ (the MCP client runs build/index.js)
npm run dev        # run from TS via tsx (live, needs SERPAPI_API_KEY)
npm run mock       # TRAVEL_MCP_MOCK=1 + tsx — no API key needed
npm start          # node build/index.js
npm test           # all tests (node:test via tsx)

# Run a single test file:
node --import tsx --test test/normalizers.test.ts
# Run tests matching a name:
node --import tsx --test --test-name-pattern "milli" test/*.test.ts
```

There is no linter configured. After any source change, **`npm run build` is required** before the registered MCP server picks it up — clients launch the compiled `build/index.js`, not the TS source.

## Architecture

Strict three-layer separation — keep logic in the right layer:

```
src/index.ts      registers the two tools on McpServer, wires stdio transport
  -> src/tools.ts        orchestration: provider -> normalizer -> JSON tool response;
                         owns applyFlightConstraints() post-filtering and error shaping
    -> src/providers/    ADAPTERS: build the SerpApi request, talk to the network
    -> src/normalizers/  translate raw SerpApi JSON into FlightOption / HotelOption
```

- **Adapters** (`providers/`): `serpapi.ts` is the shared GET client (one `SERPAPI_API_KEY` powers both `engine=google_flights` and `engine=google_hotels`). `flights.ts` / `hotels.ts` map our input schema to SerpApi query params and own the supplier-specific quirks (cabin/stops/rating enum mappings, IATA codes, free-text hotel `q`). Each checks `isMockMode()` first.
- **Normalizers** (`normalizers/`): pure functions, no I/O. They must stay tolerant of missing/variant fields and always return the stable `FlightOption`/`HotelOption` shape (full raw payload preserved under `raw`). This is the contract the LLM reasons over — keep normalization minimal, don't invent a canonical ontology.
- **Cross-cutting**: `config.ts` (env access, `isMockMode`, defaults), `errors.ts` (single `TravelMcpError` with a `code`), `http.ts` (the only `fetch` call site — owns timeouts and turns HTTP/transport failures into `TravelMcpError`). `tools.ts` catches errors and returns a structured `{ status: "failed", error: { code, message, http_status } }` response with `isError: true` rather than throwing.

### Things that bite

- **`.env` is not auto-loaded.** Neither the server nor `npm run dev` reads `.env` on its own. Live credentials reach the server through the MCP client config's `env` block (see README). When testing providers, set `process.env` directly.
- **Mock mode** (`TRAVEL_MCP_MOCK=1`): `src/mocks.ts` returns payloads shaped like *raw SerpApi responses*, so mock and live both run through the same normalizers. When you change a normalizer, update the matching mock so tests exercise the real mapping.
- **SerpApi response shapes differ by engine**: Flights split results across `best_flights` + `other_flights` (segments under `flights[]`, total in `total_duration`); Hotels list under `properties[]` with `extracted_*` numeric prices (the non-`extracted_` ones are formatted strings — never parse those) and `overall_rating` on a **0–5** scale.
- **Round-trip flights**: the first SerpApi response returns outbound options priced at the full round-trip total; the return itinerary is finalized via the Google Flights URL. Normalizer therefore exposes only the outbound leg + total price; `inbound` stays undefined by design.
- **Currency**: SerpApi flight prices carry no currency code, so normalizers take a `fallbackCurrency` (the requested currency) — pass it through when calling them.

## Testing approach

Tests use Node's built-in runner (`node:test` + `node:assert`) executed through `tsx`, no extra framework. Coverage spans the four seams: input validation (Zod schemas), normalizers (fed via `mocks.ts`), provider error handling (stub `globalThis.fetch`, toggle `process.env`), and tool-response shape (call `searchFlightsTool`/`searchHotelsTool` in mock mode). Tests mutate `process.env` — restore it in `afterEach`.
