const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// 📍 Save or update user location
router.post("/set-location", auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Save location as GeoJSON Point
    user.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)], // [lng, lat]
    };

    await user.save();

    res.json({ success: true, message: "Location updated successfully", location: user.location });
  } catch (err) {
    console.error("Set location error:", err);
    res.status(500).json({ success: false, message: "Error updating location" });
  }
});

// 📍 Get current user location
router.get("/get-location", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("location");
    if (!user || !user.location) {
      return res.status(404).json({ success: false, message: "Location not set" });
    }

    res.json({ success: true, location: user.location });
  } catch (err) {
    console.error("Get location error:", err);
    res.status(500).json({ success: false, message: "Error fetching location" });
  }
});

module.exports = router;
