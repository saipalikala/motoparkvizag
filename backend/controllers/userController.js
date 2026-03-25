/* ================================================
   File: backend/controllers/userController.js
   ================================================ */
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import User from "../models/userModel.js";

const resend = new Resend(process.env.RESEND_API_KEY);

/* ── HELPERS ── */
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET || "motopark_user_secret", { expiresIn: "30d" });

const generateOtp = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

/* Use verified domain in production, Resend test address in development */
const FROM =
    process.env.NODE_ENV === "production" && process.env.FROM_EMAIL
        ? `MotoPark <${process.env.FROM_EMAIL}>`
        : "MotoPark <onboarding@resend.dev>";

/* ════════════════════════════════
   SEND OTP
   POST /api/users/otp/send
   Body: { email }
════════════════════════════════ */
export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes("@")) {
            return res.status(400).json({ message: "Valid email is required" });
        }

        const otp = generateOtp();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        /* Find or create user */
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = new User({
                name: email.split("@")[0], // temp name, updatable later
                email: email.toLowerCase(),
                isVerified: false,
            });
        }

        user.otp = otp;
        user.otpExpiry = expiry;
        await user.save();

        /* Send OTP email */
        await resend.emails.send({
            from: FROM,
            to: email,
            subject: `${otp} — Your MotoPark login code`,
            html: `
                <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;">

                    <!-- HEADER -->
                    <div style="background:linear-gradient(135deg,#0b1d3a,#08162d);border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
                        <p style="color:#ff6b3d;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">MotoPark</p>
                        <h1 style="color:#ffffff;font-size:22px;font-weight:400;margin:0;letter-spacing:-0.02em;">Your login code</h1>
                    </div>

                    <p style="color:#6e6e73;font-size:14px;line-height:1.6;margin:0 0 20px;">
                        Use this code to sign in to MotoPark. It expires in <strong>10 minutes</strong>.
                    </p>

                    <!-- OTP BOX -->
                    <div style="background:#f5f5f7;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
                        <span style="font-size:44px;font-weight:700;letter-spacing:14px;color:#0b1d3a;font-family:monospace;">
                            ${otp}
                        </span>
                    </div>

                    <p style="color:#aeaeb2;font-size:12px;line-height:1.6;margin:0;">
                        If you didn't request this code, you can safely ignore this email.
                        Someone may have entered your email by mistake.
                    </p>

                    <hr style="border:none;border-top:1px solid rgba(11,29,58,0.08);margin:24px 0;"/>
                    <p style="color:#d1d1d6;font-size:11px;margin:0;text-align:center;">
                        © ${new Date().getFullYear()} MotoPark · Visakhapatnam, India
                    </p>
                </div>
            `,
        });

        console.log(`✅ OTP email sent to ${email}`);
        res.json({ message: "OTP sent to your email" });

    } catch (err) {
        console.error("sendOtp error:", err);
        res.status(500).json({ message: "Failed to send OTP", error: err.message });
    }
};

/* ════════════════════════════════
   VERIFY OTP
   POST /api/users/otp/verify
   Body: { email, otp }
════════════════════════════════ */
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.otp || !user.otpExpiry) {
            return res.status(400).json({ message: "No OTP found. Please request a new one." });
        }

        if (user.otpExpiry < new Date()) {
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ message: "OTP expired. Please request a new one." });
        }

        if (user.otp !== otp.toString()) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        /* Clear OTP, mark verified */
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.isVerified = true;
        await user.save();

        res.json({
            message: "Login successful",
            token: generateToken(user._id),
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
            },
        });

    } catch (err) {
        console.error("verifyOtp error:", err);
        res.status(500).json({ message: "OTP verification failed", error: err.message });
    }
};

/* ════════════════════════════════
   REGISTER — email + password
   POST /api/users/register
════════════════════════════════ */
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const user = await User.create({ name, email: email.toLowerCase(), password });

        res.status(201).json({
            token: generateToken(user._id),
            user: { _id: user._id, name: user.name, email: user.email },
        });

    } catch (err) {
        console.error("register error:", err);
        res.status(500).json({ message: "Registration failed", error: err.message });
    }
};

/* ════════════════════════════════
   LOGIN — email + password
   POST /api/users/login/email
════════════════════════════════ */
export const loginEmail = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            token: generateToken(user._id),
            user: { _id: user._id, name: user.name, email: user.email, phone: user.phone },
        });

    } catch (err) {
        console.error("loginEmail error:", err);
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};

/* ════════════════════════════════
   GET PROFILE
   GET /api/users/profile
════════════════════════════════ */
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password -otp -otpExpiry");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ════════════════════════════════
   UPDATE PROFILE
   PUT /api/users/profile
════════════════════════════════ */
export const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        await user.save();

        res.json({
            user: { _id: user._id, name: user.name, email: user.email, phone: user.phone },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ════════════════════════════════
   SAVE ADDRESS
   POST /api/users/addresses
════════════════════════════════ */
export const saveAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.savedAddresses.push(req.body);
        await user.save();
        res.status(201).json({ user: { savedAddresses: user.savedAddresses } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ════════════════════════════════
   DELETE ADDRESS
   DELETE /api/users/addresses/:addressId
════════════════════════════════ */
export const deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.savedAddresses = user.savedAddresses.filter(
            (a) => a._id.toString() !== req.params.addressId
        );
        await user.save();
        res.json({ user: { savedAddresses: user.savedAddresses } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};