const { Op } = require("sequelize");
const User = require("../models/User");
const logger = require("../utils/logger");
const { body, param, query, validationResult } = require("express-validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         type:
 *           type: string
 *           enum:
 *             - admin
 *             - school_admin
 *             - employee
 *             - student
 *             - parent
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
 *   name: Users
 *   description: End point for Users
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     description: Retrieve a list of all users. Requires admin authorization.
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
 *         description: A paginated list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
exports.getAllUsers = [
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
        .send("Unauthorized. Only admin users can view users.");
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

    const validColumns = [
      "id",
      "username",
      "type",
      "email",
      "phone",
      "firstName",
      "lastName",
      "address",
      "city",
      "state",
      "pincode",
      "country",
      "dateOfBirth",
      "gender",
      "profilePicture",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelation",
      "createdAt",
      "updatedAt",
    ];

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
      const { rows: users, count } = await User.findAndCountAll({
        where: {
          ...searchCondition,
        },
        order: orderCondition,
        limit,
        offset: (page - 1) * limit,
      });

      const totalPages = Math.ceil(count / limit);

      users.forEach((user) => {
        delete user.dataValues.password; // Ensure sensitive data like password is not sent
      });

      logger.info("Users retrieved successfully by admin: " + currentUser.id);

      res.status(200).json({
        data: users,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      logger.error(`Error fetching users: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     description: Retrieve a user by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: A user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
exports.getUserById = [
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
        .send("Unauthorized. Only admin users can view users.");
    }

    const { id } = req.params;

    try {
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn("User not found with ID: " + id);
        return res.status(404).send("User not found.");
      }

      delete user.dataValues.password;

      logger.info("User retrieved successfully by admin: " + currentUser.id);

      res.status(200).json(user);
    } catch (error) {
      logger.error(`Error fetching user by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     description: Create a new user.
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
 *                   - admin
 *                   - school_admin
 *                   - employee
 *                   - student
 *                   - parent
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
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request. Invalid user data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createUser = [
  body("username").isString().notEmpty(),
  body("password").isString().notEmpty(),
  body("type").isIn(["admin", "school_admin", "employee", "student", "parent"]),
  body("email").isEmail(),
  body("phone").isString().isLength({ min: 10, max: 10 }),
  body("firstName").isString().notEmpty(),
  body("lastName").isString().notEmpty(),
  body("address").isString().notEmpty(),
  body("city").isString().notEmpty(),
  body("state").isString().notEmpty(),
  body("pincode").isString().isLength({ min: 6, max: 6 }),
  body("country").isString().notEmpty(),
  body("dateOfBirth").isDate(),
  body("gender").isIn(["male", "female", "other"]),
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
        .send("Unauthorized. Only admin users can create new users.");
    }

    const userData = req.body;

    try {
      const newUser = await User.create(userData);
      delete newUser.dataValues.password;

      logger.info("User created successfully by admin: " + currentUser.id);

      res.status(201).json(newUser);
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     description: Update a user by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum:
 *                   - admin
 *                   - school_admin
 *                   - employee
 *                   - student
 *                   - parent
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
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request. Invalid user data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateUser = [
  param("id").isInt(),
  body("username").optional().isString().notEmpty(),
  body("type")
    .optional()
    .isIn(["admin", "school_admin", "employee", "student", "parent"]),
  body("email").optional().isEmail(),
  body("phone").optional().isString().isLength({ min: 10, max: 10 }),
  body("firstName").optional().isString().notEmpty(),
  body("lastName").optional().isString().notEmpty(),
  body("address").optional().isString().notEmpty(),
  body("city").optional().isString().notEmpty(),
  body("state").optional().isString().notEmpty(),
  body("pincode").optional().isString().isLength({ min: 6, max: 6 }),
  body("country").optional().isString().notEmpty(),
  body("dateOfBirth").optional().isDate(),
  body("gender").optional().isIn(["male", "female", "other"]),
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
        .send("Unauthorized. Only admin users can update users.");
    }

    const { id } = req.params;
    const userData = req.body;

    try {
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn("User not found with ID: " + id);
        return res.status(404).send("User not found.");
      }

      await user.update(userData);
      delete user.dataValues.password;

      logger.info("User updated successfully by admin: " + currentUser.id);

      res.status(200).json(user);
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     description: Delete a user by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to delete
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteUser = [
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
        .send("Unauthorized. Only admin users can delete users.");
    }

    const { id } = req.params;

    try {
      const user = await User.findByPk(id);

      if (!user) {
        logger.warn("User not found with ID: " + id);
        return res.status(404).send("User not found.");
      }

      await user.destroy();

      logger.info("User deleted successfully by admin: " + currentUser.id);

      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];