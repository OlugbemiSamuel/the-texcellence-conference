// Single HTTP helper every API call goes through.
// Learn: one door for all requests means the Bearer header, the /api
// paths, and error handling are written ONCE. Components never touch
// fetch or localStorage directly - they call auth.api / guests.api.

// Vite proxies /api -> Express :5000 in dev, so no hardcoded host here.
const TOKEN_KEY = "texcellence.token";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export const apiFetch = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  // Backend errors always look like { error, message } - surface message.
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
};

// Turns any thrown value into a displayable message without `any`.
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
};
