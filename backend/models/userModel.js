/* ================================================
   File: backend/models/userModel.js
   ================================================ */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
    label: { type: String, default: "Home" }, // Home / Work / Other
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
}, { _id: true });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },

    password: { type: String },               // for email+password login
    isVerified: { type: Boolean, default: false },

    // OTP — stored temporarily for phone login
    otp: { type: String },
    otpExpiry: { type: Date },

    savedAddresses: [addressSchema],
    defaultAddress: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

/* Hash password before save */
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) return;
    this.password = await bcrypt.hash(this.password, 10);
});

/* Compare password */
userSchema.methods.matchPassword = async function (entered) {
    if (!this.password) return false;
    return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);