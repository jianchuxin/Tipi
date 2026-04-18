export function normalizeText(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[%+]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrlForSearch(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const pathname = safeDecodeURIComponent(parsed.pathname);
    const search = safeDecodeURIComponent(parsed.search);
    const hash = safeDecodeURIComponent(parsed.hash);

    return normalizeText(`${hostname} ${pathname} ${search} ${hash}`);
  } catch {
    return normalizeText(value);
  }
}

export function tokenizeText(value: string) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

export function hashUrl(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
