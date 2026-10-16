const PERMANENTLY_CLOSED = /\b(permanently closed|closed permanently|cerrado(?:\s+de forma)?\s+permanente(?:mente)?|cerrado definitivamente)\b/i;

export function isPermanentlyClosedBusinessStatus(value: unknown): boolean {
  return value === "CLOSED_PERMANENTLY";
}

export function isPermanentlyClosedGoogleMapsResult(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.permanently_closed === true || isPermanentlyClosedBusinessStatus(result.business_status)) return true;
  return [result.open_state, result.hours, result.status]
    .some(field => typeof field === "string" && PERMANENTLY_CLOSED.test(field));
}
