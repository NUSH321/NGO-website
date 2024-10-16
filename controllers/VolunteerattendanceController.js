const { Op } = require("sequelize");
const VolunteerAttendance = require("../models/VolunteerAttendance");
const User = require("../models/User");
const Batch = require("../models/Beneficiary");

/**
 * @swagger
 * components:
 *   schemas:
 *     VolunteerAttendance:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         batch_id:
 *           type: integer
 *         volunteer_id:
 *           type: integer
 *         status:
 *           type: boolean
 *         date:
 *           type: string
 *           format: date-time
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
 *   name: VolunteerAttendance
 *   description: End point for Volunteer Attendance records
 */

/**
 * @swagger
 * /api/volunteerAttendance:
 *   get:
 *     summary: Get all volunteer attendance records
 *     tags: [VolunteerAttendance]
 *     description: Retrieve a list of all volunteer attendance records. Admins can view all records, school admins can view records from their school, and employees can view records from their batch.
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
 *         description: A paginated list of volunteer attendance records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VolunteerAttendance'
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
 *         description: Unauthorized. User lacks necessary privileges.
 *       500:
 *         description: Internal server error.
 */
exports.getAllVolunteerAttendance = async (req, res) => {
  const currentUser = req.user;

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
  const validColumns = ["batch_id", "volunteer_id", "status", "date", "createdAt", "updatedAt"];
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

  try {
    // Define conditions based on user type
    let userCondition = {};
    if (currentUser.type === "school_admin") {
      // Assuming User has a school_id field
      userCondition = {
        '$Batch.school_id$': currentUser.school_id,
      };
    } else if (currentUser.type === "employee") {
      // Assuming User has a batch_id field
      userCondition = {
        batch_id: currentUser.batch_id,
      };
    }

    // Fetch volunteer attendance records with filters, sorting, and pagination
    const { rows: volunteerAttendance, count } = await VolunteerAttendance.findAndCountAll({
      where: {
        ...searchCondition,
        ...userCondition,
      },
      include: [
        {
          model: Batch,
          as: 'Batch',
          required: false
        },
        {
          model: User,
          as: 'User',
          required: false
        }
      ],
      order: orderCondition,
      limit,
      offset: (page - 1) * limit,
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      data: volunteerAttendance,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error(`Error fetching volunteer attendance records: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteerAttendance/{id}:
 *   get:
 *     summary: Get a volunteer attendance record by ID
 *     tags: [VolunteerAttendance]
 *     description: Retrieve a volunteer attendance record by its ID. Admins can view any record, school admins can view records from their school, and employees can view records from their batch.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer attendance record to retrieve
 *     responses:
 *       200:
 *         description: A volunteer attendance record object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolunteerAttendance'
 *       401:
 *         description: Unauthorized. User lacks necessary privileges.
 *       404:
 *         description: Volunteer attendance record not found.
 *       500:
 *         description: Internal server error.
 */
exports.getVolunteerAttendanceById = async (req, res) => {
    const currentUser = req.user;
    const { id } = req.params;
  
    try {
      // Fetch the volunteer attendance record
      const volunteerAttendance = await VolunteerAttendance.findByPk(id, {
        include: [
          {
            model: Batch,
            as: 'Batch',
            required: true
          },
          {
            model: User,
            as: 'User',
            required: true
          }
        ]
      });
  
      if (!volunteerAttendance) {
        return res.status(404).send("Volunteer attendance record not found.");
      }
  
      // Check user permissions
      if (currentUser.type === "school_admin") {
        // Assuming User has a school_id field and Batch has a school_id field
        if (volunteerAttendance.Batch.school_id !== currentUser.school_id) {
          return res.status(401).send("Unauthorized. You can only view volunteer attendance for your school's batches.");
        }
      } else if (currentUser.type === "employee") {
        // Assuming User has a batch_id field
        if (volunteerAttendance.batch_id !== currentUser.batch_id) {
          return res.status(401).send("Unauthorized. You can only view volunteer attendance for your batch.");
        }
      } else if (currentUser.type !== "admin") {
        return res.status(401).send("Unauthorized. Only admins, school admins, and employees can view volunteer attendance.");
      }
  
      res.status(200).json(volunteerAttendance);
    } catch (error) {
      console.error(`Error fetching volunteer attendance record: ${error.message}`);
      res.status(500).json({
        error: "Internal server error",
        details: [error.message],
      });
    }
  };

/**
 * @swagger
 * /api/volunteerAttendance:
 *   post:
 *     summary: Create a new volunteer attendance record
 *     tags: [VolunteerAttendance]
 *     description: Create a new volunteer attendance record. Admins can create records for any batch, school admins can create records for batches in their school, and employees can create records for their batch.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batch_id:
 *                 type: integer
 *               volunteer_id:
 *                 type: integer
 *               status:
 *                 type: boolean
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Volunteer attendance record created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolunteerAttendance'
 *       401:
 *         description: Unauthorized. User lacks necessary privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createVolunteerAttendance = async (req, res) => {
  const currentUser = req.user;
  const { batch_id, volunteer_id, status, date } = req.body;

  try {
    // Check user permissions
    if (currentUser.type === "school_admin") {
      // Assuming User has a school_id field and Batch has a school_id field
      const batch = await Batch.findByPk(batch_id);
      if (!batch || batch.school_id !== currentUser.school_id) {
        return res.status(401).send("Unauthorized. You can only create volunteer attendance for your school's batches.");
      }
    } else if (currentUser.type === "employee") {
      // Assuming User has a batch_id field
      if (batch_id !== currentUser.batch_id) {
        return res.status(401).send("Unauthorized. You can only create volunteer attendance for your batch.");
      }
    } else if (currentUser.type !== "admin") {
      return res.status(401).send("Unauthorized. Only admins, school admins, and employees can create volunteer attendance.");
    }

    // Create the volunteer attendance record
    const volunteerAttendance = await VolunteerAttendance.create({
      batch_id,
      volunteer_id,
      status,
      date,
    });

    res.status(201).json(volunteerAttendance);
  } catch (error) {
    console.error(`Error creating volunteer attendance record: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteerAttendance/{id}:
 *   put:
 *     summary: Update a volunteer attendance record by ID
 *     tags: [VolunteerAttendance]
 *     description: Update a volunteer attendance record by its ID. Admins can update any record, school admins can update records from their school, and employees can update records from their batch.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer attendance record to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batch_id:
 *                 type: integer
 *               volunteer_id:
 *                 type: integer
 *               status:
 *                 type: boolean
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Volunteer attendance record updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolunteerAttendance'
 *       401:
 *         description: Unauthorized. User lacks necessary privileges.
 *       404:
 *         description: Volunteer attendance record not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateVolunteerAttendance = async (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { batch_id, volunteer_id, status, date } = req.body;

  try {
    // Fetch the volunteer attendance record
    const volunteerAttendance = await VolunteerAttendance.findByPk(id, {
      include: [
        {
          model: Batch,
          as: 'Batch',
          required: true
        },
        {
          model: User,
          as: 'User',
          required: true
        }
      ]
    });

    if (!volunteerAttendance) {
      return res.status(404).send("Volunteer attendance record not found.");
    }

    // Check user permissions
    if (currentUser.type === "school_admin") {
      // Assuming User has a school_id field and Batch has a school_id field
      if (volunteerAttendance.Batch.school_id !== currentUser.school_id) {
        return res.status(401).send("Unauthorized. You can only update volunteer attendance for your school's batches.");
      }
    } else if (currentUser.type === "employee") {
      // Assuming User has a batch_id field
      if (volunteerAttendance.batch_id !== currentUser.batch_id) {
        return res.status(401).send("Unauthorized. You can only update volunteer attendance for your batch.");
      }
    } else if (currentUser.type !== "admin") {
      return res.status(401).send("Unauthorized. Only admins, school admins, and employees can update volunteer attendance.");
    }

    // Update the volunteer attendance record
    volunteerAttendance.batch_id = batch_id;
    volunteerAttendance.volunteer_id = volunteer_id;
    volunteerAttendance.status = status;
    volunteerAttendance.date = date;

    await volunteerAttendance.save();

    res.status(200).json(volunteerAttendance);
  } catch (error) {
    console.error(`Error updating volunteer attendance record: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/volunteerAttendance/{id}:
 *   delete:
 *     summary: Delete a volunteer attendance record by ID
 *     tags: [VolunteerAttendance]
 *     description: Delete a volunteer attendance record by its ID. Admins can delete any record, school admins can delete records from their school, and employees can delete records from their batch.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the volunteer attendance record to delete
 *     responses:
 *       204:
 *         description: Volunteer attendance record deleted successfully.
 *       401:
 *         description: Unauthorized. User lacks necessary privileges.
 *       404:
 *         description: Volunteer attendance record not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteVolunteerAttendance = async (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;

  try {
    // Fetch the volunteer attendance record
    const volunteerAttendance = await VolunteerAttendance.findByPk(id, {
      include: [
        {
          model: Batch,
          as: 'Batch',
          required: true
        },
        {
          model: User,
          as: 'User',
          required: true
        }
      ]
    });

    if (!volunteerAttendance) {
      return res.status(404).send("Volunteer attendance record not found.");
    }

    // Check user permissions
    if (currentUser.type === "school_admin") {
      // Assuming User has a school_id field and Batch has a school_id field
      if (volunteerAttendance.Batch.school_id !== currentUser.school_id) {
        return res.status(401).send("Unauthorized. You can only delete volunteer attendance for your school's batches.");
      }
    } else if (currentUser.type === "employee") {
      // Assuming User has a batch_id field
      if (volunteerAttendance.batch_id !== currentUser.batch_id) {
        return res.status(401).send("Unauthorized. You can only delete volunteer attendance for your batch.");
      }
    } else if (currentUser.type !== "admin") {
      return res.status(401).send("Unauthorized. Only admins, school admins, and employees can delete volunteer attendance.");
    }

    // Delete the volunteer attendance record
    await volunteerAttendance.destroy();

    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting volunteer attendance record: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: [error.message],
    });
  }
};
