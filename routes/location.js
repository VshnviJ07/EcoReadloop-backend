const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// ---------------- Save or Update User Location ----------------
router.post("/set-location", auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Valid latitude and longitude are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Save location as GeoJSON (Render-safe)
    user.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)], // [lng, lat]
    };

    await user.save();

    res.json({
      success: true,
      message: "Location updated successfully",
      location: user.location,
    });
  } catch (err) {
    console.error("❌ Set location error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error updating location" });
  }
});

// ---------------- Get Current User Location ----------------
router.get("/get-location", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("location");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.location || !Array.isArray(user.location.coordinates)) {
      return res
        .status(404)
        .json({ success: false, message: "Location not set yet" });
    }

    res.json({ success: true, location: user.location });
  } catch (err) {
    console.error("❌ Get location error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching location" });
  }
});

module.exports = router;
