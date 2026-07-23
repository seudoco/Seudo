import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** day_of_week: 0=Sunday...6=Saturday — matches JS Date.getDay(), and the
 * check constraint on availability_templates.day_of_week in 0001_init.sql. */
export interface AvailabilityTemplateRow {
  day_of_week: number;
  start_time: string; // "HH:MM" or "HH:MM:SS", practitioner-local
  end_time: string;
}

export interface ExistingBookingRange {
  scheduled_start: string; // ISO instant
  scheduled_end: string;
}

/** A practitioner is available every day at all times by default (the
 * weeklyTemplate rows below are still the mechanism, but the UI always
 * writes a full 00:00-23:59 row per day unless the practitioner narrows it —
 * see components/dashboard/WorkingHours.tsx). Blocking carves out exceptions:
 * start_time/end_time both null blocks the whole date; both set blocks only
 * that time range within the date. */
export interface AvailabilityBlockRow {
  blocked_date: string; // "YYYY-MM-DD", practitioner-local
  start_time: string | null;
  end_time: string | null;
}

export interface GenerateSlotsParams {
  timezone: string; // IANA, e.g. "Europe/Copenhagen"
  weeklyTemplate: AvailabilityTemplateRow[];
  blockedRanges: AvailabilityBlockRow[];
  /** Pre-filtered by the caller to status in ('pending','confirmed') — this
   * function has no DB access, it just avoids proposing a slot that overlaps
   * one of these. */
  existingBookings: ExistingBookingRange[];
  serviceDurationMinutes: number;
  /** Injectable for tests. Defaults to the real current time. */
  now?: Date;
  /** Rolling booking window, in days. Plan default: 8 weeks. */
  windowDays?: number;
  /** Plan default: 2 hours. */
  minimumNoticeHours?: number;
}

export interface Slot {
  start: string; // ISO instant
  end: string;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function parseHM(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number);
  return [h, m];
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function generateSlots({
  timezone,
  weeklyTemplate,
  blockedRanges,
  existingBookings,
  serviceDurationMinutes,
  now = new Date(),
  windowDays = 56,
  minimumNoticeHours = 2,
}: GenerateSlotsParams): Slot[] {
  const earliestBookable = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);

  // Fast path: whole-day blocks (both times null) just skip the date outright.
  const fullyBlockedDates = new Set(
    blockedRanges.filter((b) => !b.start_time && !b.end_time).map((b) => b.blocked_date)
  );
  // Partial-day blocks are grouped by date so the per-slot check below only
  // scans the (usually small) set relevant to that specific day.
  const partialBlocksByDate = new Map<string, AvailabilityBlockRow[]>();
  for (const b of blockedRanges) {
    if (!b.start_time || !b.end_time) continue;
    const list = partialBlocksByDate.get(b.blocked_date) ?? [];
    list.push(b);
    partialBlocksByDate.set(b.blocked_date, list);
  }

  const templateByDay = new Map<number, AvailabilityTemplateRow[]>();
  for (const row of weeklyTemplate) {
    const list = templateByDay.get(row.day_of_week) ?? [];
    list.push(row);
    templateByDay.set(row.day_of_week, list);
  }

  const existingRanges = existingBookings.map((b) => ({
    start: new Date(b.scheduled_start),
    end: new Date(b.scheduled_end),
  }));

  const slots: Slot[] = [];

  // Iterate calendar days in the PRACTITIONER'S local timezone, not the
  // server's — a "day" and its day-of-week must be computed relative to
  // where the practitioner actually is, or the whole thing silently drifts
  // for anyone not in the server's timezone.
  //
  // date-fns-tz gotcha (cost real debugging time — read before touching
  // this): toZonedTime returns a Date whose LOCAL getters (getFullYear,
  // getHours, ...) hold the target-zone wall clock — read it with
  // getUTCFullYear() etc. and you silently get back the SYSTEM timezone's
  // interpretation instead. That bug is invisible in dev on a machine whose
  // system tz happens to match the target (Copenhagen here), and breaks in
  // production the moment the server runs in a different zone (Vercel: UTC).
  const zonedNow = toZonedTime(now, timezone);
  let year = zonedNow.getFullYear();
  let month = zonedNow.getMonth();
  let day = zonedNow.getDate();

  for (let i = 0; i < windowDays; i++) {
    // Date.UTC normalizes day/month overflow correctly (e.g. day=32 rolls
    // into the next month), so a naive +1-per-iteration loop is safe across
    // month/year boundaries.
    const cursor = new Date(Date.UTC(year, month, day + i));
    const cursorYear = cursor.getUTCFullYear();
    const cursorMonth = cursor.getUTCMonth();
    const cursorDate = cursor.getUTCDate();
    const dayOfWeek = cursor.getUTCDay();
    const dateStr = `${cursorYear}-${String(cursorMonth + 1).padStart(2, "0")}-${String(
      cursorDate
    ).padStart(2, "0")}`;

    if (fullyBlockedDates.has(dateStr)) continue;

    const rows = templateByDay.get(dayOfWeek);
    if (!rows) continue;

    // Resolve this date's partial-time blocks to real UTC instant ranges
    // once per day (not once per candidate slot) — same fromZonedTime
    // treatment as slot times, since a block's local time needs the same
    // DST-correct resolution a booking slot does.
    const dayPartialBlocks = (partialBlocksByDate.get(dateStr) ?? []).map((b) => ({
      start: fromZonedTime(
        new Date(cursorYear, cursorMonth, cursorDate, ...parseHM(b.start_time!)),
        timezone
      ),
      end: fromZonedTime(
        new Date(cursorYear, cursorMonth, cursorDate, ...parseHM(b.end_time!)),
        timezone
      ),
    }));

    for (const row of rows) {
      const startMin = parseTimeToMinutes(row.start_time);
      const endMin = parseTimeToMinutes(row.end_time);

      for (
        let candidateStartMin = startMin;
        candidateStartMin + serviceDurationMinutes <= endMin;
        candidateStartMin += serviceDurationMinutes
      ) {
        const hh = Math.floor(candidateStartMin / 60);
        const mm = candidateStartMin % 60;

        // Build the "naive" local wall-clock instant, then let
        // fromZonedTime resolve it against the IANA tz database for this
        // exact date — this is the actual DST-correctness step. The same
        // 14:00 local time can be a different UTC offset a week apart
        // across a DST transition; fromZonedTime looks up the real rule
        // for cursorYear/cursorMonth/cursorDate, not a fixed offset.
        //
        // Must use the LOCAL Date constructor here, not Date.UTC — see the
        // gotcha note above toZonedTime. fromZonedTime reads its input back
        // via LOCAL getters, so the constructor that sets them has to match.
        const naiveLocal = new Date(cursorYear, cursorMonth, cursorDate, hh, mm);
        const slotStart = fromZonedTime(naiveLocal, timezone);
        const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60 * 1000);

        if (slotStart < earliestBookable) continue;
        if (existingRanges.some((r) => overlaps(slotStart, slotEnd, r.start, r.end))) continue;
        if (dayPartialBlocks.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) continue;

        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start));
  return slots;
}
