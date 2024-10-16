const { Op } = require("sequelize");
const Volunteer = require("../models/Volunteer");
const User = require("../models/User");

/**
 * @swagger
 * components:
 *   schemas:
 *     Volunteer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         task_id:
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
 *   name: Volunteers
 *   description: End point for Volunteers
 */

/**
 * @swagger
 * /api/volunteers:
 *   get:
 *     summary: Get all volunteers
 *     tags: [Volunteers]
 *     description: Retrieve a list of all volunteers. Accessible by admin, coordinator, and employees.
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
 *         description: A paginated list of volunteers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Volunteer'
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
 *         description: Unauthorized. User lacks the required privileges.
 *       500:
 *         description: Internal server error.
 */
exports.getAllVolunteers = async (req, res) => {
  const currentUser = req.user;

  // Authorization logic
  if (
    !["admin", "coordinator", "employee"].includes(currentUser.type) ||
    (currentUser.type === "coordinator" && !currentUser.isAssignedToVolunteerTask)
  ) {
    return res.status(401).send("Unauthorized. User lacks the required privileges.");
  }

  // Extract query parameters with sensible defaults
  let {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "asc",
    search = "",
  } = req.query;

  // Convert page and limit to numbers and validate them
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  page = isNaN(page) || page < 1 ? 1 : page;
  limit = isNaN(limit) || limit < 1 ? 10 : limit;

  // Construct sorting condition
  const validColumns = ["user_id", "task_id", "createdAt", "updatedAt"];
  sortBy = validColumns.includes(sortBy) ? sortBy : "createdAt";
  order = order.toLowerCase() === "desc" ? "desc" : "asc";
  const orderCondition = [[sortBy, order]];

  // Create search condition for relevant columns (only if search is not empty)
  let searchCondition = {};
  if (search) {
    searchCondition = {
      [Op.or]: validColumns.map((field) => ({
        [field]: { [Op.iLike]: `%${search}%` },
      })),
    };
  }

  // Define additional filter conditions based on user type
  let additionalFilterCondition = {};
  if (currentUser.type === "coordinator") {
    additionalFilterCondition = {
      task_id: currentUser.task_id,
    };
  }

  try {
    // Fetch volunteers with filters, sorting, and pagination
    const { rows: volunteers, count } = await Volunteer.findAndCountAll({
      where: {
        ...searchCondition,
        ...additionalFilterCondition,
      },
      include: [
        {
          model: User,
          attributes: { exclude: ["password"] },
        },
        {
          model: Task,
          attributes: ["id", "name"],
        },
      ],
      order: orderCondition,
      limit,
      offset: (page - 1) * limit,
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      data: volunteers,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error(`Error fetching volunteers: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteers/{id}:
 *   get:
 *     summary: Get a volunteer by ID
 *     tags: [Volunteers]
 *     description: Retrieve a volunteer by ID. Accessible by admin, coordinator, and employees.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer to retrieve
 *     responses:
 *       200:
 *         description: A volunteer object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Volunteer'
 *       401:
 *         description: Unauthorized. User lacks the required privileges.
 *       404:
 *         description: Volunteer not found.
 *       500:
 *         description: Internal server error.
 */
exports.getVolunteerById = async (req, res) => {
  const currentUser = req.user;

  // Authorization logic
  if (
    !["admin", "coordinator", "employee"].includes(currentUser.type) ||
    (currentUser.type === "coordinator" && !currentUser.isAssignedToVolunteerTask)
  ) {
    return res.status(401).send("Unauthorized. User lacks the required privileges.");
  }

  const { id } = req.params;

  try {
    const volunteer = await Volunteer.findByPk(id, {
      include: [
        {
          model: User,
          attributes: { exclude: ["password"] },
        },
        {
          model: Task,
          attributes: ["id", "name"],
        },
      ],
    });

    if (!volunteer) {
      return res.status(404).send("Volunteer not found.");
    }

    // Additional filtering based on user type
    if (
      (currentUser.type === "coordinator" && volunteer.task_id !== currentUser.task_id)
    ) {
      return res.status(401).send("Unauthorized. User lacks the required privileges.");
    }

    res.status(200).json(volunteer);
  } catch (error) {
    console.error(`Error fetching volunteer by ID: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteers:
 *   post:
 *     summary: Create a new volunteer
 *     tags: [Volunteers]
 *     description: Create a new volunteer. Accessible by admin, coordinator, and employees.
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
 *               task_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Volunteer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Volunteer'
 *       400:
 *         description: Bad request. Invalid data.
 *       401:
 *         description: Unauthorized. User lacks the required privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createVolunteer = async (req, res) => {
  const currentUser = req.user;

  // Authorization logic
  if (
    !["admin", "coordinator", "employee"].includes(currentUser.type) ||
    (currentUser.type === "coordinator" && !currentUser.isAssignedToVolunteerTask)
  ) {
    return res.status(401).send("Unauthorized. User lacks the required privileges.");
  }

  const { user_id, task_id } = req.body;

  // Validate request body
  if (!user_id || !task_id) {
    return res.status(400).send("Bad request. User ID and Task ID are required.");
  }

  try {
    // Fetch the user and task to validate existence and permissions
    const user = await User.findByPk(user_id);
    const task = await Task.findByPk(task_id);

    if (!user || !task) {
      return res.status(400).send("Bad request. Invalid User ID or Task ID.");
    }

    // Additional permission checks based on user type
    if (
      (currentUser.type === "coordinator" && task.id !== currentUser.task_id)
    ) {
      return res.status(401).send("Unauthorized. User lacks the required privileges.");
    }

    // Create the volunteer record
    const newVolunteer = await Volunteer.create({
      user_id,
      task_id,
    });

    res.status(201).json(newVolunteer);
  } catch (error) {
    console.error(`Error creating volunteer: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteers/{id}:
 *   delete:
 *     summary: Delete a volunteer by ID
 *     tags: [Volunteers]
 *     description: Delete a volunteer by ID. Accessible by admin, coordinator, and employees.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer to delete
 *     responses:
 *       204:
 *         description: Volunteer deleted successfully
 *       401:
 *         description: Unauthorized. User lacks the required privileges.
 *       404:
 *         description: Volunteer not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteVolunteerById = async (req, res) => {
  const currentUser = req.user;

  // Authorization logic
  if (
    !["admin", "coordinator", "employee"].includes(currentUser.type) ||
    (currentUser.type === "coordinator" && !currentUser.isAssignedToVolunteerTask)
  ) {
    return res.status(401).send("Unauthorized. User lacks the required privileges.");
  }

  const { id } = req.params;

  try {
    const volunteer = await Volunteer.findByPk(id);

    if (!volunteer) {
      return res.status(404).send("Volunteer not found.");
    }

    // Additional permission checks based on user type
    if (
      (currentUser.type === "coordinator" && volunteer.task_id !== currentUser.task_id)
    ) {
      return res.status(401).send("Unauthorized. User lacks the required privileges.");
    }

    await volunteer.destroy();

    res.status(204).end();
  } catch (error) {
    console.error(`Error deleting volunteer by ID: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteers/{id}:
 *   put:
 *     summary: Update a volunteer by ID
 *     tags: [Volunteers]
 *     description: Update a volunteer by ID. Accessible by admin, coordinator, and employees.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               task_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Volunteer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Volunteer'
 *       400:
 *         description: Bad request. Invalid data.
 *       401:
 *         description: Unauthorized. User lacks the required privileges.
 *       404:
 *         description: Volunteer not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateVolunteerById = async (req, res) => {
  const currentUser = req.user;

  // Authorization logic
  if (
    !["admin", "coordinator", "employee"].includes(currentUser.type) ||
    (currentUser.type === "coordinator" && !currentUser.isAssignedToVolunteerTask)
  ) {
    return res.status(401).send("Unauthorized. User lacks the required privileges.");
  }

  const { id } = req.params;
  const { user_id, task_id } = req.body;

  // Validate request body
  if (!user_id || !task_id) {
    return res.status(400).send("Bad request. User ID and Task ID are required.");
  }

  try {
    let volunteer = await Volunteer.findByPk(id);

    if (!volunteer) {
      return res.status(404).send("Volunteer not found.");
    }

    // Additional permission checks based on user type
    if (
      (currentUser.type === "coordinator" && volunteer.task_id !== currentUser.task_id)
    ) {
      return res.status(401).send("Unauthorized. User lacks the required privileges.");
    }

    // Update volunteer record
    volunteer.user_id = user_id;
    volunteer.task_id = task_id;
    await volunteer.save();

    // Fetch updated volunteer with associated user and task
    volunteer = await Volunteer.findByPk(id, {
      include: [
        {
          model: User,
          attributes: { exclude: ["password"] },
        },
        {
          model: Task,
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(200).json(volunteer);
  } catch (error) {
    console.error(`Error updating volunteer by ID: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};
