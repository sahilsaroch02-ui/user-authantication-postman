const express = require("express");

const {
  createProduct,
  getAllProducts,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/rolemiddleware");

const router = express.Router();

// CREATE PRODUCT (Seller only)
router.post("/", authMiddleware, roleMiddleware(["seller"]), createProduct);

// GET ALL PRODUCTS (Public)
router.get("/", getAllProducts);

module.exports = router;
