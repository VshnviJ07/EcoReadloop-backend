const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

dotenv.config();
const app = express();

// ---------------- Middleware ----------------
const corsOptions = {
  origin: ["http://localhost:3000","http://localhost:5173"],           // React dev server
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // allow auth header
  credentials: true,
};
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
app.options("*", cors(corsOptions));

app.use(express.json());

// ---------------- Ensure uploads folder exists ----------------
const uploadDir = path.join(__dirname, "uploads/books");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created folder: ${uploadDir}`);
}

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- Routes ----------------
try {
  const authRoutes = require("./routes/auth");
  const bookRoutes = require("./routes/book");
  const userRoutes = require("./routes/user");
  const adminRoutes = require("./routes/admin");
  const locationRoutes = require("./routes/location");

  if (authRoutes && authRoutes.stack) app.use("/api/auth", authRoutes);
  if (bookRoutes && bookRoutes.stack) app.use("/api/books", bookRoutes);
  if (userRoutes && userRoutes.stack) app.use("/api/users", userRoutes);
  if (adminRoutes && adminRoutes.stack) app.use("/api/admin", adminRoutes);
  if (locationRoutes && locationRoutes.stack) app.use("/api/location", locationRoutes);
} catch (err) {
  console.error("❌ Error importing routes:", err);
}

// ---------------- Root ----------------
app.get("/", (req, res) => {
  res.send("EcoReadLoop Backend is running ✅");
});

// ---------------- MongoDB Connection ----------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("DB error ❌", err));

// ---------------- Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
