const express = require("express");

const {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/rolemiddleware");

const router = express.Router();

// CREATE ORDER (Buyer only)
router.post("/", authMiddleware, roleMiddleware(["buyer"]), createOrder);

// GET MY ORDERS (Buyer only)
router.get(
  "/my-orders",
  authMiddleware,
  roleMiddleware(["buyer"]),
  getMyOrders,
);

// GET SELLER ORDERS (Seller only)
router.get(
  "/seller-orders",
  authMiddleware,
  roleMiddleware(["seller"]),
  getSellerOrders,
);
// GET ALL ORDERS (Admin only)
router.get(
  "/all-orders",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAllOrders,
);
// UPDATE ORDER STATUS (Admin only)
router.patch(
  "/:orderId/status",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateOrderStatus,
);
module.exports = router;
