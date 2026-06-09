import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Global cache to avoid respawning the server multiple times in dev
let globalMcpClient: Client | null = null;

export async function getMcpClient() {
  if (globalMcpClient) return globalMcpClient;

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-mongodb", process.env.MONGODB_URI as string]
  });

  const client = new Client({
    name: "oblivion-rtbf-agent",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  globalMcpClient = client;
  
  return client;
}
