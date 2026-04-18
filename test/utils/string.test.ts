import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeText,
  normalizeUrlForSearch,
  tokenizeText
} from "../../src/lib/utils/string.ts";

test("normalizeText removes protocol, www, punctuation, and diacritics", () => {
  assert.equal(
    normalizeText("https://www.Café-Archive.com/Brutalist_Patterns?mode=grid"),
    "cafe archive com brutalist patterns mode grid"
  );
});

test("normalizeUrlForSearch keeps meaningful hostname, path, query, and hash terms", () => {
  assert.equal(
    normalizeUrlForSearch(
      "https://www.example.com/design-system/Case-Study?view=Grid#Section-2"
    ),
    "example com design system case study view grid section 2"
  );
});

test("tokenizeText splits normalized query into stable tokens", () => {
  assert.deepEqual(tokenizeText("  Figma + Smith Residence  "), [
    "figma",
    "smith",
    "residence"
  ]);
});
