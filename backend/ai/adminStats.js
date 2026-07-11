/* ================================================
   File: backend/ai/adminStats.js
   Admin-only observability endpoint. Aggregates AiCallLog into a
   dashboard payload: volume, cost, latency (avg/p50/p95), token usage,
   tool usage, resolution rate, and recent calls.
   Computed in JS (portable; dataset is small) — no $percentile dependency.
   ================================================ */
import AiCallLog from "../models/aiCallLog.js";

export async function aiStats(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const since = new Date(Date.now() - days * 86400000);

    const logs = await AiCallLog.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .lean();

    const n = logs.length;
    const sum = (field) => logs.reduce((a, l) => a + (l[field] || 0), 0);

    const latencies = logs
      .map((l) => l.latencyMs || 0)
      .filter((x) => x > 0)
      .sort((a, b) => a - b);
    const pct = (p) =>
      latencies.length
        ? latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]
        : 0;

    const byKind = {};
    for (const l of logs) byKind[l.kind] = (byKind[l.kind] || 0) + 1;

    const toolCounts = {};
    for (const l of logs) for (const t of l.toolsFired || []) toolCounts[t] = (toolCounts[t] || 0) + 1;

    const resolved = logs.filter((l) => l.resolved).length;
    const totalCostMicroUsd = sum("costMicroUsd");

    res.json({
      windowDays: days,
      totalCalls: n,
      byKind, // { chat, embed, "agent-turn" }
      resolvedRate: n ? +(resolved / n).toFixed(3) : 1,
      tokens: { prompt: sum("promptTokens"), completion: sum("completionTokens") },
      cost: { microUsd: totalCostMicroUsd, usd: +(totalCostMicroUsd / 1e6).toFixed(6) },
      latencyMs: {
        avg: n ? Math.round(sum("latencyMs") / n) : 0,
        p50: pct(50),
        p95: pct(95),
        max: latencies.length ? latencies[latencies.length - 1] : 0,
      },
      topTools: Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      recent: logs.slice(0, 20).map((l) => ({
        at: l.createdAt,
        kind: l.kind,
        model: l.model,
        query: l.userQuery,
        tools: l.toolsFired || [],
        tokens: (l.promptTokens || 0) + (l.completionTokens || 0),
        costMicroUsd: l.costMicroUsd || 0,
        latencyMs: l.latencyMs || 0,
        resolved: l.resolved,
      })),
    });
  } catch (e) {
    console.error("[AI] /admin/stats error:", e.message);
    res.status(500).json({ error: "Failed to load AI stats." });
  }
}
