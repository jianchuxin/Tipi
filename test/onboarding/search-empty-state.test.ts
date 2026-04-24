import assert from "node:assert/strict";
import test from "node:test";
import { getSearchEmptyState } from "../../src/lib/onboarding/search-empty-state.ts";

test("empty state guides first-time users to sync history", () => {
  const state = getSearchEmptyState({
    indexedCount: 0,
    shortcutLabel: "Alt + K"
  });

  assert.equal(state.title, "No history indexed yet.");
  assert.deepEqual(state.steps, [
    "Open Settings and run Sync History to get started.",
    "After syncing, press Alt + K from regular webpages.",
    "Search by title, domain, URL, or environment."
  ]);
});

test("empty state gives search examples when history is indexed", () => {
  const state = getSearchEmptyState({
    indexedCount: 2481,
    shortcutLabel: "Option + K"
  });

  assert.equal(state.title, "Start with a page you remember.");
  assert.deepEqual(state.steps, [
    "Try a title, domain, URL, or environment.",
    "Examples: github, jira, docs, abtest live.",
    "Press Option + K to open Tipi from regular webpages."
  ]);
});
