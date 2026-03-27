const DEFAULT_API_BASE_URL = "http://localhost:8000";

export function getApiBaseUrl() {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return rawBaseUrl.replace(/\/+$/, "");
}

export function getApiTimeoutMs() {
  const rawTimeout = process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "10000";
  const parsed = Number(rawTimeout);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

export function getAppEnvironment() {
  return process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development";
}
