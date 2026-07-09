// Local history of spaces the user has visited.
// Persisted in localStorage, per-browser.

const KEY = "zuzposter:space-history";

export type SpaceHistoryEntry = {
  code: string;
  roomId: string;
  nickname: string;
  lastVisited: string; // ISO
};

function read(): SpaceHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) => e && typeof e.code === "string" && typeof e.roomId === "string",
    );
  } catch {
    return [];
  }
}

function write(entries: SpaceHistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getSpaceHistory(): SpaceHistoryEntry[] {
  return read().sort(
    (a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime(),
  );
}

export function rememberSpace(entry: Omit<SpaceHistoryEntry, "lastVisited">) {
  const list = read().filter((e) => e.code !== entry.code);
  list.unshift({ ...entry, lastVisited: new Date().toISOString() });
  write(list.slice(0, 30));
}

export function forgetSpace(code: string) {
  write(read().filter((e) => e.code !== code));
}

export function getSpaceNickname(code: string): string | null {
  const found = read().find((e) => e.code === code);
  return found?.nickname ?? null;
}
