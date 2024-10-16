// authRoutes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Register routes
router.post("/register/admin", authController.adminRegister);
router.post("/register/volunteer", authMiddleware, authController.volunteerRegister); // Adjusted for NGO
router.post("/login", authController.login);

module.exports = router;
router.get("/test", (req, res) => {
  res.send("Test route working!");
});
