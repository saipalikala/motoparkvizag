/* ================================================
   File: backend/ai/obs/eval.js
   Runs the golden query set against the real agent and reports a
   pass rate + failure table. "Pass" = the agent fired the expected
   grounded tool(s) (and, where asserted, refused instead of inventing).

   Run from backend/:  node ai/obs/eval.js
   Requires: MONGO_URI + OPENAI_API_KEY, and a built vector index
   (run ai:backfill first).
   ================================================ */
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";
import { runAgent } from "../agent/loop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../eval/golden.json"), "utf8")
);

/* Heuristic refusal / "couldn't find" detector for the reply text. */
const REFUSAL_RX =
  /\b(couldn'?t (find|locate)|could not|need (your|the)|please (provide|share|confirm)|verify|can'?t share|unable to|didn'?t find|no (results|matches)|not able)\b/i;

function evaluate(testCase, result) {
  const fired = new Set(result.toolsFired);
  const missing = (testCase.expectTools || []).filter((t) => !fired.has(t));
  const toolsOk = missing.length === 0;

  let refusalOk = true;
  if (testCase.expectRefusal) refusalOk = REFUSAL_RX.test(result.reply);

  return {
    pass: toolsOk && refusalOk,
    missing,
    refusalOk,
  };
}

async function main() {
  await connectDB();

  const rows = [];
  let passed = 0;

  for (const c of GOLDEN.cases) {
    process.stdout.write(`• ${c.id} ... `);
    try {
      const result = await runAgent({ message: c.message, sessionId: `eval-${c.id}` });
      const verdict = evaluate(c, result);
      if (verdict.pass) passed++;
      console.log(verdict.pass ? "PASS" : "FAIL");
      rows.push({
        id: c.id,
        pass: verdict.pass,
        expected: (c.expectTools || []).join(", ") || "(none)",
        fired: result.toolsFired.join(", ") || "(none)",
        missing: verdict.missing.join(", "),
        refusal: c.expectRefusal ? (verdict.refusalOk ? "ok" : "MISSING") : "-",
        reply: result.reply.slice(0, 90).replace(/\s+/g, " "),
      });
    } catch (e) {
      console.log("ERROR");
      rows.push({ id: c.id, pass: false, expected: "-", fired: "-", missing: e.message, refusal: "-", reply: "" });
    }
  }

  const total = GOLDEN.cases.length;
  console.log("\n=== EVAL RESULTS ===");
  console.log(`Pass rate: ${passed}/${total} (${Math.round((passed / total) * 100)}%)\n`);

  const failures = rows.filter((r) => !r.pass);
  if (failures.length) {
    console.log("--- FAILURES ---");
    console.table(
      failures.map((r) => ({
        id: r.id,
        expected: r.expected,
        fired: r.fired,
        missing: r.missing,
        refusal: r.refusal,
        reply: r.reply,
      }))
    );
    console.log(
      "\nRecord each real failure (query -> cause -> fix) in docs/12-ai-assistant.md."
    );
  } else {
    console.log("All golden cases passed. 🎉");
  }

  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    console.error("💥 Eval failed:", e);
    process.exit(1);
  });
}
