const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/books"); // 📁 create this folder in your project root
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ---------------- Add New Book ----------------
router.post("/add", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, author, category, description, type, price, rentDuration } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const newBook = new Book({
      title,
      author,
      category,
      description,
      type,
      price: type.toLowerCase() !== "donate" ? price : 0,
      rentDuration,
      seller: req.user.id,
      imageUrl: `/uploads/books/${req.file.filename}`, // store file path
    });

    await newBook.save();

    res.json({ success: true, message: "Book added successfully", book: newBook });
  } catch (err) {
    console.error("❌ Error adding book:", err);
    res.status(500).json({ success: false, message: "Server error while adding book" });
  }
});

// ---------------- Get All Books (Public) ----------------
router.get("/all", async (req, res) => {
  try {
    const books = await Book.find()
      .populate("seller", "fullName email mobile city state")
      .sort({ createdAt: -1 });

    res.json({ success: true, books });
  } catch (err) {
    console.error("❌ Error fetching all books:", err);
    res.status(500).json({ success: false, books: [], message: "Server error" });
  }
});

// Get Books by Category (Public)
router.get("/category/:category", async (req, res) => {
  try {
    const categories = decodeURIComponent(req.params.category)
      .split(",")
      .map((c) => c.trim());

    const books = await Book.find({ category: { $in: categories } })
      .populate("seller", "fullName email mobile city state")
      .sort({ createdAt: -1 });

    res.json({ success: true, books });
  } catch (err) {
    console.error("❌ Error fetching books by category:", err);
    res
      .status(500)
      .json({ success: false, books: [], message: "Server error" });
  }
});


// ---------------- Get My Uploaded, Purchased & Nearby Books ----------------
router.get("/mybooks", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Uploaded books
    const uploadedBooks = await Book.find({ seller: userId }).populate("seller", "fullName email mobile city state");

    const uploaded = { sell: [], rent: [], donate: [] };
    uploadedBooks.forEach(b => {
      const t = (b.type || "").toLowerCase();
      if (t === "sell") uploaded.sell.push(b);
      else if (t === "rent") uploaded.rent.push(b);
      else if (t === "donate") uploaded.donate.push(b);
    });

    // Purchased books
    const purchasedBooks = await Book.find({ purchasedBy: userId }).populate("seller", "fullName email mobile city state");

    // Nearby books
    const { lat, lng } = req.query;
    let nearby = { sell: [], rent: [], donate: [] };

    if (lat && lng) {
      const nearbyBooks = await Book.find({
        seller: { $ne: userId },
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: 5000,
          },
        },
      }).populate("seller", "fullName email mobile city state");

      nearbyBooks.forEach(b => {
        const t = (b.type || "").toLowerCase();
        if (t === "sell") nearby.sell.push(b);
        else if (t === "rent") nearby.rent.push(b);
        else if (t === "donate") nearby.donate.push(b);
      });
    }

    res.json({ success: true, uploaded, purchased: purchasedBooks || [], nearby });
  } catch (err) {
    console.error("❌ Error fetching my books:", err);
    res.status(500).json({
      success: false,
      uploaded: { sell: [], rent: [], donate: [] },
      purchased: [],
      nearby: { sell: [], rent: [], donate: [] },
      message: "Server error while fetching my books",
    });
  }
});

// ---------------- Toggle Wishlist ----------------
router.post("/wishlist/:bookId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let book = await Book.findById(req.params.bookId);

    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    if (book.wishlist.some(id => id.toString() === userId)) book.wishlist.pull(userId);
    else book.wishlist.push(userId);

    await book.save();

    book = await Book.findById(req.params.bookId).populate("seller", "fullName email mobile city state");

    res.json({ success: true, book });
  } catch (err) {
    console.error("❌ Error toggling wishlist:", err);
    res.status(500).json({ success: false, message: "Server error while updating wishlist" });
  }
});

// ---------------- Get My Wishlist ----------------
router.get("/my-wishlist", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlistBooks = await Book.find({ wishlist: userId }).populate("seller", "fullName email mobile city state");

    res.json({ success: true, wishlist: wishlistBooks || [] });
  } catch (err) {
    console.error("❌ Error fetching wishlist:", err);
    res.status(500).json({ success: false, wishlist: [], message: "Server error while fetching wishlist" });
  }
});

module.exports = router;
