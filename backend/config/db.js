import mongoose from "mongoose";

/**
 * Production cluster fingerprint. A URI is treated as "production" only when it
 * targets BOTH this host and this database name — `motopark_dev` on the same
 * cluster, or `motopark` on a local host, are not production.
 * Overridable so this file needs no edit when the cluster is rotated.
 *
 * Every value here is read lazily, at call time rather than at import time.
 * ESM evaluates imported modules before the importing module's body, so
 * server.js's dotenv.config() has NOT run when this file is first evaluated —
 * reading process.env at module scope would see an unpopulated environment and
 * make the guard fire on a correct production boot.
 */
const prodDbHost = () => (process.env.PROD_DB_HOST || "cluster0.2hgw1zn.mongodb.net").toLowerCase();
const prodDbName = () => process.env.PROD_DB_NAME || "motopark";
const isProdEnv = () => process.env.NODE_ENV === "production";

/**
 * Pull the host list and database name out of a connection string without
 * tripping over credentials. Passwords may contain unencoded `@` or `/`, so the
 * credential section is delimited by the LAST `@` (per the MongoDB URI spec) —
 * splitting on the first one reads the password as the host, which would let a
 * production URI slip past the guard below. Returns null when unparseable.
 */
const parseMongoUri = (uri) => {
  const m = /^mongodb(?:\+srv)?:\/\/(.+)$/i.exec(uri);
  if (!m) return null;

  let rest = m[1];
  const query = rest.indexOf("?");
  if (query !== -1) rest = rest.slice(0, query);

  const lastAt = rest.lastIndexOf("@");
  if (lastAt !== -1) rest = rest.slice(lastAt + 1);
  if (!rest) return null;

  const slash = rest.indexOf("/");
  const hosts = (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase();
  if (!hosts) return null;

  return { hosts, dbName: slash === -1 ? "" : decodeURIComponent(rest.slice(slash + 1)) };
};

/**
 * Refuse to boot when NODE_ENV and the database target disagree.
 *
 * The failure this prevents: a dev server started against the live cluster,
 * where a stray admin save or a schema-drifted index sync mutates real client
 * data. Failing loudly at boot is cheap; discovering it after a write is not.
 *
 * Set ALLOW_DB_ENV_MISMATCH=1 to bypass — needed for a staging deploy, which
 * legitimately runs NODE_ENV=production against a non-production database.
 */
const assertEnvMatchesDatabase = (uri) => {
  if (process.env.ALLOW_DB_ENV_MISMATCH === "1") {
    console.warn("⚠️  ALLOW_DB_ENV_MISMATCH=1 — database/NODE_ENV guard bypassed.");
    return;
  }

  const parsed = parseMongoUri(uri);
  if (!parsed) throw new Error("MONGO_URI is not a valid MongoDB connection string.");

  const isProdTarget = parsed.hosts.includes(prodDbHost()) && parsed.dbName === prodDbName();
  const target = `${parsed.hosts}/${parsed.dbName || "(no database)"}`;

  if (isProdTarget && !isProdEnv()) {
    throw new Error(
      `Refusing to boot: MONGO_URI points at the PRODUCTION database (${target}) ` +
        `but NODE_ENV is "${process.env.NODE_ENV || "unset"}". A dev server must never ` +
        `write to live client data. Point MONGO_URI at a local or staging database, ` +
        `or set ALLOW_DB_ENV_MISMATCH=1 if this is deliberate.`
    );
  }

  if (!isProdTarget && isProdEnv()) {
    throw new Error(
      `Refusing to boot: NODE_ENV=production but MONGO_URI points at a NON-production ` +
        `database (${target}). Production would serve real traffic from the wrong data. ` +
        `Fix MONGO_URI, or set ALLOW_DB_ENV_MISMATCH=1 if this is a staging deploy.`
    );
  }
};

const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set.");

  assertEnvMatchesDatabase(process.env.MONGO_URI);

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log(`✅ MongoDB Connected (${mongoose.connection.name})`);

  /**
   * syncIndexes() DROPS any index not present in the local schema, so running it
   * automatically against production lets a mid-refactor schema delete a live
   * index as a side effect of a boot. Production index changes must be a
   * deliberate migration: set SYNC_INDEXES=1 for that one run.
   *
   * Background — never blocks app.listen() (previously took 9s and delayed bind).
   */
  const shouldSyncIndexes = !isProdEnv() || process.env.SYNC_INDEXES === "1";

  if (!shouldSyncIndexes) {
    console.log("↩️  Index sync skipped in production (set SYNC_INDEXES=1 to run it).");
    return;
  }

  setImmediate(() => {
    mongoose.connection
      .syncIndexes()
      .then(() => console.log("✅ MongoDB indexes synced"))
      .catch((e) => console.warn("⚠️  Index sync warning:", e.message));
  });
};

export default connectDB;
