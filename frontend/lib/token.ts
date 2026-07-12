const TOKEN_KEY = "shambalens.owner-token.v1";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const token = generateToken();
  window.localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function clearOwnerTokenForTesting(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}
