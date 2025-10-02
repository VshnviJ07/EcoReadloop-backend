import express from "express";
import User from "../models/User.js";
import Book from "../models/Book.js";

const router = express.Router();

// Middleware to check admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

// ✅ Get all users
router.get("/users", isAdmin, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// ✅ Delete a user by ID
router.delete("/user/:id", isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted successfully" });
});

// ✅ Get all books
router.get("/books", isAdmin, async (req, res) => {
  const books = await Book.find().populate("uploadedBy", "name email");
  res.json(books);
});

// ✅ Delete a book by ID
router.delete("/book/:id", isAdmin, async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: "Book deleted successfully" });
});

export default router;
