import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// -------------------- RATE LIMITER --------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests" },
});

// Utility: send OTP (console log for now)
const sendOtp = (email, otp) => console.log(`OTP for ${email}: ${otp}`);

// -------------------- SIGNUP --------------------
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { fullName, identifier, password } = req.body;
    if (!fullName || !identifier || !password)
      return res.status(400).json({ success: false, message: "Required fields missing" });

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const exists = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (exists)
      return res.status(409).json({ success: false, message: "User already registered" });

    const hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      fullName,
      email: isEmail ? identifier : "",
      mobile: !isEmail ? identifier : "",
      password: hash,
      otp,
      otpExpires,
      isVerified: false,
    });

    if (isEmail) sendOtp(identifier, otp);
    res.status(201).json({ success: true, userId: user._id, message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- VERIFY SIGNUP OTP --------------------
router.post("/verify-signup-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "defaultsecret", {
      expiresIn: "7d",
    });

    res.json({ success: true, token, message: "Signup verified" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- SIGNIN --------------------
router.post("/signin", authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    if (!user.isVerified)
      return res.status(403).json({ success: false, message: "Account not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "defaultsecret", {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, mobile: user.mobile },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- PROFILE --------------------
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/profile", auth, async (req, res) => {
  try {
    const allowed = [
      "fullName",
      "email",
      "mobile",
      "alternateMobile",
      "age",
      "dob",
      "address",
      "city",
      "state",
      "pincode",
      "gender",
    ];

    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select(
      "-password -otp -otpExpires"
    );

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- FORGOT PASSWORD --------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log(`Forgot Password OTP for ${identifier}: ${otp}`);
    res.json({ success: true, userId: user._id, message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/verify-forgot-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
