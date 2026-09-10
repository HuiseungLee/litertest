export type TimelineEvent = {
  id: string;
  world: string;
  period: string;
  korea: string;
  literature: string;
};

type PeriodKey = [number, number, number, number, number];

function periodKey(value: string): PeriodKey | null {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return null;

  const isBce = /(?:기원\s*전|B\.?C\.?E?\.?)/i.test(normalized);
  const century = normalized.match(/(\d{1,2})\s*(?:C|세기)/i);
  if (century) {
    const centuryNumber = Number(century[1]);
    const year = isBce ? -(centuryNumber * 100) + 1 : (centuryNumber - 1) * 100;
    return [year, 0, 0, 0, 0];
  }

  const date = normalized.match(/(-?\d{1,4})(?:\.(\d{1,2}))?(?:\.(\d{1,2}))?\.?\s*(?:(\d{1,2}):(\d{1,2}))?/);
  if (!date) return null;
  const numericYear = Number(date[1]);
  const year = isBce && numericYear > 0 ? -numericYear : numericYear;
  return [year, Number(date[2] || 0), Number(date[3] || 0), Number(date[4] || 0), Number(date[5] || 0)];
}

export function sortTimelineEvents(events: TimelineEvent[]) {
  return events
    .map((event, originalIndex) => ({ event, originalIndex, key: periodKey(event.period) }))
    .sort((left, right) => {
      if (!left.key && !right.key) return left.originalIndex - right.originalIndex;
      if (!left.key) return 1;
      if (!right.key) return -1;
      for (let index = 0; index < left.key.length; index += 1) {
        const difference = left.key[index] - right.key[index];
        if (difference) return difference;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ event }) => event);
}
