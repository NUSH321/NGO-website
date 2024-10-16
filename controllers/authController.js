// authController.js

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

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

    res.status(200).send({
      message: "User registered successfully as admin.",
      username: username,
    });
  } catch (err) {
    res.status(500).send("Error on the server.");
  }
};

/**
 * @swagger
 * /auth/register/volunteer:
 *   post:
 *     summary: Register as a volunteer
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
 *         description: User registered successfully as a volunteer.
 *       403:
 *         description: Access denied. Only admin can create volunteers.
 *       500:
 *         description: Error on the server.
 */
exports.volunteerRegister = async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 8);

    // Check if the requester is admin
    if (req.user && req.user.type === "admin") {
      await User.create({
        username,
        password: hashedPassword,
        type: "volunteer",
      });

      res.status(200).send({
        message: "User registered successfully as volunteer.",
        username: username,
      });
    } else {
      res.status(403).send("Access denied. Only admin can create volunteers.");
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
 *               password:
 *                 type: string
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
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Error on the server.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user) return res.status(404).send("User not found.");

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid)
      return res.status(401).send({ auth: false, token: null });

    const token = jwt.sign({ id: user.id }, process.env.SECRET, {
      expiresIn: 86400, // 24 hours
    });

    res.status(200).send({ auth: true, token });
  } catch (err) {
    res.status(500).send("Error on the server.");
  }
};
