const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiaryController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get all beneficiaries
router.get('/', authMiddleware, beneficiaryController.getAllBeneficiaries);

// Route to get a beneficiary by ID
router.get('/:id', authMiddleware, beneficiaryController.getBeneficiaryById);

// Route to create a new beneficiary
router.post('/', authMiddleware, beneficiaryController.createBeneficiary);

// Route to update a beneficiary by ID
router.put('/:id', authMiddleware, beneficiaryController.updateBeneficiary);

// Route to delete a beneficiary by ID
router.delete('/:id', authMiddleware, beneficiaryController.deleteBeneficiary);

module.exports = router;
