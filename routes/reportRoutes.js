const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

const router = express.Router();

// Route to get all reports with optional query parameters for pagination and filtering
router.get("/", authMiddleware, reportController.getAllReports);

// Route to get a specific report by ID
router.get("/:id", authMiddleware, reportController.getReportById);

// Route to create a new report
router.post("/", authMiddleware, reportController.createReport);

// Route to update a specific report by ID
router.put("/:id", authMiddleware, reportController.updateReportById);

// Route to delete a specific report by ID
router.delete("/:id", authMiddleware, reportController.deleteReportById);

module.exports = router;
