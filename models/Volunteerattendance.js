const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Volunteer = require("./Volunteer");
const Event = require("./Event");

const VolunteerAttendance = sequelize.define(
  "VolunteerAttendance",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    volunteer_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Volunteer,
        key: "id",
      },
    },
    event_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Event,
        key: "id",
      },
    },
    status: {
      type: DataTypes.BOOLEAN,
    },
    date: {
      type: DataTypes.DATE,
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
    tableName: "VolunteerAttendance",
    timestamps: true,
  }
);

module.exports = VolunteerAttendance;
