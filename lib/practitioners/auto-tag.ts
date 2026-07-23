import "server-only";

/** If a practitioner names a specialty in their service title/description
 * ("45min Reiki Healing") but doesn't explicitly tag it, tag it for them —
 * otherwise the specialty filter never surfaces the listing. Explicit tag
 * selections always win; this only fills in when specialty_id is null. */
export function detectSpecialtyId(
  text: string,
  specialties: readonly { id: number; name: string }[]
): number | null {
  const lower = text.toLowerCase();
  const match = specialties.find((s) => lower.includes(s.name.toLowerCase()));
  return match?.id ?? null;
}
