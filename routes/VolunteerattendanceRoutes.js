const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const volunteerAttendanceController = require("../controllers/VolunteerattendanceController");

router.get("/", authMiddleware, volunteerAttendanceController.getAllVolunteerAttendance);
router.get("/:id", authMiddleware, volunteerAttendanceController.getVolunteerAttendanceById);
router.post("/", authMiddleware, volunteerAttendanceController.createVolunteerAttendance);
router.put("/:id", authMiddleware, volunteerAttendanceController.updateVolunteerAttendance);
router.delete("/:id", authMiddleware, volunteerAttendanceController.deleteVolunteerAttendance);

module.exports = router;
