const { Op } = require("sequelize");
const Employee = require("../models/Employee");
const logger = require("../utils/logger");
const { body, param, query, validationResult } = require("express-validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique identifier for the employee
 *         user_id:
 *           type: integer
 *           description: Reference to the user ID
 *         role:
 *           type: string
 *           description: The role of the employee within the NGO
 *         salary:
 *           type: number
 *           format: decimal
 *           description: The salary of the employee
 *         dateOfJoining:
 *           type: string
 *           format: date-time
 *           description: The date the employee joined the NGO
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Endpoints for managing employees within the NGO.
 */

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     description: Retrieve a list of all employees within the NGO. Requires admin authorization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search string to filter results
 *     responses:
 *       200:
 *         description: A paginated list of employees.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.getAllEmployees = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1 }),
  query("sortBy").optional().isString(),
  query("order").optional().isString().isIn(["asc", "desc"]),
  query("search").optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res
        .status(401)
        .send("Unauthorized. Only admin users can view employees.");
    }

    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "asc",
      search = "",
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;

    const validColumns = ["user_id", "role", "salary", "dateOfJoining", "createdAt", "updatedAt"];
    sortBy = validColumns.includes(sortBy) ? sortBy : "createdAt";
    order = order.toLowerCase() === "desc" ? "desc" : "asc";
    const orderCondition = [[sortBy, order]];

    let searchCondition = {};
    if (search) {
      searchCondition = {
        [Op.or]: validColumns.map((field) => ({
          [field]: { [Op.iLike]: `%${search}%` },
        })),
      };
    }

    try {
      const { rows: employees, count } = await Employee.findAndCountAll({
        where: {
          ...searchCondition,
        },
        order: orderCondition,
        limit,
        offset: (page - 1) * limit,
      });

      const totalPages = Math.ceil(count / limit);

      logger.info("Employees retrieved successfully by admin: " + currentUser.id);

      res.status(200).json({
        data: employees,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      logger.error(`Error fetching employees: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     description: Retrieve an employee by ID within the NGO.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the employee to retrieve
 *     responses:
 *       200:
 *         description: An employee object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
exports.getEmployeeById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res
        .status(401)
        .send("Unauthorized. Only admin users can view employees.");
    }

    const { id } = req.params;

    try {
      const employee = await Employee.findByPk(id);

      if (!employee) {
        logger.warn("Employee not found with ID: " + id);
        return res.status(404).send("Employee not found.");
      }

      logger.info("Employee retrieved successfully by admin: " + currentUser.id);

      res.status(200).json(employee);
    } catch (error) {
      logger.error(`Error fetching employee by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     description: Create a new employee within the NGO.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Reference to the user ID
 *               role:
 *                 type: string
 *                 description: The role of the employee within the NGO
 *               salary:
 *                 type: number
 *                 format: decimal
 *                 description: The salary of the employee
 *               dateOfJoining:
 *                 type: string
 *                 format: date-time
 *                 description: The date the employee joined the NGO
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Bad request. Invalid employee data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createEmployee = [
  body("user_id").isInt().notEmpty(),
  body("role").isString().notEmpty(),
  body("salary").optional().isDecimal(),
  body("dateOfJoining").isISO8601().toDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res
        .status(401)
        .send("Unauthorized. Only admin users can create employees.");
    }

    const employeeData = req.body;

    try {
      const newEmployee = await Employee.create(employeeData);

      logger.info("Employee created successfully by admin: " + currentUser.id);

      res.status(201).json(newEmployee);
    } catch (error) {
      logger.error(`Error creating employee: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update an employee
 *     tags: [Employees]
 *     description: Update an existing employee's information within the NGO.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the employee to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 description: The role of the employee within the NGO
 *               salary:
 *                 type: number
 *                 format: decimal
 *                 description: The salary of the employee
 *               dateOfJoining:
 *                 type: string
 *                 format: date-time
 *                 description: The date the employee joined the NGO
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Bad request. Invalid employee data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateEmployee = [
  param("id").isInt(),
  body("role").optional().isString(),
  body("salary").optional().isDecimal(),
  body("dateOfJoining").optional().isISO8601().toDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res
        .status(401)
        .send("Unauthorized. Only admin users can update employees.");
    }

    const { id } = req.params;
    const employeeData = req.body;

    try {
      const [updated] = await Employee.update(employeeData, {
        where: { id },
        returning: true,
      });

      if (updated === 0) {
        logger.warn("Employee not found with ID: " + id);
        return res.status(404).send("Employee not found.");
      }

      logger.info("Employee updated successfully by admin: " + currentUser.id);

      const updatedEmployee = await Employee.findByPk(id);
      res.status(200).json(updatedEmployee);
    } catch (error) {
      logger.error(`Error updating employee: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete an employee
 *     tags: [Employees]
 *     description: Delete an employee from the NGO.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the employee to delete
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Employee not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteEmployee = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res
        .status(401)
        .send("Unauthorized. Only admin users can delete employees.");
    }

    const { id } = req.params;

    try {
      const deleted = await Employee.destroy({
        where: { id },
      });

      if (deleted === 0) {
        logger.warn("Employee not found with ID: " + id);
        return res.status(404).send("Employee not found.");
      }

      logger.info("Employee deleted successfully by admin: " + currentUser.id);

      res.status(200).send("Employee deleted successfully.");
    } catch (error) {
      logger.error(`Error deleting employee: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];
