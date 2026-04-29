import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,        // connection pool — critical for concurrent requests
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log("✅ MongoDB Connected");

        // Sync indexes from all Mongoose schemas (non-blocking after connect)
        // This respects schema-defined indexes and won't re-create existing ones.
        // Remove the manual createIndex calls from this file entirely —
        // your productModel.js already declares all needed indexes.
        mongoose.connection.once("open", async () => {
            try {
                await mongoose.connection.syncIndexes();
                console.log("✅ MongoDB indexes synced");
            } catch (e) {
                console.warn("⚠️  Index sync warning:", e.message);
            }
        });

    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;