const bcrypt = require('bcryptjs');

const newPassword = 'password123';  // Replace this with the password you want to hash
const hashedPassword = bcrypt.hashSync(newPassword, 8);

console.log("Hashed Password:", hashedPassword);
