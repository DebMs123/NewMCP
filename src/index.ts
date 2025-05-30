import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const server = new McpServer({
  name: "powerMCP",
  description: "A server that calls power automate",
  version: "1.0.0",
  tools: [
    {
      name: "get-power-automate",
      description: "Get Power Automate",
      parameters: {}
    },
  ],
  });

// Get Power Automate tool
const getPowerAutomate = server.tool(
  "get-power-automate",
  "Get Power Automate",
  async () => {
    const response = await fetch(
      "https://prod-175.westus.logic.azure.com:443/workflows/ef240e9705ca470c9102158cc9f00f09/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=QvEO0KDDeDSkmMd5Juog-f54qJ7TZubYij8TnNlJ-6s"
    );
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: data,
        },
      ],
    };
  }
);
const app = express();

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get("/sse", async (req: Request, res: Response) => {
  // Get the full URI from the request
  const host = req.get("host");

  const fullUri = `https://${host}/jokes`;
  const transport = new SSEServerTransport(fullUri, res);

  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/jokes", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.get("/", (_req, res) => {
  res.send("The Jokes MCP server is running!");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
