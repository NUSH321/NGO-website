// projectRoutes.js

const express = require("express");
const router = express.Router();
const projectController = require("../controllers/ProjectController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, projectController.getAllProjects);
router.get("/:id", authMiddleware, projectController.getProjectById);
router.post("/", authMiddleware, projectController.createProject);
router.put("/:id", authMiddleware, projectController.updateProjectById); // Updated method name
router.delete("/:id", authMiddleware, projectController.deleteProjectById); // Updated method name

module.exports = router;
