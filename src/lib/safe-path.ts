export function safeInternalPath(input: string | null | undefined, fallback = "/dashboard") {
  if (!input) return fallback;
  const value = input.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("\\")) return fallback;
  return value;
}

