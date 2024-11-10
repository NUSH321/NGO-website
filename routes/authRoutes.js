
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register/admin", authController.adminRegister);
router.post("/register/ngoadmin", authMiddleware, authController.ngoAdminRegister);
router.post("/login", authController.login);

module.exports = router;
