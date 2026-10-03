export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

/** The period chosen in the dashboard's URL (?days=7|30|90); anything else means 30. */
export function parseDays(value: unknown): Period {
  const days = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(days) ? (days as Period) : 30;
}

export type TopProduct = {
  id: string;
  name_ar: string;
  name_en: string | null;
  views: number;
  whatsapp: number;
  phone: number;
  shares: number;
  qr_scans: number;
  favorites: number;
};

export type AnalyticsSummary = {
  totals: Partial<Record<string, number>>;
  visitors: number;
  daily: { day: string; views: number }[];
  top_products: TopProduct[];
  top_searches: { query: string; count: number }[];
};

/** Every calendar day of the period, with 0 for days nobody looked at a product. */
export function fillDays(daily: { day: string; views: number }[], days: number, today: Date): { day: string; views: number }[] {
  const byDay = new Map(daily.map((entry) => [entry.day, entry.views]));
  const result: { day: string; views: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    result.push({ day: key, views: byDay.get(key) ?? 0 });
  }
  return result;
}
