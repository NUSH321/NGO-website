const { Op } = require("sequelize");
const Beneficiary = require("../models/Beneficiary");
const logger = require("../utils/logger");
const { body, param, query, validationResult } = require("express-validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Beneficiary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         type:
 *           type: string
 *           enum:
 *             - beneficiary
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         pincode:
 *           type: string
 *         country:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum:
 *             - male
 *             - female
 *             - other
 *         profilePicture:
 *           type: string
 *         emergencyContactName:
 *           type: string
 *         emergencyContactPhone:
 *           type: string
 *         emergencyContactRelation:
 *           type: string
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
 *   name: Beneficiaries
 *   description: Endpoints for managing beneficiaries
 */

/**
 * @swagger
 * /api/beneficiaries:
 *   get:
 *     summary: Get all beneficiaries
 *     tags: [Beneficiaries]
 *     description: Retrieve a list of all beneficiaries. Requires admin authorization.
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
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search string to filter results
 *     responses:
 *       200:
 *         description: A paginated list of beneficiaries.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Beneficiary'
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
exports.getAllBeneficiaries = [
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
      return res.status(401).send("Unauthorized. Only admin users can view beneficiaries.");
    }

    let { page = 1, limit = 10, sortBy = "createdAt", order = "asc", search = "" } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;

    const validColumns = [
      "id", "username", "type", "email", "phone", "firstName", "lastName", "address",
      "city", "state", "pincode", "country", "dateOfBirth", "gender", "profilePicture",
      "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
      "createdAt", "updatedAt"
    ];

    sortBy = validColumns.includes(sortBy) ? sortBy : "createdAt";
    order = order.toLowerCase() === "desc" ? "desc" : "asc";
    const orderCondition = [[sortBy, order]];

    let searchCondition = {};
    if (search) {
      searchCondition = {
        [Op.or]: validColumns.map((field) => ({
          [field]: { [Op.iLike]: `%${search}%` }
        }))
      };
    }

    try {
      const { rows: beneficiaries, count } = await Beneficiary.findAndCountAll({
        where: searchCondition,
        order: orderCondition,
        limit,
        offset: (page - 1) * limit
      });

      const totalPages = Math.ceil(count / limit);

      beneficiaries.forEach((user) => {
        delete user.dataValues.password; // Ensure sensitive data like password is not sent
      });

      logger.info("Beneficiaries retrieved successfully by admin: " + currentUser.id);

      res.status(200).json({
        data: beneficiaries,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: page
        }
      });
    } catch (error) {
      logger.error(`Error fetching beneficiaries: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/beneficiaries/{id}:
 *   get:
 *     summary: Get a beneficiary by ID
 *     tags: [Beneficiaries]
 *     description: Retrieve a beneficiary by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the beneficiary to retrieve
 *     responses:
 *       200:
 *         description: A beneficiary object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiary'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Beneficiary not found.
 *       500:
 *         description: Internal server error.
 */
exports.getBeneficiaryById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can view beneficiaries.");
    }

    const { id } = req.params;

    try {
      const beneficiary = await Beneficiary.findByPk(id);

      if (!beneficiary) {
        logger.warn("Beneficiary not found with ID: " + id);
        return res.status(404).send("Beneficiary not found.");
      }

      delete beneficiary.dataValues.password;

      logger.info("Beneficiary retrieved successfully by admin: " + currentUser.id);

      res.status(200).json(beneficiary);
    } catch (error) {
      logger.error(`Error fetching beneficiary by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/beneficiaries:
 *   post:
 *     summary: Create a new beneficiary
 *     tags: [Beneficiaries]
 *     description: Create a new beneficiary.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum:
 *                   - beneficiary
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               country:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum:
 *                   - male
 *                   - female
 *                   - other
 *               profilePicture:
 *                 type: string
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               emergencyContactRelation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Beneficiary created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiary'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createBeneficiary = [
  body("username").isString().notEmpty(),
  body("password").isString().notEmpty(),
  body("type").isString().isIn(["beneficiary"]),
  body("email").isEmail(),
  body("phone").isString().optional(),
  body("firstName").isString().optional(),
  body("lastName").isString().optional(),
  body("address").isString().optional(),
  body("city").isString().optional(),
  body("state").isString().optional(),
  body("pincode").isString().optional(),
  body("country").isString().optional(),
  body("dateOfBirth").isDate().optional(),
  body("gender").isString().isIn(["male", "female", "other"]).optional(),
  body("profilePicture").isString().optional(),
  body("emergencyContactName").isString().optional(),
  body("emergencyContactPhone").isString().optional(),
  body("emergencyContactRelation").isString().optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can create beneficiaries.");
    }

    const beneficiaryData = req.body;

    try {
      const beneficiary = await Beneficiary.create(beneficiaryData);
      logger.info("Beneficiary created successfully by admin: " + currentUser.id);
      res.status(201).json(beneficiary);
    } catch (error) {
      logger.error(`Error creating beneficiary: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/beneficiaries/{id}:
 *   put:
 *     summary: Update a beneficiary by ID
 *     tags: [Beneficiaries]
 *     description: Update the details of a beneficiary by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the beneficiary to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum:
 *                   - beneficiary
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               country:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum:
 *                   - male
 *                   - female
 *                   - other
 *               profilePicture:
 *                 type: string
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               emergencyContactRelation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Beneficiary updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Beneficiary'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Beneficiary not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateBeneficiary = [
  param("id").isInt(),
  body("username").isString().optional(),
  body("password").isString().optional(),
  body("type").isString().optional().isIn(["beneficiary"]),
  body("email").isEmail().optional(),
  body("phone").isString().optional(),
  body("firstName").isString().optional(),
  body("lastName").isString().optional(),
  body("address").isString().optional(),
  body("city").isString().optional(),
  body("state").isString().optional(),
  body("pincode").isString().optional(),
  body("country").isString().optional(),
  body("dateOfBirth").isDate().optional(),
  body("gender").isString().optional().isIn(["male", "female", "other"]),
  body("profilePicture").isString().optional(),
  body("emergencyContactName").isString().optional(),
  body("emergencyContactPhone").isString().optional(),
  body("emergencyContactRelation").isString().optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can update beneficiaries.");
    }

    const { id } = req.params;
    const updateData = req.body;

    try {
      const beneficiary = await Beneficiary.findByPk(id);
      if (!beneficiary) {
        logger.warn("Beneficiary not found with ID: " + id);
        return res.status(404).send("Beneficiary not found.");
      }

      await beneficiary.update(updateData);

      logger.info("Beneficiary updated successfully by admin: " + currentUser.id);

      res.status(200).json(beneficiary);
    } catch (error) {
      logger.error(`Error updating beneficiary: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/beneficiaries/{id}:
 *   delete:
 *     summary: Delete a beneficiary by ID
 *     tags: [Beneficiaries]
 *     description: Delete a beneficiary by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the beneficiary to delete
 *     responses:
 *       204:
 *         description: Beneficiary deleted successfully
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Beneficiary not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteBeneficiary = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can delete beneficiaries.");
    }

    const { id } = req.params;

    try {
      const beneficiary = await Beneficiary.findByPk(id);
      if (!beneficiary) {
        logger.warn("Beneficiary not found with ID: " + id);
        return res.status(404).send("Beneficiary not found.");
      }

      await beneficiary.destroy();

      logger.info("Beneficiary deleted successfully by admin: " + currentUser.id);

      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting beneficiary: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];
