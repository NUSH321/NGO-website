const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register/admin:
 *   post:
 *     summary: Register as admin
 *     tags: [Auth]
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
 *     responses:
 *       200:
 *         description: User registered successfully as admin.
 *       500:
 *         description: Error on the server.
 */
exports.adminRegister = async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 8);

    await User.create({ username, password: hashedPassword, type: "admin" });

    const response = {
      message: "User registered successfully as admin.",
      username: username,
    };

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send("Error on the server.");
  }
};

/**
 * @swagger
 * /auth/register/schooladmin:
 *   post:
 *     summary: Register as school admin
 *     tags: [Auth]
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
 *     responses:
 *       200:
 *         description: User registered successfully as school admin.
 *       403:
 *         description: Access denied. Only admin can create school admins.
 *       500:
 *         description: Error on the server.
 */
exports.ngoAdminRegister = async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 8);

    if (req.user && req.user.type === "admin") {
      await User.create({
        username,
        password: hashedPassword,
        type: "ngo_admin",
      });

      const response = {
        message: "User registered successfully as ngo admin.",
        username: username,
      };

      res.status(200).send(response);
    } else {
      res
        .status(403)
        .send("Access denied. Only admin can create school admins.");
    }
  } catch (err) {
    res.status(500).send("Error on the server.");
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "testuser"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: boolean
 *                   example: false
 *                 token:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found."
 *       500:
 *         description: Error on the server.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: { username: username }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({
        auth: false,
        token: null
      });
    }

    const token = jwt.sign(
      { id: user.id, type: user.type },
      process.env.SECRET,
      { expiresIn: 86400 }
    );

    // Simplified response with just auth and token
    res.status(200).json({
      auth: true,
      token: token
    });
  } catch (err) {
    res.status(500).send("Error on the server.");
  }
  
};