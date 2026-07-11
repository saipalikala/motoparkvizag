/* ================================================
   File: backend/ai/search/backfill.js
   One-off / re-runnable maintenance script:
     1. Ensures the Atlas Vector Search index exists on products.embedding.
     2. Embeds every product and stores products.embedding.

   Run from backend/:  node ai/search/backfill.js
   Requires: MONGO_URI + OPENAI_API_KEY in .env.

   NOTE: this writes to whatever DB MONGO_URI points at (production Atlas).
   The embedding field is additive/non-breaking. Run deliberately.
   ================================================ */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { pathToFileURL } from "url";
import connectDB from "../../config/db.js";
import Product from "../../models/productModel.js";
import { AI } from "../config.js";
import { embedTexts, productEmbeddingInput } from "./embed.js";

const BATCH = 96; // products per embedding request

async function ensureVectorIndex() {
  const coll = mongoose.connection.collection("products");

  let existing = [];
  try {
    existing = await coll.listSearchIndexes().toArray();
  } catch (e) {
    console.warn(
      "⚠️  Could not list search indexes (need Atlas M0+ with Search):",
      e.message
    );
  }

  const found = existing.find((i) => i.name === AI.vectorIndex);
  if (found) {
    // Check the existing index's dimensions match the current embedModel.
    // Switching provider (e.g. OpenAI 1536 -> Gemini 3072) requires a rebuild.
    const dims = found.latestDefinition?.fields?.find((f) => f.type === "vector")?.numDimensions;
    if (dims === AI.embedDims) {
      console.log(`✅ Vector index "${AI.vectorIndex}" already exists (${dims} dims).`);
      return;
    }
    console.log(
      `♻️  Index "${AI.vectorIndex}" is ${dims} dims but model needs ${AI.embedDims}. Dropping + recreating...`
    );
    await coll.dropSearchIndex(AI.vectorIndex);
    // Atlas drops asynchronously; wait until it's gone before recreating.
    for (let i = 0; i < 30; i++) {
      const still = (await coll.listSearchIndexes().toArray()).some(
        (x) => x.name === AI.vectorIndex
      );
      if (!still) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`⏳ Creating vector index "${AI.vectorIndex}" (${AI.embedDims} dims)...`);
  await coll.createSearchIndex({
    name: AI.vectorIndex,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: AI.embedDims,
          similarity: "cosine",
        },
        { type: "filter", path: "category" },
        { type: "filter", path: "brand" },
      ],
    },
  });
  console.log(
    "✅ Index creation requested. Atlas builds it asynchronously (usually < 1 min)."
  );
}

async function backfillEmbeddings() {
  const products = await Product.find({}, "name brand category specs description").lean();
  console.log(`📦 ${products.length} products to embed.`);

  let done = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    const inputs = chunk.map(productEmbeddingInput);
    const vectors = await embedTexts(inputs, { log: i === 0 }); // log first batch only

    const ops = chunk.map((p, j) => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { embedding: vectors[j] } },
      },
    }));
    await Product.bulkWrite(ops);

    done += chunk.length;
    console.log(`   embedded ${done}/${products.length}`);
  }
}

async function main() {
  await connectDB();
  await ensureVectorIndex();
  await backfillEmbeddings();
  console.log("🎉 Backfill complete.");
  await mongoose.disconnect();
  process.exit(0);
}

// Only run when invoked directly (node ai/search/backfill.js),
// never as a side effect of being imported.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    console.error("💥 Backfill failed:", e);
    process.exit(1);
  });
}

export { ensureVectorIndex, backfillEmbeddings };
