/**
 * V1 admin parity audit — READ ONLY.
 *
 * Answers "what does the business actually use?" for the six V1 admin sections
 * that have no V2 equivalent, so the rebuild list is evidence-based.
 *
 * Only ever calls countDocuments() and find().sort().limit() — no writes, no
 * index changes, no drops. Prints no credentials.
 *
 * Usage: node scripts/auditAdminUsage.mjs <env-file> [dbName]
 *   node scripts/auditAdminUsage.mjs .env motopark   # prod db, dev credentials
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

const envPath = process.argv[2];
if (!envPath) {
  console.error('usage: node scripts/auditAdminUsage.mjs <env-file> [dbName]');
  process.exit(1);
}
const parsed = dotenv.parse(readFileSync(envPath));
const uri = parsed.MONGO_URI;
if (!uri) {
  console.error(`No MONGO_URI in ${envPath}`);
  process.exit(1);
}

// Collections behind each V1 admin section that V2 has no equivalent for.
const SECTIONS = [
  ['AdminCarouselManager', 'carousels', 'homepage carousel slides'],
  ['AdminNavbarManager', 'navbars', 'navbar menu structure'],
  ['AdminHomeLayout / HomeBuilder', 'homelayouts', 'homepage section order'],
  ['AdminMedia', 'media', 'uploaded media library'],
  ['OffersAdmin', 'offers', 'promotional offers'],
  ['InventoryManager', 'products', 'stock — V2 edits this via VariantEditor'],
];

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
const ageDays = (d) => (d ? Math.round((now - new Date(d).getTime()) / DAY) : null);

async function main() {
  // Optional dbName override: lets working credentials from one env file be
  // pointed at another database on the SAME cluster without rewriting the URI
  // (and without writing credentials to a temp file).
  const dbOverride = process.argv[3];
  await mongoose.connect(uri, dbOverride ? { dbName: dbOverride } : undefined);
  const db = mongoose.connection.db;
  console.log(`\ndatabase: ${db.databaseName}   (read-only audit)\n`);

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const rows = [];
  for (const [section, coll, note] of SECTIONS) {
    if (!existing.has(coll)) {
      rows.push({ section, coll, note, exists: false });
      continue;
    }
    const c = db.collection(coll);
    const total = await c.countDocuments();

    // Newest write of any kind. Some of these schemas may lack timestamps, so
    // fall back to the ObjectId's embedded creation time.
    const [newestUpdated] = await c.find({ updatedAt: { $exists: true } }).sort({ updatedAt: -1 }).limit(1).toArray();
    const [newestCreated] = await c.find({ createdAt: { $exists: true } }).sort({ createdAt: -1 }).limit(1).toArray();
    const [newestById] = await c.find({}).sort({ _id: -1 }).limit(1).toArray();

    const lastTouch =
      newestUpdated?.updatedAt ||
      newestCreated?.createdAt ||
      (newestById?._id?.getTimestamp ? newestById._id.getTimestamp() : null);

    const since = (d) => c.countDocuments({ updatedAt: { $gte: new Date(now - d * DAY) } });
    const has = await c.countDocuments({ updatedAt: { $exists: true } });

    rows.push({
      section,
      coll,
      note,
      exists: true,
      total,
      lastTouch,
      hasTimestamps: has > 0,
      d30: has > 0 ? await since(30) : null,
      d90: has > 0 ? await since(90) : null,
      d180: has > 0 ? await since(180) : null,
    });
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log(
    pad('SECTION', 32) + pad('COLLECTION', 14) + pad('DOCS', 7) +
    pad('LAST WRITE', 13) + pad('AGE', 8) + pad('30d', 6) + pad('90d', 6) + '180d',
  );
  console.log('─'.repeat(94));
  for (const r of rows) {
    if (!r.exists) {
      console.log(pad(r.section, 32) + pad(r.coll, 14) + 'COLLECTION DOES NOT EXIST');
      continue;
    }
    const age = ageDays(r.lastTouch);
    console.log(
      pad(r.section, 32) + pad(r.coll, 14) + pad(r.total, 7) +
      pad(fmt(r.lastTouch), 13) + pad(age === null ? '—' : `${age}d`, 8) +
      pad(r.d30 ?? '—', 6) + pad(r.d90 ?? '—', 6) + (r.d180 ?? '—'),
    );
  }

  console.log('\nnotes:');
  for (const r of rows) console.log(`  ${r.coll}: ${r.note}${r.exists && !r.hasTimestamps ? '  [no updatedAt — age is from _id]' : ''}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('ERROR:', e.message);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});
