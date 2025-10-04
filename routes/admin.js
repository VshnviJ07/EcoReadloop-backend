import express from "express";
import User from "../models/User.js";
import Book from "../models/Book.js";

const router = express.Router();

// ✅ Middleware to check admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

// ✅ Get all users
router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
});

// ✅ Delete a user by ID
router.delete("/user/:id", isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error });
  }
});

// ✅ Get all books
router.get("/books", isAdmin, async (req, res) => {
  try {
    const books = await Book.find().populate("seller", "name email");
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch books", error });
  }
});

// ✅ Delete a book by ID
router.delete("/book/:id", isAdmin, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete book", error });
  }
});

export default router;
