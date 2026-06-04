import { getDb } from './server.mjs';

export interface TodayStats {
  requests: number;
  tokens: number;
  lastModel: string;
}

// Direct SQL on the server bundle's own connection — no HTTP, no auth, no
// second better-sqlite3 handle (avoids WAL writer contention). `created_at`
// is stored as UTC text; compare in localtime so "today" matches the menu
// bar's wall clock.
export function todayStats(): TodayStats {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT COUNT(*) AS requests,
             COALESCE(SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)), 0) AS tokens
      FROM requests
      WHERE datetime(created_at, 'localtime') >= datetime('now', 'localtime', 'start of day')
    `).get() as { requests: number; tokens: number };
    const last = db.prepare(
      'SELECT model_id FROM requests ORDER BY id DESC LIMIT 1',
    ).get() as { model_id?: string } | undefined;
    return { requests: row.requests, tokens: row.tokens, lastModel: last?.model_id ?? '—' };
  } catch {
    return { requests: 0, tokens: 0, lastModel: '—' };
  }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
