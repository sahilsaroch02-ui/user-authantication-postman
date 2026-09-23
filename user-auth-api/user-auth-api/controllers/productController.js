const db = require("../config/db");

// CREATE PRODUCT (Seller only)
const createProduct = (req, res) => {
  const { name, description, price, quantity } = req.body;

  if (!name || price === undefined || quantity === undefined) {
    return res.status(400).json({
      message: "Name, price and quantity are required",
    });
  }

  const sql = `
    INSERT INTO products
    (seller_id, name, description, price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [req.user.id, name, description || null, price, quantity],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.status(201).json({
        message: "Product created successfully",
        productId: result.insertId,
      });
    },
  );
};
// GET ALL PRODUCTS
const getAllProducts = (req, res) => {
  const sql = `
    SELECT
      products.id,
      products.name,
      products.description,
      products.price,
      products.quantity,
      users.id AS seller_id,
      users.name AS seller_name,
      users.email AS seller_email
    FROM products
    JOIN users ON products.seller_id = users.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      products: results,
    });
  });
};
module.exports = {
  createProduct,
  getAllProducts,
};
