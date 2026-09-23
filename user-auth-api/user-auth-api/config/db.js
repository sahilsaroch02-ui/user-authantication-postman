const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "authuser",
  password: process.env.DB_PASSWORD || "authpass",
  database: process.env.DB_NAME || "user_auth_db",
  port: process.env.DB_PORT || 3308,
});

module.exports = db;
