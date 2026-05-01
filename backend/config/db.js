import mongoose from "mongoose";

const connectDB = async () => {
  // connectDB fully resolves when the connection is established.
  // Index sync happens AFTER resolve so it never blocks server startup
  // and never causes an unhandledRejection.

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,  // fail fast if Atlas unreachable
    socketTimeoutMS: 45000,
  });

  console.log("✅ MongoDB Connected");

  // Sync indexes AFTER connection is confirmed.
  // Wrapped in its own try/catch so a bad index definition
  // never crashes the server — it just warns.
  try {
    await mongoose.connection.syncIndexes();
    console.log("✅ MongoDB indexes synced");
  } catch (e) {
    // Non-fatal — log and continue. Indexes may already exist.
    console.warn("⚠️  Index sync warning (non-fatal):", e.message);
  }
};

export default connectDB;