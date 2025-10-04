const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");

const router = express.Router();

// -------------------- RATE LIMITER --------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// -------------------- EMAIL OTP SENDER --------------------
const sendOtpEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("⚠️ EMAIL credentials missing in environment");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"EcoReadLoop" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code - EcoReadLoop",
      text: `Your OTP is: ${otp} (valid for 5 minutes).`,
    });
  } catch (err) {
    console.error("❌ OTP email error:", err.message);
  }
};

// -------------------- SIGNUP --------------------
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { fullName, identifier, password, age, city, address } = req.body;
    if (!fullName || !identifier || !password)
      return res.status(400).json({ success: false, message: "Full name, email/mobile & password required." });

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const exists = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (exists) return res.status(409).json({ success: false, message: "User already registered." });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });

    const hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.create({
      fullName,
      email: isEmail ? identifier : "",
      mobile: !isEmail ? identifier : "",
      password: hash,
      age: age || null,
      city: city || "",
      address: address || "",
      otp,
      otpExpires,
      isVerified: false,
    });

    if (isEmail) await sendOtpEmail(identifier, otp);

    res.status(201).json({
      success: true,
      message: "OTP sent to email/mobile for verification.",
      userId: user._id,
    });
  } catch (err) {
    console.error("❌ Signup error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- VERIFY SIGNUP OTP --------------------
router.post("/verify-signup-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true;
    await user.save();

    res.json({ success: true, message: "Signup verified successfully." });
  } catch (err) {
    console.error("❌ Verify signup OTP error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- SIGNIN --------------------
router.post("/signin", authLimiter, async (req, res) => {
  try {
    const { identifier, password, useOtp } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (!user.isVerified)
      return res.status(403).json({ success: false, message: "Account not verified." });

    if (useOtp) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();
      if (user.email) await sendOtpEmail(user.email, otp);
      return res.json({ success: true, message: "OTP sent.", userId: user._id });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      message: "Signin successful.",
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, mobile: user.mobile },
    });
  } catch (err) {
    console.error("❌ Signin error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- VERIFY SIGNIN OTP --------------------
router.post("/verify-signin-otp", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true,
      message: "Signin verified successfully.",
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, mobile: user.mobile },
    });
  } catch (err) {
    console.error("❌ Verify signin OTP error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- FORGOT PASSWORD --------------------
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    if (user.email) await sendOtpEmail(user.email, otp);
    res.json({ success: true, message: "OTP sent for password reset.", userId: user._id });
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- RESET PASSWORD --------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ success: true, message: "Password reset successful." });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- GET PROFILE --------------------
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Profile fetch error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// -------------------- UPDATE PROFILE --------------------
router.patch("/profile", auth, async (req, res) => {
  try {
    const allowedFields = [
      "fullName", "email", "mobile", "alternateMobile", "age", "dob",
      "address", "city", "state", "pincode", "gender",
    ];

    const updates = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updates[field] = req.body[field];

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.json({ success: true, message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("❌ Profile update error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
