import { createServer } from "node:http";
import { ProviderRegistry } from "./providers/ProviderRegistry.ts";
import { handleChat } from "./routes/chat.ts";
import { handleVoiceTranscribe } from "./routes/voice.ts";
import { handleVisionAssess } from "./routes/vision.ts";
import { handleEndSession, handleGetCurrentSession, handleStartSession } from "./routes/session.ts";
import { handleHistoryDelete, handleHistoryDetail, handleHistoryList, handleHistoryUpdate } from "./routes/history.ts";
import { handleMemoryConfirm, handleMemoryGet, handleMemoryRefresh } from "./routes/memory.ts";
import {
  handleHermesRuntimeGet,
  handleHermesRuntimePresetsGet,
  handleHermesRuntimeUpdate
} from "./routes/hermesRuntime.ts";
import {
  handleProviderCreateInstance,
  handleProviderDeleteInstance,
  handleProviderPresetsGet,
  handleProvidersGet,
  handleProviderSetActive,
  handleProviderTest,
  handleProviderUpdateInstance,
  parseProviderCategory
} from "./routes/providers.ts";
import type { GatewayContext } from "./routes/types.ts";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

function responseOrigin(origin?: string): string {
  return isAllowedOrigin(origin) && origin ? origin : DEFAULT_ALLOWED_ORIGINS[0];
}

function contentTypeOf(request: any) {
  const value = request.headers["content-type"];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function parseMultipart(buffer: Buffer, contentType: string): Record<string, unknown> {
  const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
  if (!boundary) throw new Error("Missing multipart boundary.");
  const body = buffer.toString("latin1");
  const result: Record<string, unknown> = {};
  for (const part of body.split(`--${boundary}`).slice(1, -1)) {
    const [rawHeaders, ...bodyParts] = part.split("\r\n\r\n");
    if (!rawHeaders || bodyParts.length === 0) continue;
    const headers = rawHeaders.trim();
    const rawPartBody = bodyParts.join("\r\n\r\n").replace(/\r\n$/, "");
    const name = headers.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const fileName = headers.match(/filename="([^"]*)"/)?.[1];
    const mimeType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1];
    if (fileName !== undefined) {
      result[name] = Buffer.from(rawPartBody, "latin1").toString("base64");
      if (name === "file" && !result.audio) result.audio = result[name];
      result.fileName = fileName || "audio.webm";
      result.mimeType = mimeType || "application/octet-stream";
    } else {
      result[name] = rawPartBody;
    }
  }
  return result;
}

async function readBody(request: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) return {};
  const contentType = contentTypeOf(request);
  if (contentType.includes("multipart/form-data")) return parseMultipart(buffer, contentType);
  const text = buffer.toString("utf8");
  if (contentType.includes("application/json") || text.trim().startsWith("{")) return JSON.parse(text);
  return { audio: text };
}

function send(request: any, response: any, status: number, body: unknown) {
  const origin = Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": responseOrigin(origin),
    "vary": "Origin",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  });
  response.end(JSON.stringify(body, null, 2));
}

export function createGatewayServer(context: GatewayContext = { providerRegistry: new ProviderRegistry() }) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      const method = request.method || "GET";
      const segments = url.pathname.split("/").filter(Boolean);

      const requestOrigin = Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin;
      if (!isAllowedOrigin(requestOrigin)) return send(request, response, 403, { error: "origin_not_allowed" });

      if (method === "OPTIONS") return send(request, response, 200, { ok: true });

      if (method === "POST" && url.pathname === "/chat") return send(request, response, 200, await handleChat(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/voice/transcribe") return send(request, response, 200, await handleVoiceTranscribe(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/vision/assess") return send(request, response, 200, await handleVisionAssess(context, await readBody(request)));
      if (method === "GET" && url.pathname === "/session/current") return send(request, response, 200, await handleGetCurrentSession(context));
      if (method === "POST" && url.pathname === "/session/start") return send(request, response, 200, await handleStartSession(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/session/end") return send(request, response, 200, await handleEndSession(context, await readBody(request)));
      if (method === "GET" && url.pathname === "/history") return send(request, response, 200, await handleHistoryList(context));
      if (method === "DELETE" && url.pathname.startsWith("/history/")) return send(request, response, 200, await handleHistoryDelete(context, url.pathname.split("/").at(-1) || ""));
      if (method === "PUT" && url.pathname.startsWith("/history/")) return send(request, response, 200, await handleHistoryUpdate(context, url.pathname.split("/").at(-1) || "", await readBody(request)));
      if (method === "GET" && url.pathname.startsWith("/history/")) return send(request, response, 200, await handleHistoryDetail(context, url.pathname.split("/").at(-1) || ""));
      if (method === "GET" && url.pathname === "/memory") return send(request, response, 200, await handleMemoryGet(context));
      if (method === "POST" && url.pathname === "/memory/refresh") return send(request, response, 200, await handleMemoryRefresh(context, await readBody(request)));
      if (method === "POST" && url.pathname === "/memory/confirm") return send(request, response, 200, await handleMemoryConfirm(context, await readBody(request)));
      if (method === "GET" && url.pathname === "/hermes-runtime") return send(request, response, 200, await handleHermesRuntimeGet(context));
      if (method === "PUT" && url.pathname === "/hermes-runtime") return send(request, response, 200, await handleHermesRuntimeUpdate(context, await readBody(request)));
      if (method === "GET" && url.pathname === "/hermes-runtime/presets") return send(request, response, 200, await handleHermesRuntimePresetsGet());
      if (method === "GET" && url.pathname === "/providers") return send(request, response, 200, await handleProvidersGet(context));
      if (method === "GET" && url.pathname === "/providers/presets") return send(request, response, 200, await handleProviderPresetsGet());
      if (segments[0] === "providers" && segments[1]) {
        const category = parseProviderCategory(segments[1]);
        if (method === "POST" && segments[2] === "test") return send(request, response, 200, await handleProviderTest(context, category, await readBody(request)));
        if (method === "PUT" && segments[2] === "active") return send(request, response, 200, await handleProviderSetActive(context, category, await readBody(request)));
        if (method === "POST" && segments[2] === "instances") return send(request, response, 200, await handleProviderCreateInstance(context, category, await readBody(request)));
        if (method === "PUT" && segments[2] === "instances" && segments[3]) {
          return send(request, response, 200, await handleProviderUpdateInstance(context, category, segments[3], await readBody(request)));
        }
        if (method === "DELETE" && segments[2] === "instances" && segments[3]) {
          return send(request, response, 200, await handleProviderDeleteInstance(context, category, segments[3]));
        }
      }

      return send(request, response, 404, { error: "not_found" });
    } catch (error) {
      return send(request, response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.GATEWAY_PORT || process.env.PORT || 8787);
  const host = process.env.HOST || "127.0.0.1";
  const server = createGatewayServer();
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Road to Summer Gateway could not start because http://${host}:${port} is already in use.`);
      console.error(`Check the existing service: curl http://${host}:${port}/session/current`);
      console.error("Stop the existing process, or start this Gateway on another port:");
      console.error(`  GATEWAY_PORT=${port + 1} npm run gateway`);
      process.exit(1);
    }
    console.error(`Road to Summer Gateway failed to start: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(`Road to Summer Gateway listening on http://${host}:${port}`);
  });
}
