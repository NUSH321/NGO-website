const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/', employeeController.getAllEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee); // Ensure this handler is defined
router.delete('/:id', employeeController.deleteEmployee); // Ensure this handler is defined

module.exports = router;
