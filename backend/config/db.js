import mongoose from "mongoose";

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log("✅ MongoDB Connected");

  // Background — never blocks app.listen()
  // Previously took 9s and delayed server bind
  setImmediate(() => {
    mongoose.connection
      .syncIndexes()
      .then(() => console.log("✅ MongoDB indexes synced"))
      .catch((e) => console.warn("⚠️  Index sync warning:", e.message));
  });
};

export default connectDB;