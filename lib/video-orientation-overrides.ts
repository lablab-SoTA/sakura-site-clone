const LANDSCAPE_TITLE_KEYWORDS = [
  "この変態っ！",
  "み、見たでしょ？",
];

function normalizeTitle(raw: string): string {
  return raw.trim();
}

export function shouldForceLandscapeByTitle(title: string | null | undefined): boolean {
  if (!title) {
    return false;
  }
  const normalized = normalizeTitle(title);
  if (normalized.length === 0) {
    return false;
  }
  return LANDSCAPE_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
