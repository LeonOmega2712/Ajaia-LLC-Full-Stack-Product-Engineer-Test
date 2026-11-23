/** Only same-origin relative paths are allowed as post-login destinations (prevents open redirects). */
export function safeNextPath(value: string | string[] | undefined | null): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path;
}

export const loginUrl = (next: string) => (next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
