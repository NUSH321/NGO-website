require("dotenv").config(); // Load environment variables
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  // Extract token from the Authorization header
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    // Remove the Bearer prefix if present
    const tokenWithoutBearer = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    
    // Verify the token
    const decoded = jwt.verify(tokenWithoutBearer, process.env.SECRET);
    
    // Find the user associated with the token
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).send("User not found.");

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      type: user.type,
    };

    // Call the next middleware or route handler
    next();
  } catch (ex) {
    // Handle errors (avoid exposing detailed error messages)
    res.status(400).send("Invalid token.");
  }
};
