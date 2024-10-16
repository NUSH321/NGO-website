const express = require("express");
const router = express.Router();
const donorController = require("../controllers/donorController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, donorController.getAllDonors);
router.get("/:id", authMiddleware, donorController.getDonorById);
router.post("/", authMiddleware, donorController.createDonor);
router.put("/:id", authMiddleware, donorController.updateDonor);
router.delete("/:id", authMiddleware, donorController.deleteDonor);

module.exports = router;
