const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    // Check both lowercase and capitalized headers (for different proxies)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided. Authorization denied." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token missing from authorization header." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID to request object
    req.user = { id: decoded.id };

    next();
  } catch (err) {
    console.error("🔒 Auth middleware error:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token has expired." });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }

    return res
      .status(401)
      .json({ success: false, message: "Authorization failed. Please login again." });
  }
};
