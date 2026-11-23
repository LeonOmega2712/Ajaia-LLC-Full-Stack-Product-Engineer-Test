/** Error carrying the HTTP status and parsed body, so callers can react to specific cases (e.g. 409). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Browser-side fetch helper: JSON in, JSON out, server error messages surfaced as ApiError. */
export async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status}).`, res.status, data);
  return data as T;
}
