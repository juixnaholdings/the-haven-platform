export class ApiError extends Error {
  statusCode: number;
  errors: Record<string, unknown>;
  data: Record<string, unknown>;

  constructor({
    message,
    statusCode,
    errors = {},
    data = {},
  }: {
    message: string;
    statusCode: number;
    errors?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = data;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function collectMessages(value: unknown, messages: string[]) {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectMessages(item, messages));
    return;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectMessages(item, messages));
    return;
  }

  messages.push(String(value));
}

export function formatApiErrors(error: unknown): string[] {
  if (!isApiError(error)) {
    return [];
  }

  const messages: string[] = [];
  collectMessages(error.errors, messages);
  return messages;
}
