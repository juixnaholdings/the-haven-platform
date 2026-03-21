type NodeEnv = Record<string, string | undefined>;

function getNodeEnv(): NodeEnv {
  const maybeProcess = (globalThis as { process?: { env?: NodeEnv } }).process;
  return maybeProcess?.env ?? {};
}

export function getApiBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  const nodeEnv = getNodeEnv();

  const rawBaseUrl =
    viteEnv?.VITE_API_BASE_URL ??
    nodeEnv.VITE_API_BASE_URL ??
    nodeEnv.FRONTEND_API_BASE_URL ??
    "";

  return rawBaseUrl.replace(/\/+$/, "");
}

export function getApiTimeoutMs(): number {
  const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  const nodeEnv = getNodeEnv();

  const rawTimeout =
    viteEnv?.VITE_API_TIMEOUT_MS ??
    nodeEnv.VITE_API_TIMEOUT_MS ??
    nodeEnv.FRONTEND_API_TIMEOUT_MS ??
    "10000";

  const timeoutMs = Number(rawTimeout);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000;
}
