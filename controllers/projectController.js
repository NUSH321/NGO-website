const { Op } = require("sequelize");
const Project = require("../models/Project");
const logger = require("../utils/logger");
const { body, param, query, validationResult } = require("express-validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         createdBy:
 *           type: integer
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
 *   name: Projects
 *   description: Endpoints for Projects
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     description: Retrieve a list of all projects. Requires admin authorization.
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
 *         description: A paginated list of projects.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
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
exports.getAllProjects = [
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
      return res.status(401).send("Unauthorized. Only admin users can view projects.");
    }

    let { page = 1, limit = 10, sortBy = "createdAt", order = "asc", search = "" } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;

    const validColumns = [
      "id", "name", "description", "startDate", "endDate", "createdBy", "createdAt", "updatedAt"
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
      const { rows: projects, count } = await Project.findAndCountAll({
        where: searchCondition,
        order: orderCondition,
        limit,
        offset: (page - 1) * limit
      });

      const totalPages = Math.ceil(count / limit);

      logger.info("Projects retrieved successfully by admin: " + currentUser.id);

      res.status(200).json({
        data: projects,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: page
        }
      });
    } catch (error) {
      logger.error(`Error fetching projects: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     description: Retrieve a project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to retrieve
 *     responses:
 *       200:
 *         description: A project object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
exports.getProjectById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can view projects.");
    }

    const { id } = req.params;

    try {
      const project = await Project.findByPk(id);

      if (!project) {
        logger.warn("Project not found with ID: " + id);
        return res.status(404).send("Project not found.");
      }

      logger.info("Project retrieved successfully by admin: " + currentUser.id);

      res.status(200).json(project);
    } catch (error) {
      logger.error(`Error fetching project by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     description: Create a new project.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               createdBy:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Project created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request. Invalid input data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createProject = [
  body("name").isString().notEmpty(),
  body("description").isString().notEmpty(),
  body("startDate").isISO8601().toDate(),
  body("endDate").isISO8601().toDate(),
  body("createdBy").isInt().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can create projects.");
    }

    const { name, description, startDate, endDate, createdBy } = req.body;

    try {
      const newProject = await Project.create({
        name,
        description,
        startDate,
        endDate,
        createdBy
      });

      logger.info("Project created successfully by admin: " + currentUser.id);

      res.status(201).json(newProject);
    } catch (error) {
      logger.error(`Error creating project: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project by ID
 *     tags: [Projects]
 *     description: Update a project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Project updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request. Invalid input data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateProjectById = [
  param("id").isInt(),
  body("name").isString().notEmpty(),
  body("description").isString().notEmpty(),
  body("startDate").isISO8601().toDate(),
  body("endDate").isISO8601().toDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can update projects.");
    }

    const { id } = req.params;
    const { name, description, startDate, endDate } = req.body;

    try {
      const project = await Project.findByPk(id);

      if (!project) {
        logger.warn("Project not found with ID: " + id);
        return res.status(404).send("Project not found.");
      }

      project.name = name;
      project.description = description;
      project.startDate = startDate;
      project.endDate = endDate;

      await project.save();

      logger.info("Project updated successfully by admin: " + currentUser.id);

      res.status(200).json(project);
    } catch (error) {
      logger.error(`Error updating project by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project by ID
 *     tags: [Projects]
 *     description: Delete a project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to delete
 *     responses:
 *       204:
 *         description: Project deleted successfully.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteProjectById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== "admin") {
      logger.warn("Unauthorized access attempt by user: " + currentUser.id);
      return res.status(401).send("Unauthorized. Only admin users can delete projects.");
    }

    const { id } = req.params;

    try {
      const project = await Project.findByPk(id);

      if (!project) {
        logger.warn("Project not found with ID: " + id);
        return res.status(404).send("Project not found.");
      }

      await project.destroy();

      logger.info("Project deleted successfully by admin: " + currentUser.id);

      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting project by ID: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message]
      });
    }
  },
];
