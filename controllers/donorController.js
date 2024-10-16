const { Op } = require("sequelize");
const Donor = require("../models/Donor");

/**
 * @swagger
 * components:
 *   schemas:
 *     Donor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *           description: Name of the donor
 *         email:
 *           type: string
 *           description: Email of the donor
 *         phone:
 *           type: string
 *           description: Phone number of the donor
 *         address:
 *           type: string
 *           description: Address of the donor
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
 *   name: Donors
 *   description: Endpoints for managing donors
 */

/**
 * @swagger
 * /api/donors:
 *   get:
 *     summary: Get all donors
 *     tags: [Donors]
 *     description: Retrieve a list of all donors. Requires admin authorization.
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
 *         description: A paginated list of donors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donor'
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
exports.getAllDonors = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can view donors.");
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
        "name",
        "email",
        "phone",
        "address",
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
        const { rows: donors, count } = await Donor.findAndCountAll({
            where: {
                ...searchCondition,
            },
            order: orderCondition,
            limit,
            offset: (page - 1) * limit,
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            data: donors,
            meta: {
                totalItems: count,
                totalPages,
                currentPage: page,
            },
        });
    } catch (error) {
        console.error(`Error fetching donors: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/donors/{id}:
 *   get:
 *     summary: Get a donor by ID
 *     tags: [Donors]
 *     description: Retrieve a donor by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the donor to retrieve
 *     responses:
 *       200:
 *         description: A donor object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donor'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Donor not found.
 *       500:
 *         description: Internal server error.
 */
exports.getDonorById = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can view donors.");
    }

    const { id } = req.params;

    try {
        const donor = await Donor.findByPk(id);

        if (!donor) {
            return res.status(404).send("Donor not found.");
        }

        res.status(200).json(donor);
    } catch (error) {
        console.error(`Error fetching donor by ID: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/donors:
 *   post:
 *     summary: Create a new donor
 *     tags: [Donors]
 *     description: Create a new donor.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Donor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donor'
 *       400:
 *         description: Bad request. Invalid donor data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createDonor = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can create new donors.");
    }

    const donorData = req.body;

    try {
        const newDonor = await Donor.create(donorData);

        res.status(201).json(newDonor);
    } catch (error) {
        console.error(`Error creating donor: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/donors/{id}:
 *   put:
 *     summary: Update a donor
 *     tags: [Donors]
 *     description: Update a donor by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the donor to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Donor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Donor'
 *       400:
 *         description: Bad request. Invalid donor data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Donor not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateDonor = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can update donors.");
    }

    const { id } = req.params;
    const donorData = req.body;

    try {
        const donor = await Donor.findByPk(id);

        if (!donor) {
            return res.status(404).send("Donor not found.");
        }

        await donor.update(donorData);

        res.status(200).json(donor);
    } catch (error) {
        console.error(`Error updating donor: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/donors/{id}:
 *   delete:
 *     summary: Delete a donor
 *     tags: [Donors]
 *     description: Delete a donor by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the donor to delete
 *     responses:
 *       200:
 *         description: Donor deleted successfully
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Donor not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteDonor = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can delete donors.");
    }

    const { id } = req.params;

    try {
        const donor = await Donor.findByPk(id);

        if (!donor) {
            return res.status(404).send("Donor not found.");
        }

        await donor.destroy();

        res.status(200).send("Donor deleted successfully.");
    } catch (error) {
        console.error(`Error deleting donor: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};
