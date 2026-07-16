/**
 * features/admin/analytics/aiAnalyticsService.js — sole adminApi caller for the
 * AI observability dashboard (Milestone 6a).
 *
 * Backend contract (backend/ai/adminStats.js, mounted at aiRoutes.js):
 *   GET /api/ai/admin/stats?days=N  (admin JWT) →
 *     {
 *       windowDays, totalCalls,
 *       byKind: { chat, embed, "agent-turn" },
 *       resolvedRate,                       // 0..1
 *       tokens: { prompt, completion },
 *       cost:   { microUsd, usd },
 *       latencyMs: { avg, p50, p95, max },
 *       topTools: [{ name, count }],
 *       recent:   [{ at, kind, model, query, tools[], tokens, costMicroUsd,
 *                    latencyMs, resolved }]
 *     }
 *
 * Cost is tracked as integer micro-USD on the backend (no float money). We keep
 * that raw value and derive USD for display only.
 */
import { adminApi } from '../lib/adminApi.js';

/** Selectable observability windows (days). Backend clamps to [1, 90]. */
export const WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export async function getAiStats(days = 7) {
  const { data } = await adminApi.get('/ai/admin/stats', { params: { days } });

  const tokens = data?.tokens ?? { prompt: 0, completion: 0 };
  const cost = data?.cost ?? { microUsd: 0, usd: 0 };
  const latency = data?.latencyMs ?? { avg: 0, p50: 0, p95: 0, max: 0 };

  return {
    windowDays: data?.windowDays ?? days,
    totalCalls: data?.totalCalls ?? 0,
    byKind: data?.byKind ?? {},
    resolvedRate: data?.resolvedRate ?? 0,
    totalTokens: (tokens.prompt ?? 0) + (tokens.completion ?? 0),
    tokens,
    // Prefer the backend-computed USD; fall back to converting micro-USD.
    costUsd: cost.usd ?? (cost.microUsd ?? 0) / 1e6,
    costMicroUsd: cost.microUsd ?? 0,
    latency,
    topTools: Array.isArray(data?.topTools) ? data.topTools : [],
    recent: Array.isArray(data?.recent) ? data.recent : [],
  };
}
