const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false, // Mandatory username
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false, // Mandatory password
    },
    role: { // Role adapted for NGO use
      type: DataTypes.ENUM(
        "admin",
        "donor",
        "volunteer",
        "beneficiary",
        "employee"
      ),
      defaultValue: "volunteer",
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
    },
    firstName: {
      type: DataTypes.STRING,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    pincode: {
      type: DataTypes.STRING,
    },
    country: {
      type: DataTypes.STRING,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
    },
    profilePicture: {
      type: DataTypes.STRING,
    },
    emergencyContactName: {
      type: DataTypes.STRING,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING,
    },
    emergencyContactRelation: {
      type: DataTypes.STRING,
    },
    occupation: {
      type: DataTypes.STRING, // Relevant for donors and volunteers
    },
    organization: {
      type: DataTypes.STRING, // Affiliation for NGO roles
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;
