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
