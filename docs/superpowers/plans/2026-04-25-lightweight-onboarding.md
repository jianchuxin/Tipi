# Lightweight Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight first-use and usage guidance so users understand syncing, shortcuts, searching, and restricted-page popup behavior without a full onboarding wizard.

**Architecture:** Keep onboarding as presentational UI and copy. Add one small pure helper for empty-state content so behavior is testable without React DOM tooling, reuse the existing `shortcutLabel`, `indexedCount`, and `handleSync` paths, and avoid new persistent state.

**Tech Stack:** WXT, React 19, TypeScript, Tailwind CSS utility classes, Node `node:test`.

---

## File Structure

- Create: `src/lib/onboarding/search-empty-state.ts`
  - Owns pure empty-state content selection for indexed and non-indexed states.
  - No browser APIs, no React dependency.

- Create: `test/onboarding/search-empty-state.test.ts`
  - Tests empty-state content for first-run and ready-to-search states.

- Modify: `src/components/SearchCommandCenter.tsx`
  - Replaces the generic "Start typing to search." block with a richer empty state using the helper output.
  - Reuses existing `shortcutLabel` and `indexedCount` props.

- Modify: `src/entrypoints/options/App.tsx`
  - Adds a local `GettingStartedCard` component above Data Overview.
  - Reuses existing `handleSync`, `isSyncing`, `shortcutLabel`, and `message`.

- Modify: `src/entrypoints/popup/App.tsx`
  - Adds restricted-page fallback copy to empty footer/helper text.

- Modify: `README.md`
  - Documents the first-use path and restricted-page fallback.

---

## Task 1: Add Testable Empty-State Content

**Files:**
- Create: `src/lib/onboarding/search-empty-state.ts`
- Create: `test/onboarding/search-empty-state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/onboarding/search-empty-state.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npm test
```

Expected result:

```text
ERR_MODULE_NOT_FOUND
```

The failure should point to `src/lib/onboarding/search-empty-state.ts`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/onboarding/search-empty-state.ts`:

```ts
export type SearchEmptyState = {
  title: string;
  steps: string[];
};

export function getSearchEmptyState({
  indexedCount,
  shortcutLabel
}: {
  indexedCount: number;
  shortcutLabel: string;
}): SearchEmptyState {
  if (indexedCount <= 0) {
    return {
      title: "No history indexed yet.",
      steps: [
        "Open Settings and run Sync History to get started.",
        `After syncing, press ${shortcutLabel} from regular webpages.`,
        "Search by title, domain, URL, or environment."
      ]
    };
  }

  return {
    title: "Start with a page you remember.",
    steps: [
      "Try a title, domain, URL, or environment.",
      "Examples: github, jira, docs, abtest live.",
      `Press ${shortcutLabel} to open Tipi from regular webpages.`
    ]
  };
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npm test
```

Expected result:

```text
# fail 0
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/onboarding/search-empty-state.ts test/onboarding/search-empty-state.test.ts
git commit -m "feat(onboarding): add search empty state copy"
```

---

## Task 2: Render the Rich Search Empty State

**Files:**
- Modify: `src/components/SearchCommandCenter.tsx`

- [ ] **Step 1: Add the helper import**

Modify imports in `src/components/SearchCommandCenter.tsx`:

```ts
import { getSearchEmptyState } from "@/lib/onboarding/search-empty-state";
```

- [ ] **Step 2: Derive empty-state content**

Inside `SearchCommandCenter`, after `shouldShowResultList`, add:

```ts
const emptyState = getSearchEmptyState({
  indexedCount,
  shortcutLabel: shortcutLabel || "Alt + K"
});
```

- [ ] **Step 3: Replace the generic empty state**

Replace:

```tsx
<div className="flex h-full min-h-[180px] items-center justify-center px-[18px] py-[24px] text-center text-[13px] text-[color:var(--color-muted)]">
  Start typing to search.
</div>
```

with:

```tsx
<div className="flex h-full min-h-[180px] flex-col justify-center rounded-[18px] border border-dashed border-[color:var(--color-line)] bg-[rgba(255,255,255,0.34)] px-[18px] py-[22px] text-left">
  <p className="font-[var(--font-display)] text-[16px] font-bold tracking-[-0.03em] text-[color:var(--color-ink)]">
    {emptyState.title}
  </p>
  <div className="mt-[12px] space-y-[8px]">
    {emptyState.steps.map((step, index) => (
      <div
        className="flex items-start gap-[10px] text-[13px] leading-[20px] text-[color:var(--color-muted)]"
        key={step}
      >
        <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-low)] text-[10px] font-bold text-[color:var(--color-primary)]">
          {index + 1}
        </span>
        <span>{step}</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Run type check**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npx tsc -p tsconfig.json --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/SearchCommandCenter.tsx
git commit -m "feat(onboarding): show search empty state guidance"
```

---

## Task 3: Add Getting Started Card To Options

**Files:**
- Modify: `src/entrypoints/options/App.tsx`

- [ ] **Step 1: Add local card component**

In `src/entrypoints/options/App.tsx`, add this component near the existing local UI components:

```tsx
function GettingStartedCard({
  isSyncing,
  onSync,
  shortcutLabel
}: {
  isSyncing: boolean;
  onSync: () => void;
  shortcutLabel: string;
}) {
  const steps = [
    {
      label: "Sync History",
      description: "Build your local browsing journal before searching."
    },
    {
      label: `Press ${shortcutLabel}`,
      description: "Open Tipi from regular webpages without reaching for the toolbar."
    },
    {
      label: "Search and press Enter",
      description: "Jump back to the highlighted result with the keyboard."
    }
  ];

  return (
    <section className="journal-panel relative mt-12 overflow-hidden px-8 py-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-[color:var(--color-primary)]/80" />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--color-primary)]">
            Getting Started
          </p>
          <h2 className="mt-2 font-[var(--font-display)] text-[1.8rem] font-extrabold tracking-[-0.05em] text-[color:var(--color-ink)]">
            Three steps to make Tipi useful
          </h2>
          <p className="mt-3 max-w-2xl text-[1rem] leading-8 text-[color:var(--color-muted)]">
            Tipi works from your local browser history. Sync once, then use the
            shortcut to search and reopen pages.
          </p>
        </div>
        <button
          className="journal-button-primary inline-flex items-center justify-center gap-3 self-start px-6 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSyncing}
          onClick={onSync}
          type="button"
        >
          <CloudSyncIcon className="h-5 w-5" />
          {isSyncing ? "Syncing..." : "Sync History"}
        </button>
      </div>
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            className="rounded-[18px] border border-[color:var(--color-line)] bg-[rgba(255,255,255,0.58)] p-5"
            key={step.label}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface-low)] text-sm font-bold text-[color:var(--color-primary)]">
              {index + 1}
            </span>
            <h3 className="mt-4 font-[var(--font-display)] text-[1.05rem] font-bold tracking-[-0.03em] text-[color:var(--color-ink)]">
              {step.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
              {step.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Render the card before Data Overview**

In the `OptionsApp` JSX, after the `<header>` and before the Data Overview `<section>`, add:

```tsx
<GettingStartedCard
  isSyncing={isSyncing}
  onSync={() => {
    void handleSync();
  }}
  shortcutLabel={shortcutLabel}
/>
```

- [ ] **Step 3: Run type check**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npx tsc -p tsconfig.json --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/entrypoints/options/App.tsx
git commit -m "feat(onboarding): add getting started card"
```

---

## Task 4: Add Restricted-Page Guidance And README Updates

**Files:**
- Modify: `src/entrypoints/popup/App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Update popup footer copy**

In `src/entrypoints/popup/App.tsx`, replace the empty-query footer label:

```tsx
: "Results appear after you start typing."
```

with:

```tsx
: "Tipi may open as a separate window on browser-restricted pages."
```

Keep the query-present footer label unchanged:

```tsx
"Enter opens the highlighted entry."
```

- [ ] **Step 2: Update README first-use section**

In `README.md`, after the shortcut section and before "同步历史记录", add:

```md
首次使用建议按这个顺序：

1. 打开设置页
2. 点击 `Sync History`
3. 按 `Alt + K` / `Option + K` 打开 Tipi
4. 输入关键词并按 `Enter` 打开高亮结果
```

- [ ] **Step 3: Update README fallback troubleshooting**

In `README.md`, under "常见问题", add:

```md
### 4. 为什么有时是独立窗口，而不是网页内浮窗

在新标签页、`chrome://` 页面、扩展页面等浏览器受限页面中，Tipi 不能注入网页内浮窗，因此会自动打开独立窗口。这是浏览器限制下的正常 fallback 行为。
```

- [ ] **Step 4: Run type check**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npx tsc -p tsconfig.json --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/entrypoints/popup/App.tsx README.md
git commit -m "docs(onboarding): clarify first use and fallback"
```

---

## Task 5: Final Verification

**Files:**
- Verify all modified files from Tasks 1-4.

- [ ] **Step 1: Run full test suite**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npm test
```

Expected result:

```text
# fail 0
```

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npx tsc -p tsconfig.json --noEmit
```

Expected result: exit code `0`.

- [ ] **Step 3: Build Chrome extension**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npm run build
```

Expected result:

```text
✔ Finished
```

- [ ] **Step 4: Build Firefox extension**

Run:

```bash
PATH=/Users/chuxin.jian/.nvm/versions/node/v22.18.0/bin:$PATH npm run build:firefox
```

Expected result:

```text
✔ Finished
```

The existing Firefox `data_collection_permissions` warning is acceptable for this plan.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -5
```

Expected result:

```text
git status --short prints no output after all planned commits are created
```
