const express = require("express");

const {
  signup,
  signin,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  getUserById,
  getAllUsers,
  getSellersAndBuyers,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/rolemiddleware");

const router = express.Router();

// Signup
router.post("/signup", signup);

// Sign in
router.post("/signin", signin);

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.patch("/profile", authMiddleware, updateProfile);
router.post("/profile", authMiddleware, updateProfile);

// Update alias for clients using /api/auth/update
router.get("/update", authMiddleware, getProfile);
router.put("/update", authMiddleware, updateProfile);
router.patch("/update", authMiddleware, updateProfile);
router.post("/update", authMiddleware, updateProfile);

// Password
router.put("/change-password", authMiddleware, changePassword);

// Delete account
router.delete("/profile", authMiddleware, deleteAccount);

// Forgot/reset password
router.post("/forgot-password", forgotPassword);
router.post("/forget-password", forgotPassword);
router.post("/forgotpassword", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resetpassword", resetPassword);

// Users
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/:id", authMiddleware, getUserById);
router.get("/user/:id", authMiddleware, getUserById);
router.get(
  "/admin/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  getSellersAndBuyers,
);

module.exports = router;
