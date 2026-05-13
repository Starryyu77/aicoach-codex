import { createServer } from "node:http";
import { MockHermesClient } from "./hermes/HermesClient.ts";
import { handleChat } from "./routes/chat.ts";
import { handleVoiceTranscribe } from "./routes/voice.ts";
import { handleVisionAssess } from "./routes/vision.ts";
import { handleEndSession, handleGetCurrentSession, handleStartSession } from "./routes/session.ts";
import { handleHistoryDetail, handleHistoryList } from "./routes/history.ts";
import { handleMemoryConfirm, handleMemoryGet } from "./routes/memory.ts";
import type { GatewayContext } from "./routes/types.ts";

async function readBody(request: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(response: any, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

export function createGatewayServer(context: GatewayContext = { hermesClient: new MockHermesClient() }) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      const method = request.method || "GET";

      if (method === "POST" && url.pathname === "/chat") return send(response, 200, await handleChat(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/voice/transcribe") return send(response, 200, await handleVoiceTranscribe(await readBody(request)));
      if (method === "POST" && url.pathname === "/vision/assess") return send(response, 200, await handleVisionAssess(context, await readBody(request)));
      if (method === "GET" && url.pathname === "/session/current") return send(response, 200, await handleGetCurrentSession(context));
      if (method === "POST" && url.pathname === "/session/start") return send(response, 200, await handleStartSession(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/session/end") return send(response, 200, await handleEndSession(context));
      if (method === "GET" && url.pathname === "/history") return send(response, 200, await handleHistoryList(context));
      if (method === "GET" && url.pathname.startsWith("/history/")) return send(response, 200, await handleHistoryDetail(context, url.pathname.split("/").at(-1) || ""));
      if (method === "GET" && url.pathname === "/memory") return send(response, 200, await handleMemoryGet(context));
      if (method === "POST" && url.pathname === "/memory/confirm") return send(response, 200, await handleMemoryConfirm(context, await readBody(request)));

      return send(response, 404, { error: "not_found" });
    } catch (error) {
      return send(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 8787);
  createGatewayServer().listen(port, () => {
    console.log(`Road to Summer Gateway listening on http://127.0.0.1:${port}`);
  });
}

