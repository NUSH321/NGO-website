const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         type:
 *           type: string
 *           enum:
 *             - admin
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
 *       required:
 *         - username
 *         - password
 *         - type
 */

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: API for managing NGO admins
 */

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: Retrieve a list of admins
 *     tags: [Admins]
 *     description: Retrieve a paginated list of all admins with optional sorting and searching.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: id
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: A list of admins.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.getAllAdmins = async (req, res) => {
  const { page = 1, limit = 10, sort = 'id', order = 'asc' } = req.query;

  try {
    const admins = await User.findAll({
      where: { type: 'admin' },
      order: [[sort, order]],
      limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json(admins);
  } catch (error) {
    logger.error(`Error retrieving admins: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error',
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/admins/{id}:
 *   get:
 *     summary: Retrieve an admin by ID
 *     tags: [Admins]
 *     description: Retrieve an admin by their ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin to retrieve
 *     responses:
 *       200:
 *         description: The requested admin object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
exports.getAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await User.findByPk(id);

    if (!admin) {
      logger.warn('Admin not found with ID: ' + id);
      return res.status(404).send('Admin not found.');
    }

    res.status(200).json(admin);
  } catch (error) {
    logger.error(`Error retrieving admin by ID: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error',
      details: [error.message],
    });
  }
};

/**
 * @swagger
 * /api/admins:
 *   post:
 *     summary: Create a new admin
 *     tags: [Admins]
 *     description: Create a new admin.
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
 *             required:
 *               - username
 *               - password
 *               - type
 *     responses:
 *       201:
 *         description: The created admin object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       500:
 *         description: Internal server error.
 */
exports.createAdmin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('type').equals('admin').withMessage('Invalid admin type'),
  body('email').isEmail().withMessage('Invalid email'),
  body('phone').optional().isString(),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('state').optional().isString(),
  body('pincode').optional().isString(),
  body('country').optional().isString(),
  body('dateOfBirth').optional().isDate(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('profilePicture').optional().isString(),
  body('emergencyContactName').optional().isString(),
  body('emergencyContactPhone').optional().isString(),
  body('emergencyContactRelation').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== 'admin') {
      logger.warn('Unauthorized access attempt by user: ' + currentUser.id);
      return res.status(401).send('Unauthorized. Only admin users can create other admins.');
    }

    try {
      const newAdmin = await User.create(req.body);
      logger.info('Admin created successfully by admin: ' + currentUser.id);
      res.status(201).json(newAdmin);
    } catch (error) {
      logger.error(`Error creating admin: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/admins/{id}:
 *   put:
 *     summary: Update an admin by ID
 *     tags: [Admins]
 *     description: Update an admin by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin to update
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
 *             required:
 *               - username
 *               - email
 *     responses:
 *       200:
 *         description: The updated admin object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
exports.updateAdmin = [
  param('id').isInt().withMessage('ID must be an integer'),
  body('username').optional().notEmpty(),
  body('password').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('state').optional().isString(),
  body('pincode').optional().isString(),
  body('country').optional().isString(),
  body('dateOfBirth').optional().isDate(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('profilePicture').optional().isString(),
  body('emergencyContactName').optional().isString(),
  body('emergencyContactPhone').optional().isString(),
  body('emergencyContactRelation').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUser = req.user;

    if (currentUser.type !== 'admin') {
      logger.warn('Unauthorized access attempt by user: ' + currentUser.id);
      return res.status(401).send('Unauthorized. Only admin users can update admin details.');
    }

    const { id } = req.params;

    try {
      const admin = await User.findByPk(id);

      if (!admin) {
        logger.warn('Admin not found with ID: ' + id);
        return res.status(404).send('Admin not found.');
      }

      const updatedAdmin = await admin.update(req.body);

      logger.info('Admin updated successfully by admin: ' + currentUser.id);

      res.status(200).json(updatedAdmin);
    } catch (error) {
      logger.error(`Error updating admin: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        details: [error.message],
      });
    }
  },
];

/**
 * @swagger
 * /api/admins/{id}:
 *   delete:
 *     summary: Delete an admin by ID
 *     tags: [Admins]
 *     description: Delete an admin by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the admin to delete
 *     responses:
 *       204:
 *         description: Admin successfully deleted.
 *       401:
 *         description: Unauthorized. User lacks admin privileges.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */
exports.deleteAdmin = async (req, res) => {
  const { id } = req.params;

  const currentUser = req.user;

  if (currentUser.type !== 'admin') {
    logger.warn('Unauthorized access attempt by user: ' + currentUser.id);
    return res.status(401).send('Unauthorized. Only admin users can delete admin accounts.');
  }

  try {
    const admin = await User.findByPk(id);

    if (!admin) {
      logger.warn('Admin not found with ID: ' + id);
      return res.status(404).send('Admin not found.');
    }

    await admin.destroy();

    logger.info('Admin deleted successfully by admin: ' + currentUser.id);

    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting admin: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error',
      details: [error.message],
    });
  }
};
