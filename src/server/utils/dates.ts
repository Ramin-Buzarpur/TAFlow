export function toUtcDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

export function assertDateRange(startsAt: Date, endsAt: Date): void {
  if (endsAt <= startsAt) throw new Error("End date must be after start date");
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
