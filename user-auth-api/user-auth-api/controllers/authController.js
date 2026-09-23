const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const sendOtpEmail = async (email, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (
    !emailUser ||
    !emailPass ||
    emailUser === "yourgmail@gmail.com" ||
    emailPass === "your_16_digit_app_password"
  ) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"User Auth API" <${emailUser}>`,
    to: email,
    subject: "Password reset OTP",
    text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
  });

  return true;
};

const signup = async (req, res) => {
  const { name, password } = req.body;
  const email = req.body.email && req.body.email.trim().toLowerCase();
  const role = req.body.role || "user";

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  if (!["user", "buyer", "seller", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Role must be user, buyer, seller, or admin",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql =
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, hashedPassword, role], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "Email already registered",
        });
      }

      return res.status(500).json({
        message: err.message,
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  });
};

const signin = (req, res) => {
  const { password } = req.body;
  const email = req.body.email && req.body.email.trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
};
const getProfile = (req, res) => {
  const sql = "SELECT id, name, email, role FROM users WHERE id = ?";

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user: results[0],
    });
  });
};

const updateProfile = (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!name && !email) {
    return res.status(400).json({
      message: "At least one field (name or email) is required",
    });
  }

  const getUserSql = "SELECT id, name, email FROM users WHERE id = ?";

  db.query(getUserSql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const currentUser = results[0];
    const nextEmail = email || currentUser.email;

    if (email && email !== currentUser.email) {
      const checkEmailSql = "SELECT id FROM users WHERE email = ? AND id != ?";

      return db.query(
        checkEmailSql,
        [nextEmail, req.user.id],
        (checkErr, rows) => {
          if (checkErr) {
            return res.status(500).json({
              message: checkErr.message,
            });
          }

          if (rows.length > 0) {
            return res.status(409).json({
              message: "Email is already registered",
            });
          }

          const updateFields = [];
          const values = [];

          if (name) {
            updateFields.push("name = ?");
            values.push(name);
          }

          if (email) {
            updateFields.push("email = ?");
            values.push(email);
          }

          values.push(req.user.id);

          const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;

          return db.query(sql, values, (updateErr) => {
            if (updateErr) {
              if (updateErr.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                  message: "Email is already registered",
                });
              }

              return res.status(500).json({
                message: updateErr.message,
              });
            }

            return res.json({
              message: "Profile updated successfully",
              user: {
                id: req.user.id,
                name: name || currentUser.name,
                email: nextEmail,
                role: req.user.role,
              },
            });
          });
        },
      );
    }

    const updateFields = [];
    const values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
    }

    if (email) {
      updateFields.push("email = ?");
      values.push(email);
    }

    values.push(req.user.id);

    const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;

    db.query(sql, values, (updateErr) => {
      if (updateErr) {
        if (updateErr.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            message: "Email is already registered",
          });
        }

        return res.status(500).json({
          message: updateErr.message,
        });
      }

      return res.json({
        message: "Profile updated successfully",
        user: {
          id: req.user.id,
          name: name || currentUser.name,
          email: nextEmail,
          role: req.user.role,
        },
      });
    });
  });
};

const changePassword = (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      message: "Old password and new password are required",
    });
  }

  const sql = "SELECT password FROM users WHERE id = ?";

  db.query(sql, [req.user.id], async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Old password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateSql = "UPDATE users SET password = ? WHERE id = ?";

    db.query(updateSql, [hashedPassword, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({
        message: "Password changed successfully",
      });
    });
  });
};

const deleteAccount = (req, res) => {
  const sql = "DELETE FROM users WHERE id = ?";

  db.query(sql, [req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Account deleted successfully",
    });
  });
};

const forgotPassword = (req, res) => {
  const email = req.body.email && req.body.email.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  const sql = `
    UPDATE users
    SET reset_otp = ?, reset_otp_expiry = ?
    WHERE email = ?
  `;

  db.query(sql, [otp, expiry, email], async (err, result) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const emailSent = await sendOtpEmail(email, otp);

    if (emailSent) {
      return res.json({
        message: "OTP sent successfully",
        otp,
      });
    }

    res.json({
      message:
        "OTP generated successfully. Email is not configured in this environment.",
      otp,
    });
  });
};

const resetPassword = (req, res) => {
  const { otp, newPassword } = req.body;
  const email = req.body.email && req.body.email.trim().toLowerCase();

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      message: "Email, OTP and new password are required",
    });
  }

  const sql = `
    SELECT id
    FROM users
    WHERE email = ?
    AND reset_otp = ?
    AND reset_otp_expiry > NOW()
  `;

  db.query(sql, [email, otp], async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    const userId = results[0].id;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateSql = `
      UPDATE users
      SET password = ?,
          reset_otp = NULL,
          reset_otp_expiry = NULL
      WHERE id = ?
    `;

    db.query(updateSql, [hashedPassword, userId], (err) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({
        message: "Password reset successfully",
      });
    });
  });
};
// GET USER BY ID
const getUserById = (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Valid user ID is required",
    });
  }

  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({
      message: "Access denied. You can only view your own profile",
    });
  }

  const sql = "SELECT id, name, email, role FROM users WHERE id = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user: results[0],
    });
  });
};
// GET ALL USERS
const getAllUsers = (req, res) => {
  const sql = "SELECT id, name, email, role FROM users";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      users: results,
    });
  });
};
// GET ALL SELLERS AND BUYERS (Admin only)
const getSellersAndBuyers = (req, res) => {
  const sql = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE role IN ('seller', 'buyer')
    ORDER BY role, id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      users: results,
    });
  });
};
module.exports = {
  signup,
  signin,
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  getSellersAndBuyers,
};
