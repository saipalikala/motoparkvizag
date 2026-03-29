import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ MongoDB Connected");

        // ── Create indexes for fast queries ──
        // These are idempotent — safe to run on every startup
        const db = mongoose.connection.db;

        // Products — most queried fields
        await db.collection("products").createIndex({ category: 1, createdAt: -1 });
        await db.collection("products").createIndex({ featured: 1, createdAt: -1 });
        await db.collection("products").createIndex({ trending: 1, createdAt: -1 });
        await db.collection("products").createIndex({ newArrival: 1, createdAt: -1 });
        await db.collection("products").createIndex({ brand: 1, price: 1 });
        await db.collection("products").createIndex({ price: 1 });
        await db.collection("products").createIndex({ name: "text" }); // for search

        // Orders — queried by phone, userId, date
        await db.collection("orders").createIndex({ "shippingAddress.phone": 1 });
        await db.collection("orders").createIndex({ userId: 1, createdAt: -1 });
        await db.collection("orders").createIndex({ createdAt: -1 });
        await db.collection("orders").createIndex({ status: 1 });

        console.log("✅ MongoDB indexes ready");

    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;