import type { AuthTokens } from "../domains/types";

const AUTH_STORAGE_KEY = "the-haven.auth.tokens";

let memoryTokens: AuthTokens | null = null;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredTokens(): AuthTokens | null {
  const storage = getLocalStorage();
  if (!storage) {
    return memoryTokens;
  }

  const rawValue = storage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AuthTokens>;
    if (!parsedValue.access || !parsedValue.refresh) {
      return null;
    }

    return {
      access: parsedValue.access,
      refresh: parsedValue.refresh,
    };
  } catch {
    return null;
  }
}

export function saveStoredTokens(tokens: AuthTokens) {
  memoryTokens = tokens;

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens() {
  memoryTokens = null;

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_STORAGE_KEY);
}
