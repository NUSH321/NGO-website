const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");
const router = express.Router();

const adminMiddleware = (req, res, next) => {
    const currentUser = req.user;
    if (currentUser.type === "admin") {
        return next();
    }
    return res.status(401).send("Unauthorized. Only admin users can access this resource.");
};

router.get("/", authMiddleware, adminMiddleware, eventController.getAllEvents);
router.get("/:id", authMiddleware, adminMiddleware, eventController.getEventById);
router.post("/", authMiddleware, adminMiddleware, eventController.createEvent);
router.put("/:id", authMiddleware, adminMiddleware, eventController.updateEvent);
router.delete("/:id", authMiddleware, adminMiddleware, eventController.deleteEvent);

module.exports = router;
