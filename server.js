const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Swagger configuration
const { swaggerUi, swaggerDocs } = require('./config/swagger');

// Initialize the app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Sequelize Initialization
const sequelize = require('./config/db');

sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
  })
  .catch(err => {
    console.error('Error synchronizing the database:', err);
  });

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Route files
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const donorRoutes = require('./routes/donorRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const eventRoutes = require('./routes/eventRoutes');
const projectRoutes = require('./routes/projectRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const volunteerAttendanceRoutes = require('./routes/volunteerAttendanceRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');

// Use routes
app.use('/api/admins', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/volunteer-attendance', volunteerAttendanceRoutes);
app.use('/api/volunteers', volunteerRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
