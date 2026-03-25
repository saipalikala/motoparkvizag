import mongoose from "mongoose";

const connectDB = async () => {

try {

console.log("Mongo URI:", process.env.MONGO_URI);

await mongoose.connect(process.env.MONGO_URI);

console.log("MongoDB Connected");

} catch (error) {

console.log("Database connection failed:", error);
process.exit(1);

}

};

export default connectDB;