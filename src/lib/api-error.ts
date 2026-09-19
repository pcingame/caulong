import type { ZodError } from "zod";

/** API routes must never send `.flatten()`/`.issues` objects as `error` — a raw
 * object rendered as a JSX child crashes the page. Always reduce to a string. */
export function zodFirstError(error: ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}
