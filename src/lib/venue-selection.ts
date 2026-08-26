const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalize a caller-supplied venue id.
 *
 * Returns null for an absent, empty or malformed value so a bad id becomes
 * "no catalogue venue" rather than reaching Postgres and surfacing as a 500
 * from an invalid-uuid parse error.
 */
export function toOptionalVenueId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Recognise the venue rules raised by validate_wedding_event_venue.
 *
 * The trigger raises check_violation for capacity, destination and
 * availability, and foreign_key_violation for an unknown venue. Those messages
 * are written for the planner ("Venue X holds 500 guests but this function
 * expects 501"), so they are surfaced as a 422 instead of being flattened into
 * a generic failure.
 */
export function venueRuleMessage(
  error: { code?: string | null; message?: string | null } | null | undefined
): string | null {
  if (!error) return null;
  if (error.code !== "23514" && error.code !== "23503") return null;
  const message = error.message?.trim();
  return message && message.startsWith("Venue") ? message : null;
}
