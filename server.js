const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const { swaggerUi, swaggerDocs } = require("./config/swagger");
const sequelize = require("./config/db");
const app = express();
const User = require("./models/User"); // Adjust path to your User model as needed
app.use(bodyParser.json());
dotenv.config();


// Temporary check to log environment variables
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("PORT:", process.env.PORT);
console.log("SECRET:", process.env.SECRET);  // Avoid logging in production



// Middleware
app.use(bodyParser.json());

// Use CORS with custom headers
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});





// Route files
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const beneficiaryRoutes = require("./routes/beneficiaryRoutes");
const donorRoutes = require("./routes/donorRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const eventRoutes = require("./routes/eventRoutes");
const projectRoutes = require("./routes/projectRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const volunteerAttendanceRoutes = require("./routes/volunteerAttendanceRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");

// Use routes with specific paths
app.use("/api/admins", adminRoutes);
app.use("/auth", authRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/volunteer-attendance", volunteerAttendanceRoutes);
app.use("/api/volunteers", volunteerRoutes);

// Swagger API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Sync database models with Sequelize and start the server
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
    .then(() => {
        console.log("Database connection has been established successfully.");
    })
    .catch((error) => {
        console.error("Unable to connect to the database:", error);
    })
    .then(() => {
        // Sync database models and start server after connection verification
        return sequelize.sync();
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Error syncing the database models:", error);
    });

// Serve static assets if in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static("client/build"));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
}
