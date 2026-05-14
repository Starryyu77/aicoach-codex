import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

async function runCli(args) {
  return execFileAsync(process.execPath, ["src/cli.mjs", ...args], {
    cwd: process.cwd()
  });
}

test("CLI --help prints command help instead of parsing it as training input", async () => {
  const { stdout } = await runCli(["--help"]);
  assert.match(stdout, /Road to Summer CLI/);
  assert.match(stdout, /npm run dx:smoke/);
  assert.doesNotMatch(stdout, /Parsed Event/);
});

test("CLI examples prints common training prompts", async () => {
  const { stdout } = await runCli(["examples"]);
  assert.match(stdout, /Training request/);
  assert.match(stdout, /高位下拉和绳索划船有人了/);
});

test("CLI doctor checks local prerequisites", async () => {
  const { stdout } = await runCli(["doctor"]);
  assert.match(stdout, /Road to Summer CLI doctor/);
  assert.match(stdout, /Parser smoke/);
  assert.match(stdout, /npm run dx:smoke/);
});
