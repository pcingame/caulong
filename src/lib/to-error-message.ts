/** Defense-in-depth: API routes always send a string `error` now, but a raw
 * object here would crash the page if ever rendered directly as JSX (React
 * throws "Objects are not valid as a React child"). Never trust the shape. */
export function toErrorMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
