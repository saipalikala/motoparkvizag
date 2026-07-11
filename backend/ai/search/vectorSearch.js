/* ================================================
   File: backend/ai/search/vectorSearch.js
   Semantic product search via MongoDB Atlas $vectorSearch.
   Grounded: returns REAL product documents, never model output.
   ================================================ */
import Product from "../../models/productModel.js";
import { AI } from "../config.js";
import { embedQuery } from "./embed.js";

/* Fields safe to return to the client / feed the agent. */
const PROJECT = {
  name: 1,
  brand: 1,
  category: 1,
  price: 1,
  description: 1,
  specs: 1,
  "variants.color": 1,
  "variants.colorName": 1,
  "variants.images": 1,
  "variants.sizes": 1,
  score: { $meta: "vectorSearchScore" },
};

/* Build an Atlas Vector Search pre-filter from simple options.
   Only category/brand are indexed as filter fields (see backfill.js).
   maxPrice is applied as a post-filter $match since price isn't in the
   vector filter set. */
function buildFilter({ category, brand } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  return Object.keys(filter).length ? filter : undefined;
}

/**
 * Semantic search over products.
 * @param {string} query      natural-language query
 * @param {object} opts       { limit, category, brand, maxPrice, sessionId }
 * @returns {Promise<Array>}  real product docs, ranked, with a `score`
 */
export async function searchProducts(query, opts = {}) {
  const { limit = 8, category, brand, maxPrice, sessionId } = opts;

  const queryVector = await embedQuery(query, { sessionId });

  const filter = buildFilter({ category, brand });

  const pipeline = [
    {
      $vectorSearch: {
        index: AI.vectorIndex,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(100, limit * 15),
        limit: Number(limit),
        ...(filter ? { filter } : {}),
      },
    },
    { $project: PROJECT },
  ];

  if (typeof maxPrice === "number") {
    pipeline.push({ $match: { price: { $lte: maxPrice } } });
  }

  return Product.aggregate(pipeline);
}
