#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { SearchFlightsSchema, SearchHotelsSchema } from "./schemas.js";
import { searchFlightsTool, searchHotelsTool } from "./tools.js";
import { isMockMode } from "./config.js";

const server = new McpServer({
  name: "travel-planner",
  version: "0.1.0"
});

server.registerTool(
  "search_hotels",
  {
    description:
      "Search real hotel/accommodation options from Google Hotels (via SerpApi). Use this for hotel inventory, nightly/total prices, ratings, hotel class, amenities, coordinates, and booking links. Only recommend hotels returned by this tool; do not invent hotels.",
    inputSchema: SearchHotelsSchema
  },
  async (input) => searchHotelsTool(input)
);

server.registerTool(
  "search_flights",
  {
    description:
      "Search real flight options from Google Flights (via SerpApi). Use this for flight inventory, prices, carriers, durations, stops, and booking links. Only recommend flights returned by this tool; do not invent flights.",
    inputSchema: SearchFlightsSchema
  },
  async (input) => searchFlightsTool(input)
);

async function main() {
  /**
   * STDIO MCP servers must keep stdout clean for JSON-RPC. All logging goes to
   * stderr.
   */
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`travel-planner-mcp running on stdio (mode: ${isMockMode() ? "mock" : "live"})`);
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
