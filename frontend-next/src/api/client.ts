import { clearAccessToken, getAccessToken, setAccessToken } from "@/auth/storage";
import { getApiBaseUrl, getApiTimeoutMs } from "@/lib/config";

import { ApiError } from "./errors";
import type { ApiEnvelope, QueryParamValue } from "./types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  params?: object;
  headers?: HeadersInit;
  signal?: AbortSignal;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
}

let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

function buildUrl(path: string, params?: object): string {
  const baseUrl = getApiBaseUrl();
  const rawUrl = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const runtimeBase =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:3000";
  const url = new URL(rawUrl, runtimeBase);

  if (params) {
    Object.entries(params as Record<string, QueryParamValue>).forEach(
      ([key, value]) => {
        if (value === undefined || value === null || value === "") {
          return;
        }

        url.searchParams.set(key, String(value));
      },
    );
  }

  return url.toString();
}

function toApiError(payload: unknown, statusCode: number): ApiError {
  if (
    payload &&
    typeof payload === "object" &&
    "status" in payload &&
    (payload as { status?: unknown }).status === "error"
  ) {
    const errorPayload = payload as {
      message?: string;
      errors?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };

    return new ApiError({
      message: errorPayload.message ?? "Request failed.",
      statusCode,
      errors: errorPayload.errors,
      data: errorPayload.data,
    });
  }

  return new ApiError({
    message: statusCode >= 500 ? "Server request failed." : "Request failed.",
    statusCode,
  });
}

function notifyUnauthorized() {
  clearAccessToken();
  unauthorizedHandler?.();
}

async function parsePayload(response: Response): Promise<unknown> {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new ApiError({
      message: "Received an invalid JSON response from the server.",
      statusCode: response.status || 500,
    });
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const payload = await request<{ access: string }>(
        "/api/auth/token/refresh/",
        {
          method: "POST",
          auth: false,
          retryOnUnauthorized: false,
        },
      );

      setAccessToken(payload.access);
      return payload.access;
    } catch {
      notifyUnauthorized();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function request<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    params,
    headers,
    signal,
    auth = true,
    retryOnUnauthorized = true,
    timeoutMs = getApiTimeoutMs(),
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Request timeout"), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }

  const requestHeaders = new Headers(headers);
  const accessToken = auth ? getAccessToken() : null;

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: "include",
    });

    const payload = await parsePayload(response);
    if (response.ok) {
      const envelope = payload as ApiEnvelope<TResponse>;
      if (envelope && envelope.status === "success") {
        return envelope.data;
      }

      throw new ApiError({
        message: "The server returned an unexpected success payload.",
        statusCode: response.status,
      });
    }

    if (response.status === 401 && auth && retryOnUnauthorized) {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return request<TResponse, TBody>(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      }
    }

    throw toApiError(payload, response.status);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError({
        message: "The request timed out before the server responded.",
        statusCode: 408,
      });
    }

    throw new ApiError({
      message: "Unable to reach the backend API.",
      statusCode: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get<TResponse>(path: string, options?: Omit<RequestOptions<never>, "method" | "body">) {
    return request<TResponse>(path, {
      ...options,
      method: "GET",
    });
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) {
    return request<TResponse, TBody>(path, {
      ...options,
      method: "POST",
      body,
    });
  },
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) {
    return request<TResponse, TBody>(path, {
      ...options,
      method: "PUT",
      body,
    });
  },
  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) {
    return request<TResponse, TBody>(path, {
      ...options,
      method: "PATCH",
      body,
    });
  },
};
