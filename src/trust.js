// Trust signals of a page, derived from its frontmatter (OKF v0.2, section 5).

// `verified` may be a list or, as OKF allows, a single { by, at } mapping.
export function verifiedList(data) {
  const v = data?.verified;
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter((e) => e && typeof e === 'object');
}

// unverified | machine-confirmed | human-reviewed
export function trustTier(data) {
  const list = verifiedList(data);
  if (!list.length) return 'unverified';
  return list.some((e) => String(e.by ?? '').startsWith('human:')) ? 'human-reviewed' : 'machine-confirmed';
}

// Returns the stale_after date when it has been reached, otherwise null.
export function staleSince(data, now) {
  if (data?.stale_after === undefined) return null;
  const due = new Date(String(data.stale_after));
  return !Number.isNaN(due.getTime()) && now >= due ? String(data.stale_after) : null;
}

export const countTodos = (body) => (body.match(/<!--\s*TODO/g) ?? []).length;
