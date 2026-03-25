/* ================================================
   File: backend/controllers/userController.js
   ================================================ */
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "motopark_user_secret";
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes

/* ── SMS HELPER ──────────────────────────────────────────────────
   Automatically uses MSG91 if env vars are set.
   Falls back to console.log for local development.
   ──────────────────────────────────────────────────────────────── */
const sendSms = async (phone, otp) => {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (authKey && templateId) {
        /* ── MSG91 (production) ── */
        try {
            const res = await fetch(
                `https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${phone}&otp=${otp}`,
                {
                    method: "POST",
                    headers: {
                        "authkey": authKey,
                        "Content-Type": "application/json",
                    },
                }
            );
            const data = await res.json();
            console.log(`📱 MSG91 response for +91${phone}:`, data);
        } catch (err) {
            console.error("MSG91 SMS error:", err.message);
            // Don't throw — still return success so we don't expose internals
        }
    } else {
        /* ── Console fallback (development only) ── */
        console.log(`\n🔑 OTP for +91${phone}: ${otp}  (expires in 10 min)`);
        console.log(`   Add MSG91_AUTH_KEY + MSG91_TEMPLATE_ID to .env to send real SMS\n`);
    }
};

const makeToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });

const safeUser = (u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isVerified: u.isVerified,
    savedAddresses: u.savedAddresses,
    defaultAddress: u.defaultAddress,
    createdAt: u.createdAt,
});

/* ── REGISTER (email + password) ── */
export const register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name) return res.status(400).json({ message: "Name is required" });
        if (!email && !phone) return res.status(400).json({ message: "Email or phone required" });
        if (email && !password) return res.status(400).json({ message: "Password is required for email signup" });

        // check duplicate
        const exists = await User.findOne({
            $or: [
                ...(email ? [{ email }] : []),
                ...(phone ? [{ phone }] : []),
            ]
        });

        if (exists) {
            const field = exists.email === email ? "email" : "phone";
            return res.status(400).json({ message: `An account with this ${field} already exists` });
        }

        const user = await User.create({ name, email, phone, password, isVerified: !!phone });

        res.status(201).json({
            user: safeUser(user),
            token: makeToken(user._id),
        });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};

/* ── EMAIL LOGIN ── */
export const loginEmail = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: "No account found with this email" });
        if (!(await user.matchPassword(password))) return res.status(401).json({ message: "Incorrect password" });

        res.json({
            user: safeUser(user),
            token: makeToken(user._id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── SEND OTP (phone) ── */
export const sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Enter a valid 10-digit number" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + OTP_EXPIRY);

        // Find existing user or create a temporary placeholder
        let user = await User.findOne({ phone });
        if (user) {
            // existing user — just update OTP
            user.otp = otp;
            user.otpExpiry = expiry;
            await user.save();
        } else {
            // new user — create with placeholder name (will be set in verifyOtp)
            await User.create({
                phone,
                name: "MotoPark User", // placeholder, updated after name entry
                otp,
                otpExpiry: expiry,
                isVerified: false,
            });
        }

        // ─── SEND REAL SMS ───────────────────────────────────────
        await sendSms(phone, otp);
        // ─────────────────────────────────────────────────────────

        res.json({ message: "OTP sent", phone });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── VERIFY OTP ── */
export const verifyOtp = async (req, res) => {
    try {
        const { phone, otp, name } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP required" });

        const user = await User.findOne({ phone });
        if (!user) return res.status(400).json({ message: "No OTP was sent to this number" });
        if (user.otp !== otp) return res.status(400).json({ message: "Incorrect OTP" });
        if (user.otpExpiry < new Date()) return res.status(400).json({ message: "OTP expired. Request a new one" });

        // Mark verified, clear OTP, always update name if provided
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        if (name && name.trim()) user.name = name.trim(); // always overwrite placeholder
        await user.save();

        res.json({
            user: safeUser(user),
            token: makeToken(user._id),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── GET PROFILE ── */
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── UPDATE PROFILE ── */
export const updateProfile = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (name) user.name = name;
        if (email) user.email = email;
        if (password) user.password = password; // pre-save hook will hash

        await user.save();
        res.json({ user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── ADD / UPDATE ADDRESS ── */
export const saveAddress = async (req, res) => {
    try {
        const { label, name, phone, address, city, state, pincode, setDefault } = req.body;
        const user = await User.findById(req.user._id);

        const newAddr = { label, name, phone, address, city, state, pincode };
        user.savedAddresses.push(newAddr);

        if (setDefault || user.savedAddresses.length === 1) {
            const added = user.savedAddresses[user.savedAddresses.length - 1];
            user.defaultAddress = added._id;
        }

        await user.save();
        res.json({ user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ── DELETE ADDRESS ── */
export const deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.addressId);
        await user.save();
        res.json({ user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};