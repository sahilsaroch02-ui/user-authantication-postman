const db = require("../config/db");

// CREATE ORDER (Buyer only)
const createOrder = (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({
      message: "Product ID and valid quantity are required",
    });
  }

  const productSql = `
    SELECT id, seller_id, price, quantity
    FROM products
    WHERE id = ?
  `;

  db.query(productSql, [productId], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const product = results[0];

    if (product.quantity < quantity) {
      return res.status(400).json({
        message: "Insufficient product quantity",
      });
    }

    const totalAmount = product.price * quantity;

    const orderSql = `
      INSERT INTO orders (buyer_id, total_amount)
      VALUES (?, ?)
    `;

    db.query(orderSql, [req.user.id, totalAmount], (err, orderResult) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const orderId = orderResult.insertId;

      const itemSql = `
        INSERT INTO order_items
        (order_id, product_id, seller_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        itemSql,
        [orderId, product.id, product.seller_id, quantity, product.price],
        (err) => {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          const updateSql = `
            UPDATE products
            SET quantity = quantity - ?
            WHERE id = ?
          `;

          db.query(updateSql, [quantity, productId], (err) => {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            res.status(201).json({
              message: "Order created successfully",
              orderId,
              totalAmount,
            });
          });
        },
      );
    });
  });
};
// GET MY ORDERS (Buyer only)
const getMyOrders = (req, res) => {
  const sql = `
    SELECT
      o.id AS order_id,
      o.total_amount,
      'pending' AS status,
      o.created_at,
      oi.product_id,
      p.name AS product_name,
      oi.seller_id,
      u.name AS seller_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON oi.seller_id = u.id
    WHERE o.buyer_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      orders: results,
    });
  });
};
// GET SELLER ORDERS (Seller only)
const getSellerOrders = (req, res) => {
  const sql = `
    SELECT
      o.id AS order_id,
      o.total_amount,
      'pending' AS status,
      o.created_at,
      oi.product_id,
      p.name AS product_name,
      oi.quantity,
      oi.price,
      u.id AS buyer_id,
      u.name AS buyer_name,
      u.email AS buyer_email
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.buyer_id = u.id
    WHERE oi.seller_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      orders: results,
    });
  });
};
// GET ALL ORDERS (Admin only)
const getAllOrders = (req, res) => {
  const sql = `
    SELECT
      o.id AS order_id,
      o.total_amount,
      o.status,
      o.created_at,

      buyer.id AS buyer_id,
      buyer.name AS buyer_name,
      buyer.email AS buyer_email,

      oi.product_id,
      p.name AS product_name,

      oi.seller_id,
      seller.name AS seller_name,
      seller.email AS seller_email,

      oi.quantity,
      oi.price

    FROM orders o

    JOIN order_items oi
      ON o.id = oi.order_id

    JOIN products p
      ON oi.product_id = p.id

    JOIN users buyer
      ON o.buyer_id = buyer.id

    JOIN users seller
      ON oi.seller_id = seller.id

    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      orders: results,
    });
  });
};
// UPDATE ORDER STATUS (Admin only)
const updateOrderStatus = (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid order status",
    });
  }

  const sql = `
    UPDATE orders
    SET status = ?
    WHERE id = ?
  `;

  db.query(sql, [status, orderId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json({
      message: "Order status updated successfully",
    });
  });
};
module.exports = {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getAllOrders,
  updateOrderStatus,
};
