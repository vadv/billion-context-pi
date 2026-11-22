import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

(globalThis as Record<string, unknown>).CURRENT_VERSION ??= "0.0.0-test";
const { createAcpExtension } = await import("../src/index.js");

test("context transform preserves custom_message entry timestamps", async () => {
  const dir = mkdtempSync(join(tmpdir(), "acp-custom-timestamp-"));
  const timestamp = "2026-11-22T19:11:07.019Z";
  const entries = [{
    type: "custom_message",
    id: "custom-1",
    parentId: null,
    timestamp,
    customType: "tool-search-hint",
    content: "tool_search update: browser_list_pages now active.",
    display: false,
  }];
  const handlers = new Map<string, Function>();
  const pi = {
    on(name: string, fn: Function) { handlers.set(name, fn); },
    registerTool() {}, registerCommand() {}, registerEntryRenderer() {}, appendEntry() {},
  };
  createAcpExtension({ autoUpdate: false })(pi as never);
  try {
    const context = handlers.get("context")!;
    const out = await context({ messages: [] }, {
      cwd: dir,
      model: { provider: "win_strata", id: "swift", api: "openai-completions", contextWindow: 131072, maxTokens: 16384 },
      hasUI: false,
      sessionManager: {
        getSessionId: () => "custom-timestamp-test",
        getSessionFile: () => join(dir, "session.jsonl"),
        buildContextEntries: () => entries,
      },
      getContextUsage: () => undefined,
      getSystemPrompt: () => "",
    });
    assert.equal(out.messages.length, 1);
    assert.equal(out.messages[0].role, "user");
    assert.equal(out.messages[0].timestamp, Date.parse(timestamp));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
