// Calendar days are handled as local YYYY-MM-DD strings; they sort and
// compare correctly as plain strings and never drift across time zones.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
}

export function weekDays(startISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startISO, i));
}

const DOW = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function dowLabel(iso: string): string {
  return DOW[fromISO(iso).getDay()] ?? "";
}

export function dayNumber(iso: string): string {
  return pad(fromISO(iso).getDate());
}

export function shortDate(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export function weekLabel(startISO: string): string {
  return `${shortDate(startISO)} – ${shortDate(addDays(startISO, 6))}`;
}
