require("dotenv").config(); // Load environment variables
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  // Extract token from the Authorization header
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Access denied. No token provided.");

  // Check token format (assuming 'Bearer <token>')
  const tokenValue = token.split(" ")[1];
  if (!tokenValue) return res.status(401).json({ message: "Invalid token format." });

  try {
    // Verify and decode the token using the secret key from .env
    const decoded = jwt.verify(tokenValue, process.env.SECRET);

    // Find the user in the database
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      type: user.type, // assuming 'type' is a field in your User model
    };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Catch and handle errors (token expired, invalid signature, etc.)
    res.status(400).json({ message: "Invalid token.", error: error.message });
  }
};
