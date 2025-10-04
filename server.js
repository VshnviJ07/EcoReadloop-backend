const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();

// ---------------- Middleware ----------------

// Allow local dev & deployed frontend
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ecoreadloop.onrender.com", // your Render frontend
    "https://ecoreadloop.netlify.app",  // optional Netlify frontend
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" })); // safe JSON body size

// ---------------- Ensure uploads folder exists ----------------
const uploadDir = path.join(__dirname, "uploads/books");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created folder: ${uploadDir}`);
}

// Serve uploaded book images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- Routes ----------------
// Make sure all route files use `module.exports = router;`
// NOT `export default router;`
try {
  const authRoutes = require("./routes/auth");
  const bookRoutes = require("./routes/book");
  const userRoutes = require("./routes/user");
  const adminRoutes = require("./routes/admin");
  const locationRoutes = require("./routes/location");

  app.use("/api/auth", authRoutes);
  app.use("/api/books", bookRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/location", locationRoutes);
} catch (err) {
  console.error("❌ Error importing routes:", err);
}

// ---------------- Root ----------------
app.get("/", (req, res) => {
  res.send("🌿 EcoReadLoop Backend is running successfully ✅");
});

// ---------------- MongoDB Connection ----------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------------- Server ----------------
const PORT = process.env.PORT || 5000;

// Render assigns dynamic port, host must be 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
