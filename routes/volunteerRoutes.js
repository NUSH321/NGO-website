const express = require('express');
const router = express.Router();
const { getAllVolunteers, getVolunteerById, createVolunteer, deleteVolunteerById, updateVolunteerById } = require('../controllers/volunteerController');

// Middleware to authenticate and authorize might be applied here
// For example:
// const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getAllVolunteers);
router.get('/:id', getVolunteerById);
router.post('/', createVolunteer);
router.delete('/:id', deleteVolunteerById);
router.put('/:id', updateVolunteerById);

module.exports = router;

