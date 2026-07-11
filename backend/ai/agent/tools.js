/* ================================================
   File: backend/ai/agent/tools.js
   The grounded tool registry. Every handler reads REAL data
   from the live V1 schema — the model may only state facts that
   come back from these calls. Handlers never throw to the loop;
   they return { ...data } or { found:false, ... } / { error }.

   Tool set is deliberately scoped to what the V1 DB actually has:
     - products: _id, name, brand, category, price, specs, description,
                 variants[{ color, colorName, images, sizes[{ size, stock }] }]
                 (NO slug, NO isActive/status)
     - orders:   _id, shippingAddress{ phone, email, ... }, items, total,
                 status(pending|confirmed|shipped|delivered|cancelled), timestamps
                 (NO orderNumber, NO courier/tracking/returns fields)
   ================================================ */
import mongoose from "mongoose";
import Product from "../../models/productModel.js";
import Order from "../../models/orderModel.js";
import { searchProducts } from "../search/vectorSearch.js";

const RETURN_WINDOW_DAYS = Number(process.env.AI_RETURN_WINDOW_DAYS || 7);

const isId = (v) => mongoose.isValidObjectId(v);

/* Compact a product doc for the model (drops the embedding, trims text). */
function slimProduct(p) {
  if (!p) return null;
  const colors = (p.variants || []).map((v) => ({
    color: v.colorName || v.color,
    sizes: (v.sizes || []).map((s) => ({ size: s.size, inStock: s.stock > 0, stock: s.stock })),
  }));
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceINR: p.price,
    specs: (p.specs || "").slice(0, 600),
    description: (p.description || "").slice(0, 600),
    variants: colors,
  };
}

/* First usable image across a product's variants. */
export function primaryImage(variants) {
  for (const v of variants || []) {
    const img = (v.images || [])[0];
    if (img) return img;
  }
  return null;
}

/* Rich product card for the UI (NOT sent to the LLM — keeps its context
   free of image URLs). Reused by the agent's collector AND the controller's
   no-LLM fast-path search. */
export function toCard(p) {
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    priceINR: p.price,
    image: primaryImage(p.variants),
    url: `/products/${String(p._id)}`,
  };
}

/* Push cards onto ctx.products; the loop returns these to the client so the
   chat can render cards. Deduped by id in the loop. */
function collectForUI(ctx, docs) {
  if (!ctx || !Array.isArray(ctx.products)) return;
  for (const p of docs) ctx.products.push(toCard(p));
}

/* ---- individual tool handlers -------------------------------------- */

async function toolSearchProducts(args, ctx) {
  const { query, category, brand, maxPrice, limit } = args;
  if (!query) return { error: "query is required" };
  const rows = await searchProducts(query, {
    category,
    brand,
    maxPrice: typeof maxPrice === "number" ? maxPrice : undefined,
    limit: Math.min(Number(limit) || 6, 10),
    sessionId: ctx?.sessionId,
  });
  collectForUI(ctx, rows); // rich cards for the UI
  // Slim result for the LLM (no image URLs — pure grounding data).
  return {
    count: rows.length,
    results: rows.map((p) => ({
      id: String(p._id),
      name: p.name,
      brand: p.brand,
      category: p.category,
      priceINR: p.price,
      score: p.score,
    })),
  };
}

async function toolGetProductDetails(args, ctx) {
  const { productId } = args;
  if (!isId(productId)) return { found: false, reason: "invalid product id" };
  const p = await Product.findById(productId).lean();
  if (!p) return { found: false };
  collectForUI(ctx, [p]); // rich card for the UI
  return { found: true, product: slimProduct(p) };
}

async function toolCheckStock(args) {
  const { productId, color, size } = args;
  if (!isId(productId)) return { found: false, reason: "invalid product id" };
  const p = await Product.findById(productId, "name variants").lean();
  if (!p) return { found: false };

  const variants = p.variants || [];
  const matchColor = (v) =>
    !color ||
    (v.colorName || v.color || "").toLowerCase().includes(String(color).toLowerCase());

  const lines = [];
  for (const v of variants.filter(matchColor)) {
    for (const s of v.sizes || []) {
      if (size && String(s.size).toLowerCase() !== String(size).toLowerCase()) continue;
      lines.push({
        color: v.colorName || v.color,
        size: s.size,
        stock: s.stock,
        inStock: s.stock > 0,
      });
    }
  }
  return { found: true, product: p.name, availability: lines };
}

/* Identity-gated order lookup. Either:
   - orderId + a matching phone/email  -> that order, or
   - phone or email                    -> that contact's recent orders. */
async function toolGetOrderStatus(args) {
  const { orderId, phone, email } = args;

  const summarize = (o) => ({
    id: String(o._id),
    status: o.status,
    totalINR: o.total,
    itemCount: (o.items || []).length,
    items: (o.items || []).map((i) => ({ name: i.name, qty: i.quantity })),
    placedAt: o.createdAt,
    lastUpdatedAt: o.updatedAt,
  });

  if (orderId) {
    if (!isId(orderId)) return { found: false, reason: "invalid order id" };
    const o = await Order.findById(orderId).lean();
    if (!o) return { found: false };
    const okPhone = phone && o.shippingAddress?.phone === String(phone);
    const okEmail =
      email &&
      (o.shippingAddress?.email || "").toLowerCase() === String(email).toLowerCase();
    if (!okPhone && !okEmail) {
      return {
        found: false,
        reason:
          "identity not verified — need the phone or email used on the order before status can be shared",
      };
    }
    return { found: true, order: summarize(o) };
  }

  if (phone || email) {
    const q = phone
      ? { "shippingAddress.phone": String(phone) }
      : { "shippingAddress.email": new RegExp(`^${String(email)}$`, "i") };
    const orders = await Order.find(q).sort({ createdAt: -1 }).limit(5).lean();
    return { found: orders.length > 0, count: orders.length, orders: orders.map(summarize) };
  }

  return { found: false, reason: "provide an order id (with phone/email) or a phone/email" };
}

async function toolCheckReturnEligibility(args) {
  const { orderId, phone, email } = args;
  if (!isId(orderId)) return { eligible: false, reason: "invalid order id" };
  const o = await Order.findById(orderId).lean();
  if (!o) return { eligible: false, reason: "order not found" };

  const okPhone = phone && o.shippingAddress?.phone === String(phone);
  const okEmail =
    email && (o.shippingAddress?.email || "").toLowerCase() === String(email).toLowerCase();
  if (!okPhone && !okEmail) {
    return { eligible: false, reason: "identity not verified (need order phone or email)" };
  }

  if (o.status !== "delivered") {
    return {
      eligible: false,
      reason: `order status is "${o.status}"; returns open only after delivery`,
    };
  }
  // NOTE: V1 has no explicit deliveredDate — updatedAt approximates it.
  const days = (Date.now() - new Date(o.updatedAt).getTime()) / 86400000;
  const eligible = days <= RETURN_WINDOW_DAYS;
  return {
    eligible,
    windowDays: RETURN_WINDOW_DAYS,
    daysSinceDelivered: Math.floor(days),
    note: "delivered date approximated from last update; confirm with support for edge cases",
  };
}

/* Best-effort fitment. V1 has NO structured compatibility data, so we return
   the product's text and a naive token match; the model must answer with the
   appropriate "based on the listing, please confirm" hedge. */
async function toolCheckFitment(args) {
  const { productId, bikeModel } = args;
  if (!isId(productId)) return { found: false, reason: "invalid product id" };
  if (!bikeModel) return { found: false, reason: "bikeModel is required" };
  const p = await Product.findById(productId, "name specs description").lean();
  if (!p) return { found: false };

  const hay = `${p.name} ${p.specs} ${p.description}`.toLowerCase();
  const tokens = String(bikeModel).toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const matched = tokens.filter((t) => hay.includes(t));

  return {
    found: true,
    product: p.name,
    bikeModel,
    structuredFitmentData: false, // honest: no compatibleModels field in V1
    textMentionsAll: matched.length === tokens.length && tokens.length > 0,
    matchedTokens: matched,
    listingText: `${p.specs || ""}\n${p.description || ""}`.slice(0, 800),
  };
}

/* ---- registry ------------------------------------------------------- */

export const tools = [
  {
    name: "searchProducts",
    description:
      "Semantic search of MotoPark's catalog by meaning (not keywords). Use for any 'find/looking for/recommend/show me' request. Returns real products with ids and prices in INR.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language description of what the shopper wants." },
        category: { type: "string", description: "Optional exact category filter." },
        brand: { type: "string", description: "Optional exact brand filter." },
        maxPrice: { type: "number", description: "Optional max price in INR rupees." },
        limit: { type: "number", description: "Max results (default 6, cap 10)." },
      },
      required: ["query"],
    },
    handler: toolSearchProducts,
  },
  {
    name: "getProductDetails",
    description:
      "Full details for one product by its id (from searchProducts). Returns specs, description, colors, sizes and per-size stock.",
    parameters: {
      type: "object",
      properties: { productId: { type: "string" } },
      required: ["productId"],
    },
    handler: toolGetProductDetails,
  },
  {
    name: "checkStock",
    description:
      "Live stock for a product, optionally narrowed to a color and/or size. Never guess stock — always call this.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        color: { type: "string", description: "Optional color name." },
        size: { type: "string", description: "Optional exact size." },
      },
      required: ["productId"],
    },
    handler: toolCheckStock,
  },
  {
    name: "getOrderStatus",
    description:
      "Look up order status. Provide orderId PLUS the phone or email used on the order (identity check), OR just a phone/email to list that contact's recent orders. Never reveal order details without a matching phone/email.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
    },
    handler: toolGetOrderStatus,
  },
  {
    name: "checkReturnEligibility",
    description:
      "Whether an order is inside the return window. Requires orderId and a matching phone/email. Only delivered orders within the window are eligible.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
      required: ["orderId"],
    },
    handler: toolCheckReturnEligibility,
  },
  {
    name: "checkFitment",
    description:
      "Best-effort check of whether a product fits a given bike model, based on the listing text. IMPORTANT: MotoPark has no structured fitment data, so treat a text match as a hint, not a guarantee — always advise the shopper to confirm compatibility before buying.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        bikeModel: { type: "string", description: "e.g. 'Royal Enfield Classic 350'." },
      },
      required: ["productId", "bikeModel"],
    },
    handler: toolCheckFitment,
  },
];

/* name -> handler lookup for the loop. */
export const toolHandlers = Object.fromEntries(tools.map((t) => [t.name, t.handler]));

/* Shape passed to the provider (no handler fn). */
export const toolSchemas = tools.map(({ name, description, parameters }) => ({
  name,
  description,
  parameters,
}));
