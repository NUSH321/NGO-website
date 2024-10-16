const { Op } = require("sequelize");
const Report = require("../models/Report");
const User = require("../models/User");
const logger = require("../utils/logger");
const { body, query, param, validationResult } = require("express-validator");

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         beneficiary_id:
 *           type: integer
 *         aid_amount:
 *           type: number
 *         aid_date:
 *           type: string
 *           format: date
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
 *   name: Reports
 *   description: Endpoints for managing reports of beneficiaries receiving aid
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     description: Retrieve a list of all reports. Access based on user type.
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
 *         description: A paginated list of reports.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
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
 *         description: Unauthorized. User lacks proper privileges.
 *       500:
 *         description: Internal server error.
 */
exports.getAllReports = [
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

    const validColumns = ["id", "beneficiary_id", "aid_amount", "aid_date", "createdAt", "updatedAt"];
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
      let whereCondition = { ...searchCondition };

      if (currentUser.type === "ngo_admin") {
        whereCondition.ngo_id = currentUser.ngo_id;
      }

      const { rows: reports, count } = await Report.findAndCountAll({
        where: whereCondition,
        include: [{ model: User, as: "beneficiary" }],
        order: orderCondition,
        limit,
        offset: (page - 1) * limit,
      });

      const totalPages = Math.ceil(count / limit);

      logger.info("Reports retrieved successfully by user: " + currentUser.id);

      res.status(200).json({
        data: reports,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      logger.error(`Error fetching reports: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a report by ID
 *     tags: [Reports]
 *     description: Retrieve a report by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the report to retrieve
 *     responses:
 *       200:
 *         description: A report object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized. User lacks the necessary privileges.
 *       404:
 *         description: Report not found.
 *       500:
 *         description: Internal server error.
 */
exports.getReportById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;
    const { id } = req.params;

    try {
      const report = await Report.findByPk(id, {
        include: [
          {
            model: User,
            as: 'beneficiary',
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      if (!report) {
        logger.warn("Report not found with ID: " + id);
        return res.status(404).send("Report not found.");
      }

      if (
        currentUser.type === "admin" ||
        (currentUser.type === "ngo_admin" && currentUser.ngo_id === report.ngo_id)
      ) {
        logger.info("Report retrieved successfully by user: " + currentUser.id);
        return res.status(200).json(report);
      } else {
        logger.warn("Unauthorized access attempt by user: " + currentUser.id);
        return res.status(401).send("Unauthorized. You do not have access to this report.");
      }
    } catch (error) {
      logger.error(`Error fetching report by ID: ${error.message}`);
      return res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     description: Create a new report. Only admin and NGO admin (for their own NGO) have permission.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beneficiary_id
 *               - aid_amount
 *               - aid_date
 *             properties:
 *               beneficiary_id:
 *                 type: integer
 *               aid_amount:
 *                 type: number
 *               aid_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       400:
 *         description: Bad request. Validation errors.
 *       401:
 *         description: Unauthorized. User lacks the necessary privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createReport = [
  body("beneficiary_id").isInt().withMessage("beneficiary_id must be an integer"),
  body("aid_amount").isFloat({ min: 0 }).withMessage("aid_amount must be a positive number"),
  body("aid_date").isISO8601().withMessage("aid_date must be a valid date"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;
    const { beneficiary_id, aid_amount, aid_date } = req.body;

    try {
      const report = await Report.create({
        beneficiary_id,
        aid_amount,
        aid_date,
        ngo_id: currentUser.ngo_id,
      });

      logger.info("Report created successfully by user: " + currentUser.id);
      res.status(201).json(report);
    } catch (error) {
      logger.error(`Error creating report: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Update a report by ID
 *     tags: [Reports]
 *     description: Update a report's details. Only admin and NGO admin (for their own NGO) can update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the report to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               beneficiary_id:
 *                 type: integer
 *               aid_amount:
 *                 type: number
 *               aid_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Report updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       400:
 *         description: Bad request. Validation errors.
 *       401:
 *         description: Unauthorized. User lacks the necessary privileges.
 *       404:
 *         description: Report not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateReportById = [
  param("id").isInt(),
  body("beneficiary_id").optional().isInt().withMessage("beneficiary_id must be an integer"),
  body("aid_amount").optional().isFloat({ min: 0 }).withMessage("aid_amount must be a positive number"),
  body("aid_date").optional().isISO8601().withMessage("aid_date must be a valid date"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;
    const { id } = req.params;
    const { beneficiary_id, aid_amount, aid_date } = req.body;

    try {
      const report = await Report.findByPk(id);

      if (!report) {
        logger.warn("Report not found with ID: " + id);
        return res.status(404).send("Report not found.");
      }

      if (
        currentUser.type === "admin" ||
        (currentUser.type === "ngo_admin" && currentUser.ngo_id === report.ngo_id)
      ) {
        if (beneficiary_id !== undefined) report.beneficiary_id = beneficiary_id;
        if (aid_amount !== undefined) report.aid_amount = aid_amount;
        if (aid_date !== undefined) report.aid_date = aid_date;

        await report.save();
        logger.info("Report updated successfully by user: " + currentUser.id);
        return res.status(200).json(report);
      } else {
        logger.warn("Unauthorized update attempt by user: " + currentUser.id);
        return res.status(401).send("Unauthorized. You do not have access to update this report.");
      }
    } catch (error) {
      logger.error(`Error updating report by ID: ${error.message}`);
      return res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report by ID
 *     tags: [Reports]
 *     description: Delete a report. Only admin and NGO admin (for their own NGO) can delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the report to delete
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       401:
 *         description: Unauthorized. User lacks the necessary privileges.
 *       404:
 *         description: Report not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteReportById = [
  param("id").isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;
    const { id } = req.params;

    try {
      const report = await Report.findByPk(id);

      if (!report) {
        logger.warn("Report not found with ID: " + id);
        return res.status(404).send("Report not found.");
      }

      if (
        currentUser.type === "admin" ||
        (currentUser.type === "ngo_admin" && currentUser.ngo_id === report.ngo_id)
      ) {
        await report.destroy();
        logger.info("Report deleted successfully by user: " + currentUser.id);
        return res.status(200).send("Report deleted successfully.");
      } else {
        logger.warn("Unauthorized delete attempt by user: " + currentUser.id);
        return res.status(401).send("Unauthorized. You do not have access to delete this report.");
      }
    } catch (error) {
      logger.error(`Error deleting report by ID: ${error.message}`);
      return res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  },
];
