# Travel Planner MCP Server

Minimal TypeScript MCP server for a personal travel-planning agent.

Agent-visible tools:

- `search_flights` — real flight options from **Google Flights** (via SerpApi)
- `search_hotels` — real hotel/rental options from **Google Hotels** (via SerpApi)

Web search is intentionally excluded so it can be handled by your LLM provider's
built-in web/search tool. The intended flow:

```text
User
  -> LLM travel agent
    -> built-in web search for destination facts
    -> travel-planner.search_flights for real flight options
    -> travel-planner.search_hotels for real hotel options
  -> LLM compares tradeoffs and produces the recommendation
```

## Design

```text
Adapter (src/providers)    = talks to SerpApi
Normalizer (src/normalizers) = translates SerpApi response into our product shape
LLM                        = reasons over our product shape
```

A single SerpApi key powers both engines. The server is a thin wrapper: no
booking, payments, itineraries, ranking, or post-booking support — the LLM
composes the plan from the structured results.

## Install

```bash
npm install
```

## Run in mock mode (no API key needed)

```bash
npm run mock        # TRAVEL_MCP_MOCK=1, returns realistic mock data
```

## Develop / build (live)

```bash
cp .env.example .env   # set SERPAPI_API_KEY
npm run dev            # tsx, live
npm run build && npm start
```

## Test

```bash
npm test               # input validation, normalizers, provider errors, tool shapes
```

## MCP client config example

```json
{
  "mcpServers": {
    "travel-planner": {
      "command": "node",
      "args": ["/absolute/path/to/travel-planner-mcp/build/index.js"],
      "env": {
        "SERPAPI_API_KEY": "your_serpapi_key",
        "DEFAULT_CURRENCY": "BRL",
        "DEFAULT_MARKET": "BR",
        "DEFAULT_LOCALE": "pt-BR"
      }
    }
  }
}
```

Set `TRAVEL_MCP_MOCK=1` in `env` to run the client against mock data.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SERPAPI_API_KEY` | live mode | SerpApi key for both engines |
| `SERPAPI_BASE_URL` | no | defaults to `https://serpapi.com/search.json` |
| `DEFAULT_CURRENCY` | no | e.g. `BRL`, `USD` |
| `DEFAULT_MARKET` | no | Google `gl` country code, e.g. `BR` |
| `DEFAULT_LOCALE` | no | Google `hl` language code, e.g. `pt-BR` |
| `REQUEST_TIMEOUT_MS` | no | supplier call timeout, default `15000` |
| `TRAVEL_MCP_MOCK` | no | `1` to use mock data instead of SerpApi |

## Notes

Supplier-specific request building is isolated in `src/providers/*`
(`serpapi.ts` is the shared client), and SerpApi → product-shape mapping lives in
`src/normalizers/*`. Flight/hotel result shapes are `FlightOption` / `HotelOption`.
