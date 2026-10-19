import { parse } from 'yaml';

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Returns { data, body }. data is null when there is no parseable frontmatter.
export function parseFrontmatter(text) {
  const match = FENCE.exec(text);
  if (!match) return { data: null, body: text };
  try {
    const data = parse(match[1]);
    return { data: data && typeof data === 'object' ? data : null, body: text.slice(match[0].length) };
  } catch {
    return { data: null, body: text.slice(match[0].length) };
  }
}
