const { Op } = require("sequelize");
const Event = require("../models/Event");

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         eventName:
 *           type: string
 *           description: Name of the event
 *         date:
 *           type: string
 *           format: date-time
 *           description: Date and time of the event
 *         location:
 *           type: string
 *           description: Location of the event
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
 *   name: Events
 *   description: Endpoints for Events
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     description: Retrieve a list of all events. Requires admin authorization.
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
 *         description: A paginated list of events.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
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
exports.getAllEvents = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can view events.");
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
        "eventName",
        "date",
        "location",
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
        const { rows: events, count } = await Event.findAndCountAll({
            where: {
                ...searchCondition,
            },
            order: orderCondition,
            limit,
            offset: (page - 1) * limit,
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            data: events,
            meta: {
                totalItems: count,
                totalPages,
                currentPage: page,
            },
        });
    } catch (error) {
        console.error(`Error fetching events: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get an event by ID
 *     tags: [Events]
 *     description: Retrieve an event by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to retrieve
 *     responses:
 *       200:
 *         description: An event object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Event not found.
 *       500:
 *         description: Internal server error.
 */
exports.getEventById = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can view events.");
    }

    const { id } = req.params;

    try {
        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).send("Event not found.");
        }

        res.status(200).json(event);
    } catch (error) {
        console.error(`Error fetching event by ID: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     description: Create a new event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Bad request. Invalid event data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createEvent = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can create new events.");
    }

    const eventData = req.body;

    try {
        const newEvent = await Event.create(eventData);

        res.status(201).json(newEvent);
    } catch (error) {
        console.error(`Error creating event: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     description: Update an event by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Bad request. Invalid event data.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Event not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateEvent = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can update events.");
    }

    const { id } = req.params;
    const eventData = req.body;

    try {
        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).send("Event not found.");
        }

        await event.update(eventData);

        res.status(200).json(event);
    } catch (error) {
        console.error(`Error updating event: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     description: Delete an event by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to delete
 *     responses:
 *       204:
 *         description: Event deleted successfully
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Event not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteEvent = async (req, res) => {
    const currentUser = req.user;

    if (currentUser.type !== "admin") {
        return res
            .status(401)
            .send("Unauthorized. Only admin users can delete events.");
    }

    const { id } = req.params;

    try {
        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).send("Event not found.");
        }

        await event.destroy();

        res.status(204).send();
    } catch (error) {
        console.error(`Error deleting event: ${error.message}`);
        res.status(500).json({
            error: "Internal server error",
            details: [error.message],
        });
    }
};
