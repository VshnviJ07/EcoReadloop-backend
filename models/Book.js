const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
    },
    author: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },

    category: {
      type: String,
      enum: [
        "Fiction",
        "Non-Fiction",
        "Education",
        "Competition",
        "Comics",
        "Biography",
      ],
      required: [true, "Category is required"],
    },

    condition: {
      type: String,
      enum: ["New", "Used"],
      default: "Used",
    },

    price: { type: Number, default: 0 },

    // Listing type: sell | rent | donate
    type: {
      type: String,
      enum: ["sell", "rent", "donate"],
      required: [true, "Listing type is required"],
      lowercase: true, // ✅ normalize to lowercase
      trim: true,
    },

    rentDuration: { type: String, default: null },
    imageUrl: { type: String, default: "" },

    // ✅ Seller reference (important for mybooks API)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    purchasedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    soldOut: { type: Boolean, default: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ GeoJSON location (lng, lat)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
        required: true,
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val.every((num) => typeof num === "number")
            );
          },
          message: "Coordinates must be an array of two numbers [lng, lat]",
        },
      },
    },
  },
  { timestamps: true }
);

// ✅ Index for geospatial queries
BookSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Book", BookSchema);
