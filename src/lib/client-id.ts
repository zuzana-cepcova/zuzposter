// Anonymous per-browser identifier. Persists in localStorage.
// Used to identify the same player across reloads for role/admin checks.

const KEY = "zuzposter:client-id";
const NAME_KEY = "zuzposter:nickname";

function randomId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setNickname(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 24));
}
