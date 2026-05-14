const gatewayUrl = (process.env.GATEWAY_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000/training";
const minNodeMajor = Number(process.env.RTS_MIN_NODE_MAJOR || 25);
const timeoutMs = Number(process.env.RTS_DX_TIMEOUT_MS || 5000);
const chatTimeoutMs = Number(process.env.RTS_DX_CHAT_TIMEOUT_MS || 120000);

const results = [];

function record(status, name, message, fix = "") {
  results.push({ status, name, message, fix });
}

function statusIcon(status) {
  if (status === "pass") return "PASS";
  if (status === "warn") return "WARN";
  return "FAIL";
}

async function fetchJson(url, options = {}, timeout = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= minNodeMajor) {
    record("pass", "Node", `node ${process.version} satisfies >=${minNodeMajor}.`);
    return;
  }
  record(
    "fail",
    "Node",
    `node ${process.version} is below >=${minNodeMajor}.`,
    "Install Node 25+ or run with the same Node version used by the Gateway."
  );
}

async function checkGateway() {
  try {
    const { response } = await fetchJson(`${gatewayUrl}/session/current`);
    if (response.ok) {
      record("pass", "Gateway", `${gatewayUrl} responded to /session/current.`);
      return true;
    }
    record("fail", "Gateway", `${gatewayUrl}/session/current returned HTTP ${response.status}.`, "Restart with npm run gateway.");
  } catch (error) {
    record(
      "fail",
      "Gateway",
      `Cannot reach ${gatewayUrl}: ${error instanceof Error ? error.message : String(error)}.`,
      "Start it in another terminal with npm run gateway."
    );
  }
  return false;
}

async function checkFrontend() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(frontendUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      record("pass", "Frontend", `${frontendUrl} returned HTTP ${response.status}.`);
      return;
    }
    record("fail", "Frontend", `${frontendUrl} returned HTTP ${response.status}.`, "Start it with npm run dev --prefix road-to-summer/frontend.");
  } catch (error) {
    record(
      "fail",
      "Frontend",
      `Cannot reach ${frontendUrl}: ${error instanceof Error ? error.message : String(error)}.`,
      "Start it with npm run dev --prefix road-to-summer/frontend."
    );
  }
}

async function checkProviders(gatewayReady) {
  if (!gatewayReady) {
    record("fail", "Providers", "Skipped because Gateway is not reachable.", "Start Gateway, then rerun npm run dx:smoke.");
    return;
  }
  try {
    const { response, body } = await fetchJson(`${gatewayUrl}/providers`);
    if (!response.ok || !body?.providers) {
      record("fail", "Providers", `/providers returned HTTP ${response.status}.`, "Open /settings after Gateway starts.");
      return;
    }
    const active = Object.entries(body.providers)
      .map(([category, config]) => `${category}:${config.active || "none"}`)
      .join(", ");
    const serialized = JSON.stringify(body);
    if (/sk-[A-Za-z0-9_-]{8,}|api[_-]?key["']?\s*:\s*["'][^"']+/i.test(serialized)) {
      record("fail", "Providers", "Public provider config appears to expose a secret.", "Check ProviderConfigStore.getPublicConfig.");
      return;
    }
    record("pass", "Providers", `Active providers: ${active}. No plaintext API key in public config.`);
  } catch (error) {
    record("fail", "Providers", `Provider check failed: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

async function checkRealChat(gatewayReady) {
  if (!gatewayReady) {
    record("fail", "Real /chat", "Skipped because Gateway is not reachable.", "Start Gateway, then rerun npm run dx:smoke.");
    return;
  }
  try {
    const { response, body } = await fetchJson(`${gatewayUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "太轻了",
        source: "text",
        timezone: "Asia/Singapore"
      })
    }, chatTimeoutMs);
    if (response.ok && body?.hermes_output?.type === "plan_patch" && body?.ui?.agent_ui) {
      record("pass", "Real /chat", "Gateway called the active real Hermes provider and returned structured plan_patch + agent_ui.");
      return;
    }
    record("fail", "Real /chat", `/chat returned HTTP ${response.status} with type ${body?.hermes_output?.type || "missing"}.`, "Check active Hermes provider and output_contract compliance.");
  } catch (error) {
    record("fail", "Real /chat", `Real chat failed: ${error instanceof Error ? error.message : String(error)}.`, "Check Hermes server, model key, and Gateway logs.");
  }
}

await checkNode();
const gatewayReady = await checkGateway();
await checkFrontend();
await checkProviders(gatewayReady);
await checkRealChat(gatewayReady);

console.log("\nRoad to Summer DX Smoke");
console.log("=======================\n");
for (const result of results) {
  console.log(`${statusIcon(result.status)} ${result.name}: ${result.message}`);
  if (result.fix) console.log(`     Fix: ${result.fix}`);
}

const failed = results.filter((result) => result.status === "fail");
const warned = results.filter((result) => result.status === "warn");
console.log(`\nSummary: ${results.length - failed.length - warned.length} passed, ${warned.length} warnings, ${failed.length} failed.`);

if (failed.length) process.exit(1);
